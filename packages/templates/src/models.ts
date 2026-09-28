import type { ProfileData } from '@docunex/shared';

/** Datos personales del solicitante. Pueden faltar en las vistas previas: se imprime el hueco vacío. */
export type Applicant = Pick<
  ProfileData,
  | 'lastNames'
  | 'firstName'
  | 'dni'
  | 'birthDate'
  | 'address'
  | 'postalCode'
  | 'city'
  | 'province'
  | 'email'
  | 'phone'
  | 'degree'
>;

export interface AnnexIIIModel {
  applicant: Applicant;
  /** Identificador completo de la plaza: `IN123456`. */
  positionCode: string | null;
  /** Fechas en ISO (`YYYY-MM-DD`). */
  resolutionDate: string | null;
  date: string | null;
}

export interface IndexEntry {
  /** `nn` de `DOC_nn`. */
  code: number;
  name: string;
  /** Segunda línea opcional, p. ej. el cuartil de una publicación (lo piden las instrucciones). */
  detail?: string | null;
  /** Página absoluta del expediente. */
  page: number | null;
}

export interface IndexSheetModel {
  applicant: Pick<Applicant, 'lastNames' | 'firstName' | 'dni'>;
  positionCode: string | null;
  entries: IndexEntry[];
}

export interface SeparatorModel {
  number: number;
  title: string;
}
