import { getMeritType, type MeritType } from '../merits/catalog.js';
import type { CvSectionCode } from '../merits/cv-sections.js';
import type {
  Baremo,
  BaremoItemDef,
  BaremoItemScore,
  BaremoSectionScore,
  CommissionFactor,
  MeritRule,
  MeritScore,
  RuleResult,
  ScoreCap,
  ScorePortion,
  ScoreRange,
  ScoreSummary,
  ScoringContext,
  UnscoredMerit,
} from './types.js';

/** Lo que el motor necesita de un mérito (es un subconjunto de `MeritDto`). */
export interface ScorableMerit {
  id: string;
  type: MeritType;
  data: Record<string, unknown>;
  cvSection: CvSectionCode;
}

/** Redondeo a 4 decimales para no arrastrar errores de coma flotante. */
export function roundPoints(value: number): number {
  return Math.round(value * 1e4) / 1e4;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

interface Entry {
  score: MeritScore;
  portions: ScorePortion[];
  exclusiveKey: string | null;
  capKey: string | null;
}

/** Aplica un tope a unas porciones: primero por año natural y después en total. */
function applyCap(portions: readonly ScorePortion[], cap: ScoreCap): number {
  let total: number;
  if (cap.maxPerYear !== undefined) {
    const byYear = new Map<number | null, number>();
    for (const portion of portions) {
      byYear.set(portion.year, (byYear.get(portion.year) ?? 0) + portion.points);
    }
    total = sum(
      [...byYear].map(([year, points]) =>
        year === null ? points : Math.min(points, cap.maxPerYear!),
      ),
    );
  } else {
    total = sum(portions.map((portion) => portion.points));
  }
  return cap.max === undefined ? total : Math.min(total, cap.max);
}

/**
 * Puntos de un subapartado con esos méritos: en cada grupo excluyente cuenta solo el de más puntos
 * y después se aplican los topes (los de una `capKey` antes que los de todo el subapartado).
 * Devuelve también qué mérito desplaza a cada uno de los descartados.
 */
function itemTotal(
  item: BaremoItemDef,
  entries: readonly Entry[],
): { points: number; uncapped: number; superseded: Map<string, string> } {
  const winners = new Map<string, Entry>();
  const superseded = new Map<string, string>();
  const counted: Entry[] = [];
  for (const entry of entries) {
    if (entry.exclusiveKey === null) {
      counted.push(entry);
      continue;
    }
    const current = winners.get(entry.exclusiveKey);
    if (!current || entry.score.points > current.score.points) {
      winners.set(entry.exclusiveKey, entry);
    }
  }
  counted.push(...winners.values());
  for (const entry of entries) {
    const winner = entry.exclusiveKey === null ? undefined : winners.get(entry.exclusiveKey);
    if (winner && winner !== entry) superseded.set(entry.score.meritId, winner.score.meritId);
  }

  const caps = item.caps ?? [];
  const keyed = caps.filter((cap) => cap.key !== undefined);
  const general = caps.filter((cap) => cap.key === undefined);
  const uncapped = sum(counted.flatMap((entry) => entry.portions.map((p) => p.points)));

  let portions: ScorePortion[] = [];
  for (const cap of keyed) {
    const group = counted.filter((entry) => entry.capKey === cap.key);
    portions.push({
      year: null,
      points: applyCap(
        group.flatMap((e) => e.portions),
        cap,
      ),
    });
  }
  const keys = new Set(keyed.map((cap) => cap.key));
  portions.push(
    ...counted
      .filter((entry) => entry.capKey === null || !keys.has(entry.capKey))
      .flatMap((entry) => entry.portions),
  );
  for (const cap of general) portions = [{ year: null, points: applyCap(portions, cap) }];

  return { points: sum(portions.map((p) => p.points)), uncapped, superseded };
}

function range(min: number, max: number): ScoreRange {
  return { min: roundPoints(min), max: roundPoints(max) };
}

/**
 * Clasifica los méritos por los apartados del baremo y calcula, por subapartado, apartado y en
 * total (ponderado), el intervalo [mínimo garantizado, máximo posible]:
 *
 * - Suman al mínimo solo los méritos "directos": los de subapartados que el baremo valora sin
 *   tener en cuenta la relación con la plaza y cuya regla no depende de otro criterio de la
 *   comisión (tramos, índices, nº de autores…).
 * - Al máximo suman todos, con la puntuación completa (relación directa con la plaza).
 * - En ambos casos se respetan los topes del baremo.
 */
export function scoreMerits(
  baremo: Baremo,
  merits: readonly ScorableMerit[],
  context: ScoringContext,
): ScoreSummary {
  const itemBySection = new Map<CvSectionCode, BaremoItemDef>();
  for (const section of baremo.sections) {
    for (const item of section.items) {
      for (const code of item.cvSections) itemBySection.set(code, item);
    }
  }

  const entriesByItem = new Map<string, Entry[]>();
  const unscored: UnscoredMerit[] = [];

  for (const merit of merits) {
    const item = itemBySection.get(merit.cvSection);
    const rule = baremo.rules[merit.type] as MeritRule<MeritType> | undefined;
    if (!item || !rule) {
      unscored.push({
        meritId: merit.id,
        type: merit.type,
        reason: `El baremo de ${baremo.positionKind} no valora este apartado.`,
      });
      continue;
    }
    const parsed = getMeritType(merit.type).schema.safeParse(merit.data);
    if (!parsed.success) {
      unscored.push({
        meritId: merit.id,
        type: merit.type,
        reason: 'Faltan datos o no son válidos: revisa el mérito.',
      });
      continue;
    }
    const result: RuleResult = rule(parsed.data as never, context);
    const factors: CommissionFactor[] = [
      ...new Set<CommissionFactor>([
        ...(item.profileIndependent ? [] : (['relation'] as const)),
        ...(result.factors ?? []),
      ]),
    ];
    const portions = result.portions.filter((portion) => portion.points > 0);
    const entry: Entry = {
      score: {
        meritId: merit.id,
        type: merit.type,
        itemId: item.id,
        points: roundPoints(sum(portions.map((portion) => portion.points))),
        direct: factors.length === 0,
        factors,
        basis: result.basis,
        notes: result.notes ?? [],
        supersededBy: null,
      },
      portions,
      exclusiveKey: item.single ? `single:${item.id}` : (result.exclusiveKey ?? null),
      capKey: result.capKey ?? null,
    };
    entriesByItem.set(item.id, [...(entriesByItem.get(item.id) ?? []), entry]);
  }

  const byMerit = new Map<string, MeritScore>();
  const sections: BaremoSectionScore[] = baremo.sections.map((section) => {
    const items: BaremoItemScore[] = section.items.map((item) => {
      const entries = entriesByItem.get(item.id) ?? [];
      const max = itemTotal(item, entries);
      const min = itemTotal(
        item,
        entries.filter((entry) => entry.score.direct),
      );
      const merits = entries.map((entry) => ({
        ...entry.score,
        supersededBy: max.superseded.get(entry.score.meritId) ?? null,
      }));
      for (const score of merits) byMerit.set(score.meritId, score);
      return {
        item,
        score: range(min.points, max.points),
        capped: max.points < max.uncapped - 1e-9 || min.points < min.uncapped - 1e-9,
        merits,
      };
    });
    const raw = range(sum(items.map((i) => i.score.min)), sum(items.map((i) => i.score.max)));
    return {
      section,
      raw,
      weighted: range(raw.min * section.weight, raw.max * section.weight),
      items,
    };
  });

  return {
    baremo,
    sections,
    total: range(
      sum(sections.map((section) => section.weighted.min)),
      sum(sections.map((section) => section.weighted.max)),
    ),
    byMerit,
    unscored,
  };
}
