import { describe, expect, it } from 'vitest';
import { MERIT_TYPES, type MeritData, type MeritType } from '../merits/catalog.js';
import { MERIT_EXAMPLES } from '../merits/examples.js';
import { getMeritType } from '../merits/catalog.js';
import { type ScorableMerit, scoreMerits } from './engine.js';
import {
  bandFromText,
  countPeople,
  monthsUntil,
  namesApplicant,
  naturalYears,
  transcriptPoints,
} from './helpers.js';
import { getBaremo, PCI_BAREMO, UEX_2021_WEIGHTS } from './uex-2021.js';

const context = { referenceDate: '2026-09-30', applicantName: 'Laura Gómez Ruiz' };

let nextId = 0;

function merit<T extends MeritType>(type: T, data: Partial<MeritData<T>> = {}): ScorableMerit {
  const full = { ...MERIT_EXAMPLES[type], ...data } as Record<string, unknown>;
  const def = getMeritType(type);
  const parsed = def.schema.parse(full);
  return { id: `m${++nextId}`, type, data: full, cvSection: def.cvSection(parsed) };
}

function score(...merits: ScorableMerit[]) {
  return scoreMerits(PCI_BAREMO, merits, context);
}

function item(summary: ReturnType<typeof score>, id: string) {
  const found = summary.sections.flatMap((s) => s.items).find((i) => i.item.id === id);
  if (!found) throw new Error(`No existe el subapartado ${id}`);
  return found;
}

describe('baremo PCI', () => {
  it('pondera los apartados 2, 4 y 5 con 0,15, 0,60 y 0,25', () => {
    expect(PCI_BAREMO.sections.map((s) => [s.id, s.weight])).toEqual([
      ['2', 0.15],
      ['4', 0.6],
      ['5', 0.25],
    ]);
    expect(getBaremo()).toBe(PCI_BAREMO);
    expect(UEX_2021_WEIGHTS.pci.accreditationBonus).toBe(false);
  });

  it('las ponderaciones de cada tipo de plaza suman 1', () => {
    for (const { weights } of Object.values(UEX_2021_WEIGHTS)) {
      const total = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1);
    }
  });

  it('cada apartado hoja del CV de los apartados 2, 4 y 5 cae en un subapartado del baremo', () => {
    const covered = PCI_BAREMO.sections.flatMap((s) => s.items.flatMap((i) => i.cvSections));
    expect(new Set(covered).size).toBe(covered.length);
    for (const type of MERIT_TYPES) {
      for (const section of getMeritType(type).sections) expect(covered).toContain(section);
    }
  });

  it.each(MERIT_TYPES)('%s: su ejemplo se puntúa y el mínimo no supera al máximo', (type) => {
    const summary = score(merit(type));
    expect(summary.unscored).toEqual([]);
    const result = summary.byMerit.values().next().value!;
    expect(result.basis).not.toBe('');
    expect(summary.total.min).toBeLessThanOrEqual(summary.total.max);
  });
});

describe('mínimo garantizado y máximo posible', () => {
  it('un idioma suma directamente: B2 = 2 niveles × 0,4', () => {
    const summary = score(merit('language', { level: 'B2' }));
    const languages = item(summary, '2.f');
    expect(languages.score).toEqual({ min: 0.8, max: 0.8 });
    expect(languages.merits[0]!.direct).toBe(true);
    expect(summary.total).toEqual({ min: 0.12, max: 0.12 });
  });

  it('de varios certificados del mismo idioma solo cuenta el de más nivel', () => {
    const b2 = merit('language', { language: 'Inglés', level: 'B2' });
    const c1 = merit('language', { language: 'inglés ', level: 'C1' });
    const french = merit('language', { language: 'Francés', level: 'B1' });
    const summary = score(b2, c1, french);
    expect(item(summary, '2.f').score).toEqual({ min: 1.6, max: 1.6 });
    expect(summary.byMerit.get(b2.id)!.supersededBy).toBe(c1.id);
    expect(summary.byMerit.get(c1.id)!.supersededBy).toBeNull();
  });

  it('por debajo del B1 no puntúa', () => {
    const summary = score(merit('language', { level: 'A2' }));
    expect(item(summary, '2.f').score).toEqual({ min: 0, max: 0 });
    expect(summary.byMerit.values().next().value!.notes).toContain('Solo puntúa a partir del B1.');
  });

  it('un artículo depende de la comisión: aporta 0 al mínimo y su cuartil al máximo', () => {
    const summary = score(merit('article', { indexed: true, quartile: 'Q1', index: 'JCR' }));
    const articles = item(summary, '4.c.3');
    expect(articles.score).toEqual({ min: 0, max: 2.4 });
    expect(articles.merits[0]!.factors).toEqual(['relation', 'journal_index', 'authors']);
    expect(summary.total).toEqual({ min: 0, max: 1.44 });
  });

  it('un artículo sin índice vale 0,3', () => {
    const summary = score(
      merit('article', { indexed: false, index: null, quartile: null, category: null }),
    );
    expect(item(summary, '4.c.3').score.max).toBe(0.3);
  });

  it('mezcla directos y de la comisión en el total ponderado', () => {
    const summary = score(
      merit('language', { level: 'C1' }),
      merit('article', { indexed: true, quartile: 'Q2', index: 'JCR' }),
      merit('professional_activity', {
        startDate: '2020-01-01',
        endDate: '2021-12-31',
        months: 24,
      }),
    );
    // Mínimo: 1,2 × 0,15. Máximo: + 1,8 × 0,6 + 2,4 × 0,25.
    expect(summary.total).toEqual({ min: 0.18, max: 1.86 });
    expect(summary.sections.map((s) => s.raw)).toEqual([
      { min: 1.2, max: 1.2 },
      { min: 0, max: 1.8 },
      { min: 0, max: 2.4 },
    ]);
  });
});

describe('topes', () => {
  it('2.d: másteres y CAP hasta 2 puntos', () => {
    const summary = score(
      merit('master', { credits: 90 }),
      merit('teacher_training', { credits: 15 }),
    );
    const masters = item(summary, '2.d');
    expect(masters.score).toEqual({ min: 2, max: 2 });
    expect(masters.capped).toBe(true);
  });

  it('el CAP sin créditos no puntúa y avisa', () => {
    const summary = score(merit('teacher_training', { credits: null }));
    expect(item(summary, '2.d').score).toEqual({ min: 0, max: 0 });
    expect(summary.byMerit.values().next().value!.notes[0]).toMatch(/créditos/);
  });

  it('2.a: solo cuenta un expediente, el mejor', () => {
    const good = merit('academic_record', {
      honors: 1,
      outstanding: 1,
      notable: null,
      pass: null,
      nationalAward: false,
      extraordinaryAward: false,
      tesina: false,
    });
    const other = merit('academic_record', {
      honors: null,
      outstanding: null,
      notable: 2,
      pass: null,
      nationalAward: false,
      extraordinaryAward: false,
      tesina: false,
    });
    const summary = score(other, good);
    expect(item(summary, '2.a').score).toEqual({ min: 0, max: 5.25 });
    expect(summary.byMerit.get(other.id)!.supersededBy).toBe(good.id);
  });

  it('4.b: 0,2 por mes con un máximo de 1 por año', () => {
    const summary = score(
      merit('research_stay', { year: 2023, months: 7 }),
      merit('research_stay', { year: 2024, months: 2 }),
      merit('research_stay', { year: 2024, months: 0.5 }),
    );
    expect(item(summary, '4.b').score).toEqual({ min: 0, max: 1.4 });
  });

  it('4.d-e: 0,75 por año natural, una contribución por congreso y 6 en total', () => {
    const summary = score(
      merit('conference_talk', { congress: 'A', scope: 'international', year: 2024 }),
      merit('poster', { congress: 'A', scope: 'international', year: 2024 }),
      merit('conference_talk', { congress: 'B', scope: 'international', year: 2024 }),
      merit('conference_talk', { congress: 'C', scope: 'international', year: 2024 }),
      merit('conference_talk', { congress: 'D', scope: 'national', year: 2025 }),
    );
    expect(item(summary, '4.d-e').score).toEqual({ min: 0, max: 0.9 });

    const many = Array.from({ length: 12 }, (_, i) =>
      merit('conference_talk', { congress: `C${i}`, scope: 'international', year: 2010 + i }),
    );
    expect(item(score(...many), '4.d-e').score.max).toBe(3.6);
    const more = Array.from({ length: 30 }, (_, i) =>
      merit('conference_talk', { congress: `C${i}`, scope: 'international', year: 1990 + i }),
    );
    expect(item(score(...more), '4.d-e').score.max).toBe(6);
  });

  it('4.h: exposiciones individuales hasta 4 y colectivas hasta 2', () => {
    const individual = Array.from({ length: 5 }, () =>
      merit('art_exhibition', { participation: 'individual' }),
    );
    const collective = Array.from({ length: 5 }, () =>
      merit('art_exhibition', { participation: 'collective' }),
    );
    expect(item(score(...individual, ...collective), '4.h').score).toEqual({ min: 0, max: 6 });
  });

  it('4.i: 0,25 (IP) o 0,1 por año natural, hasta 0,5 por año', () => {
    const contract = (pi: string) =>
      merit('industry_contract', {
        principalInvestigator: pi,
        startDate: '2024-06-01',
        endDate: '2025-05-31',
      });
    const summary = score(
      contract('Laura Gómez Ruiz'),
      contract('Gómez Ruiz, Laura'),
      contract('Otra Persona'),
    );
    // 2024 y 2025: 0,25 + 0,25 + 0,1 = 0,6 → 0,5 cada año.
    expect(item(summary, '4.i').score).toEqual({ min: 0, max: 1 });
  });

  it('4.k: 0,1 por revista y máximo 1', () => {
    const reviews = Array.from({ length: 12 }, (_, i) =>
      merit('peer_review', { journal: `J${i}` }),
    );
    const repeated = [
      merit('peer_review', { journal: 'J' }),
      merit('peer_review', { journal: 'j' }),
    ];
    expect(item(score(...reviews), '4.k').score.max).toBe(1);
    expect(item(score(...repeated), '4.k').score.max).toBe(0.1);
  });

  it('5: 1,2 por año y máximo 18', () => {
    const summary = score(
      merit('professional_activity', {
        startDate: '2000-01-01',
        endDate: '2019-12-31',
        months: 240,
      }),
    );
    expect(item(summary, '5').score).toEqual({ min: 0, max: 18 });
    expect(item(summary, '5').capped).toBe(true);
  });
});

describe('reglas', () => {
  it('2.a: media por asignaturas y premios', () => {
    const summary = score(
      merit('academic_record', {
        honors: 3,
        outstanding: 12,
        notable: 20,
        pass: 5,
        nationalAward: false,
        extraordinaryAward: true,
        tesina: true,
      }),
    );
    // (3·6 + 12·4,5 + 20·3 + 5·1,5) / 40 = 3,4875; + 1 + 0,5.
    expect(item(summary, '2.a').score.max).toBe(4.9875);
  });

  it('2.b: media de los cursos por créditos', () => {
    const summary = score(
      merit('doctoral_studies', {
        courses: [
          { subject: 'A', credits: 6, grade: 'Sobresaliente' },
          { subject: 'B', credits: 3, grade: 'Notable' },
        ],
        masterExtraordinaryAward: true,
      }),
    );
    // (6·1,5 + 3·1) / 9 + 0,5.
    expect(item(summary, '2.b').score.max).toBeCloseTo(1.8333, 4);
  });

  it.each([
    [{ grade: 'Sobresaliente cum laude', extraordinaryAward: false, international: false }, 5],
    [{ grade: 'Apto', extraordinaryAward: false, international: true }, 3.5],
    [{ grade: 'Notable', extraordinaryAward: false, international: false }, 2],
    [{ grade: 'Sobresaliente cum laude', extraordinaryAward: true, international: true }, 6.5],
  ] as const)('2.c: %j → %d', (data, expected) => {
    const summary = score(merit('doctorate', { ...data, awardDate: '2025-01-01' }));
    expect(item(summary, '2.c').score.max).toBe(expected);
  });

  it('2.e: suma directamente la media de la otra titulación', () => {
    const summary = score(
      merit('other_degree', { honors: null, outstanding: 2, notable: 2, pass: null }),
    );
    expect(item(summary, '2.e').score).toEqual({ min: 1.25, max: 1.25 });
  });

  it('4.a: por año de disfrute y solo hasta la fecha de referencia', () => {
    const summary = score(
      merit('grant', {
        kind: 'fpu_fpi',
        startDate: '2020-10-01',
        endDate: '2024-09-30',
        months: 48,
      }),
      merit('grant', { kind: 'other', startDate: '2026-04-01', endDate: '2027-03-31', months: 12 }),
    );
    // 1,2 × 4 + 0,6 × 6 meses (hasta el 30/09/2026).
    expect(item(summary, '4.a').score.max).toBeCloseTo(4.8 + 0.3, 2);
  });

  it('4.f: IP según el perfil y por año', () => {
    const project = (principalInvestigator: string, scope: 'national' | 'international') =>
      merit('project', {
        principalInvestigator,
        scope,
        startDate: '2022-01-01',
        endDate: '2023-12-31',
      });
    expect(item(score(project('Laura Gómez Ruiz', 'national')), '4.f').score.max).toBeCloseTo(2, 1);
    expect(item(score(project('Otra Persona', 'international')), '4.f').score.max).toBeCloseTo(
      1.5,
      1,
    );
    const noName = scoreMerits(PCI_BAREMO, [project('Laura Gómez Ruiz', 'national')], {
      ...context,
      applicantName: null,
    });
    expect(item(noName, '4.f').score.max).toBeCloseTo(0.8, 1);
  });

  it('4.g: solo las tesis defendidas', () => {
    expect(item(score(merit('thesis_supervision')), '4.g').score.max).toBe(2);
    expect(item(score(merit('thesis_supervision', { defenseDate: null })), '4.g').score.max).toBe(
      0,
    );
  });

  it('4.j: individual 2, colectiva 1', () => {
    expect(item(score(merit('patent', { inventors: 'Laura Gómez' })), '4.j').score.max).toBe(2);
    expect(item(score(merit('patent', { inventors: 'A; B' })), '4.j').score.max).toBe(1);
  });

  it('libros y capítulos: primer tramo como máximo', () => {
    const summary = score(merit('book'), merit('book_chapter'));
    expect(item(summary, '4.c.1').score).toEqual({ min: 0, max: 4 });
    expect(item(summary, '4.c.2').score).toEqual({ min: 0, max: 1 });
  });

  it('un mérito con datos no válidos no se puntúa', () => {
    const broken: ScorableMerit = { id: 'x', type: 'language', data: {}, cvSection: '2.f' };
    const summary = score(broken);
    expect(summary.unscored).toEqual([
      { meritId: 'x', type: 'language', reason: expect.stringMatching(/datos/) },
    ]);
    expect(summary.total).toEqual({ min: 0, max: 0 });
  });
});

describe('utilidades', () => {
  it('reconoce calificaciones escritas', () => {
    expect(bandFromText('Matrícula de Honor')).toBe('honors');
    expect(bandFromText('SOBRESALIENTE')).toBe('outstanding');
    expect(bandFromText('9,2')).toBe('outstanding');
    expect(bandFromText('7')).toBe('notable');
    expect(bandFromText('Apto')).toBe('pass');
    expect(bandFromText('?')).toBeNull();
  });

  it('aproxima el expediente por la nota media si no hay asignaturas', () => {
    const result = transcriptPoints(
      { honors: null, outstanding: null, notable: null, pass: null },
      8.1,
      { honors: 6, outstanding: 4.5, notable: 3, pass: 1.5 },
    );
    expect(result.value).toBe(3);
    expect(result.notes[0]).toMatch(/Aproximado/);
  });

  it('cuenta meses y años naturales hasta la fecha de referencia', () => {
    expect(monthsUntil('2020-01-01', '2020-12-31', 12, '2026-01-01')).toBe(12);
    expect(monthsUntil('2026-01-01', null, null, '2026-06-30')).toBeCloseTo(6, 0);
    expect(monthsUntil('2027-01-01', null, 3, '2026-06-30')).toBe(0);
    expect(naturalYears('2023-11-01', null, '2025-02-01')).toEqual([2023, 2024, 2025]);
  });

  it('detecta a la persona candidata y cuenta autores', () => {
    expect(namesApplicant('Dra. Laura Gómez Ruiz', 'Laura Gómez Ruiz')).toBe(true);
    expect(namesApplicant('GOMEZ RUIZ, LAURA', 'Laura Gómez Ruiz')).toBe(true);
    expect(namesApplicant('Luis Gómez', 'Laura Gómez Ruiz')).toBe(false);
    expect(countPeople('Pérez, A.; López, B.')).toBe(2);
    expect(countPeople('Ana Pérez y Luis López')).toBe(2);
    expect(countPeople('Ana Pérez')).toBe(1);
  });
});
