import { z } from 'zod';
import { isoDateSchema, nullableFormat } from './common.js';
import type { PackageBlockNumber } from './package-blocks.js';
import type { PositionDto } from './positions.js';
import type { RegistryEntryDto } from './registry.js';
import type { ValidationIssue } from './validation.js';

export const APPLICATION_STATUSES = ['draft', 'generated', 'registered', 'closed'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: 'Borrador',
  generated: 'Generada',
  registered: 'Registrada',
  closed: 'Cerrada',
};

/** Una solicitud registrada o cerrada ya no se puede modificar. */
export function isApplicationLocked(status: ApplicationStatus): boolean {
  return status === 'registered' || status === 'closed';
}

const MAX_TEXT = 4000;

/** Textos de RedSara propuestos a partir de la plaza. */
export function defaultExpone(position: Pick<PositionDto, 'code'>): string {
  return `Que desea participar en el proceso selectivo convocado por la Universidad de Extremadura para la contratación de Personal Científico e Investigador (PCI), plaza ${position.code}, y adjunta la solicitud (Anexo III) y la documentación requerida en un único archivo PDF.`;
}

export function defaultSolicita(position: Pick<PositionDto, 'code'>): string {
  return `Su admisión al proceso selectivo de la plaza ${position.code}.`;
}

/** Cuerpo de `POST /applications`. Se crea con todos los méritos seleccionados. */
export const createApplicationSchema = z.object({ positionId: z.uuid('Elige una plaza') });

export type CreateApplicationInput = z.input<typeof createApplicationSchema>;

/** Cuerpo de `PATCH /applications/:id`. */
export const updateApplicationSchema = z
  .object({
    positionId: z.uuid('Elige una plaza'),
    applicationDate: nullableFormat(isoDateSchema),
    expone: z.string().trim().min(1, 'Obligatorio').max(MAX_TEXT, `Máximo ${MAX_TEXT} caracteres`),
    solicita: z
      .string()
      .trim()
      .min(1, 'Obligatorio')
      .max(MAX_TEXT, `Máximo ${MAX_TEXT} caracteres`),
  })
  .partial();

export type UpdateApplicationInput = z.input<typeof updateApplicationSchema>;

function orderedIds(max: number, duplicate: string) {
  return z
    .array(z.uuid())
    .max(max, `Máximo ${max} elementos`)
    .refine((ids) => new Set(ids).size === ids.length, duplicate);
}

/** `PUT /applications/:id/merits`: méritos seleccionados en su orden (dentro de cada apartado). */
export const applicationMeritsSchema = z.object({
  meritIds: orderedIds(500, 'Hay méritos repetidos'),
});

/** `PUT /applications/:id/requirement-documents`: documentos del bloque 5 en su orden. */
export const requirementDocumentsSchema = z.object({
  documentIds: orderedIds(50, 'Hay documentos repetidos'),
});

export const PACKAGE_STATUSES = ['queued', 'running', 'done', 'failed'] as const;
export type PackageStatus = (typeof PACKAGE_STATUSES)[number];

/** Límite de RedSara por fichero. */
export const MAX_PACKAGE_BYTES = 10 * 1000 * 1000;

/** Documento acreditativo numerado en un expediente generado. */
export interface NumberedDocumentDto {
  code: number;
  block: 5 | 6;
  documentId: string | null;
  name: string;
  /** Segunda línea de la hoja índice (cuartil de las publicaciones). */
  detail: string | null;
  startPage: number;
  pageCount: number;
  /** Bytes en el expediente. */
  size: number;
  /** Bytes antes de recomprimirlo para no pasar del límite, o `null` si no se ha tocado. */
  originalSize: number | null;
}

export interface PackageBlockLayout {
  number: PackageBlockNumber;
  title: string;
  /** Página del separador (o de inicio, en el bloque 1). */
  startPage: number;
  endPage: number;
}

export interface PackageDto {
  id: string;
  applicationId: string;
  version: number;
  status: PackageStatus;
  /** Paso en curso mientras se genera. */
  progress: string | null;
  size: number | null;
  pageCount: number | null;
  /** Errores de validación o del proceso (si `failed`). */
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  layout: PackageBlockLayout[];
  documents: NumberedDocumentDto[];
  createdAt: string;
  finishedAt: string | null;
}

export type PackageSummaryDto = Omit<PackageDto, 'documents' | 'layout'>;

export interface ApplicationDto {
  id: string;
  status: ApplicationStatus;
  position: Pick<PositionDto, 'id' | 'code' | 'resolutionDate' | 'title' | 'deadline'>;
  applicationDate: string | null;
  expone: string;
  solicita: string;
  meritIds: string[];
  requirementDocumentIds: string[];
  latestPackage: PackageSummaryDto | null;
  /** Asientos registrales, del más antiguo al más reciente. */
  registryEntries: RegistryEntryDto[];
  createdAt: string;
  updatedAt: string;
}
