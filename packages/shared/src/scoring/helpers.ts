import { monthsBetween } from '../merits/fields.js';

/** Número con coma decimal y hasta dos decimales: `1.25` → `1,25`. */
export function formatPoints(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
}

/** Minúsculas, sin tildes y con los espacios normalizados, para comparar textos. */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Calificaciones ----------------------------------------------------------------------------

export const GRADE_BANDS = ['honors', 'outstanding', 'notable', 'pass'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export const GRADE_BAND_LABELS: Record<GradeBand, string> = {
  honors: 'MH',
  outstanding: 'SB',
  notable: 'NT',
  pass: 'AP',
};

export type GradeScale = Record<GradeBand, number>;

/** Calificación de una nota numérica sobre 10 (la matrícula no se deduce de la nota). */
export function bandFromAverage(average: number): GradeBand | null {
  if (average >= 9) return 'outstanding';
  if (average >= 7) return 'notable';
  if (average >= 5) return 'pass';
  return null;
}

/** Calificación escrita como texto ("Sobresaliente", "MH", "9,2", "Apto"…). */
export function bandFromText(text: string | null): GradeBand | null {
  if (!text) return null;
  const value = normalizeText(text);
  if (/matricula|\bmh\b/.test(value)) return 'honors';
  if (/sobresaliente/.test(value)) return 'outstanding';
  if (/notable/.test(value)) return 'notable';
  if (/aprobado|\bapto\b|convalidad/.test(value)) return 'pass';
  const number = Number(value.match(/\d+(?:[.,]\d+)?/)?.[0]?.replace(',', '.'));
  return Number.isFinite(number) ? bandFromAverage(number) : null;
}

export type GradeCounts = Record<GradeBand, number | null>;

/**
 * Media ponderada de una escala por nº de asignaturas: el baremo pondera por créditos, pero el CV
 * normalizado solo recoge cuántas asignaturas hay de cada calificación. `null` si no hay ninguna.
 */
export function weightedGrade(
  counts: GradeCounts,
  scale: GradeScale,
): { value: number; basis: string } | null {
  const total = sum(GRADE_BANDS.map((band) => counts[band] ?? 0));
  if (total === 0) return null;
  const value = sum(GRADE_BANDS.map((band) => (counts[band] ?? 0) * scale[band])) / total;
  const detail = GRADE_BANDS.filter((band) => (counts[band] ?? 0) > 0)
    .map((band) => `${counts[band]} ${GRADE_BAND_LABELS[band]}`)
    .join(', ');
  return { value, basis: `media de ${detail} → ${formatPoints(value)}` };
}

/**
 * Puntos por la nota media de un expediente: con el nº de asignaturas de cada calificación si lo
 * hay y, si no, con la calificación que corresponde a la nota media (aproximado).
 */
export function transcriptPoints(
  counts: GradeCounts,
  average: number,
  scale: GradeScale,
): { value: number; basis: string; notes: string[] } {
  const weighted = weightedGrade(counts, scale);
  if (weighted) {
    return {
      ...weighted,
      notes: ['El baremo pondera por créditos; aquí se aproxima con el nº de asignaturas.'],
    };
  }
  const band = bandFromAverage(average);
  const value = band ? scale[band] : 0;
  return {
    value,
    basis: `nota media ${formatPoints(average)} (${band ? GRADE_BAND_LABELS[band] : 'suspenso'}) → ${formatPoints(value)}`,
    notes: [
      'Aproximado a partir de la nota media: indica el nº de asignaturas de cada calificación para calcularlo como el baremo.',
    ],
  };
}

// --- Fechas ------------------------------------------------------------------------------------

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Meses de un periodo que cuentan a la fecha de referencia: los del propio mérito si terminó antes
 * y, si no, solo hasta esa fecha.
 */
export function monthsUntil(
  start: string,
  end: string | null,
  months: number | null,
  referenceDate: string,
): number {
  if (start > referenceDate) return 0;
  const untilReference = monthsBetween(start, end && end < referenceDate ? end : referenceDate);
  if (months === null) return untilReference ?? 0;
  return end && end <= referenceDate ? months : Math.min(months, untilReference ?? 0);
}

/** Años naturales en los que transcurre un periodo, hasta la fecha de referencia. */
export function naturalYears(start: string, end: string | null, referenceDate: string): number[] {
  if (start > referenceDate) return [];
  const last = end && end < referenceDate ? end : referenceDate;
  const years: number[] = [];
  for (let year = Number(start.slice(0, 4)); year <= Number(last.slice(0, 4)); year++) {
    years.push(year);
  }
  return years;
}

// --- Personas ----------------------------------------------------------------------------------

/** Nº de personas en una lista de autores o inventores separada por ";", saltos de línea o "y". */
export function countPeople(text: string): number {
  return text
    .split(/;|\n| y | and |&/i)
    .map((part) => part.trim())
    .filter((part) => part !== '').length;
}

/** Si el texto (p. ej. el investigador principal) nombra a la persona candidata. */
export function namesApplicant(text: string, applicantName: string | null): boolean {
  if (!applicantName) return false;
  const haystack = normalizeText(text);
  const words = normalizeText(applicantName)
    .split(' ')
    .filter((word) => word.length > 2);
  return words.length > 0 && words.every((word) => haystack.includes(word));
}
