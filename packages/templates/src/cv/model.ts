import {
  CV_SECTIONS,
  type CvSectionCode,
  type CvSectionDef,
  getMeritType,
  type MeritData,
  type MeritType,
} from '@docunex/shared';
import type { Applicant } from '../models.js';

/** Un mérito del CV con sus datos validados y los códigos `DOC_nn` de sus justificantes. */
export type CvEntry = {
  [T in MeritType]: { type: T; data: MeritData<T>; docCodes: number[] };
}[MeritType];

/** Apartado del CV con contenido: méritos propios (si es hoja) o subapartados con méritos. */
export interface CvSectionNode {
  section: CvSectionDef;
  entries: CvEntry[];
  children: CvSectionNode[];
  /** Códigos de todo el apartado, incluidos sus subapartados, en orden de aparición y sin repetir. */
  docCodes: number[];
}

export interface CvModel {
  applicant: Pick<Applicant, 'lastNames' | 'firstName' | 'dni'>;
  positionCode: string | null;
  /** ISO (`YYYY-MM-DD`). */
  date: string | null;
  degreeVerifications: { degreeName: string; code: string }[];
  /** Bloques 2, 4 y 5, solo los que tienen méritos. */
  sections: CvSectionNode[];
}

export interface CvMeritInput {
  type: MeritType;
  data: unknown;
  documentIds: readonly string[];
}

export interface BuildCvModelInput extends Omit<CvModel, 'sections'> {
  /** Méritos en el orden en que deben imprimirse dentro de cada apartado. */
  merits: readonly CvMeritInput[];
  /** `DOC_nn` de cada documento. Sin él (vistas previas), los "Doc. nº" quedan en blanco. */
  docCodes?: ReadonlyMap<string, number>;
}

function unique(codes: number[]): number[] {
  return [...new Set(codes)];
}

/**
 * Agrupa los méritos por apartado del CV respetando su orden y poda los apartados vacíos a cualquier
 * nivel. Los datos se validan de nuevo con el esquema de su tipo; si no son válidos, lanza un error.
 */
export function buildCvModel({ merits, docCodes, ...rest }: BuildCvModelInput): CvModel {
  const bySection = new Map<CvSectionCode, CvEntry[]>();
  for (const merit of merits) {
    const def = getMeritType(merit.type);
    const parsed = def.schema.safeParse(merit.data);
    if (!parsed.success) throw new Error(`Datos no válidos en un mérito de tipo "${def.label}"`);
    const code = def.cvSection(parsed.data);
    const entry = {
      type: merit.type,
      data: parsed.data,
      docCodes: unique(
        merit.documentIds.flatMap((id) => {
          const docCode = docCodes?.get(id);
          return docCode === undefined ? [] : [docCode];
        }),
      ),
    } as CvEntry;
    bySection.set(code, [...(bySection.get(code) ?? []), entry]);
  }

  const build = (section: CvSectionDef): CvSectionNode | null => {
    const entries = bySection.get(section.code) ?? [];
    const children = CV_SECTIONS.filter((child) => child.parent === section.code)
      .map(build)
      .filter((child) => child !== null);
    if (entries.length === 0 && children.length === 0) return null;
    return {
      section,
      entries,
      children,
      docCodes: unique([
        ...entries.flatMap((entry) => entry.docCodes),
        ...children.flatMap((child) => child.docCodes),
      ]),
    };
  };

  return {
    ...rest,
    sections: CV_SECTIONS.filter((section) => section.parent === null)
      .map(build)
      .filter((node) => node !== null),
  };
}
