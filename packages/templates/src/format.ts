import { getMeritType, type MeritData, optionLabel } from '@docunex/shared';
import type { Applicant } from './models.js';

/** `2024-06-14` → `14/06/2024`. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const numberFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

/** Número con coma decimal: `8.5` → `8,5`. */
export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : numberFormat.format(value);
}

/** "Nombre Apellidos". */
export function fullName(applicant: Pick<Applicant, 'firstName' | 'lastNames'>): string {
  return [applicant.firstName, applicant.lastNames].filter(Boolean).join(' ');
}

/** "Apellidos, Nombre". */
export function sortableName(applicant: Pick<Applicant, 'firstName' | 'lastNames'>): string {
  return [applicant.lastNames, applicant.firstName].filter(Boolean).join(', ');
}

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

/** Trocea un texto con las marcas `**negrita**`, `*cursiva*` y `***ambas***` de las notas del CV. */
export function parseEmphasis(text: string): TextRun[] {
  return text
    .split(/(\*{1,3}[^*]+\*{1,3})/)
    .filter((part) => part !== '')
    .map((part) => {
      const marks = /^\*+/.exec(part)?.[0].length ?? 0;
      if (marks === 0) return { text: part };
      return {
        text: part.slice(marks, -marks),
        ...(marks !== 1 && { bold: true }),
        ...(marks !== 2 && { italic: true }),
      };
    });
}

/** "JCR, Q1, Computer Science, Theory & Methods" de un artículo indexado; `null` si no lo está. */
export function articleIndexing(data: MeritData<'article'>): string | null {
  if (!data.indexed) return null;
  const { fieldDefs } = getMeritType('article');
  const index =
    data.index === 'other' ? data.otherIndex : optionLabel(fieldDefs, 'index', data.index);
  return (
    [index, optionLabel(fieldDefs, 'quartile', data.quartile), data.category]
      .filter(Boolean)
      .join(', ') || null
  );
}

/** Posición en la categoría: "12/143". */
export function articleRank(data: MeritData<'article'>): string {
  return data.rank !== null && data.categoryTotal !== null
    ? `${data.rank}/${data.categoryTotal}`
    : formatNumber(data.rank ?? data.categoryTotal);
}
