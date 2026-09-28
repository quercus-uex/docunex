import { z } from 'zod';
import { nullableText } from '../common.js';
import type { DocumentKind, DocumentStatus } from '../documents.js';
import { getMeritType, MERIT_TYPES, type MeritType } from './catalog.js';
import { CV_SECTION_CODES, type CvSectionCode } from './cv-sections.js';

export const MAX_MERIT_DOCUMENTS = 20;

export const meritTypeSchema = z.enum(MERIT_TYPES, 'Tipo de mérito no válido');

/**
 * Cuerpo de `POST /merits` y `PUT /merits/:id`. `data` se valida con el esquema de su tipo;
 * `documentIds` es la lista ordenada de justificantes y sustituye a la anterior.
 */
export const meritInputSchema = z
  .object({
    type: meritTypeSchema,
    data: z.record(z.string(), z.unknown()),
    notes: nullableText(2000),
    documentIds: z
      .array(z.uuid())
      .max(MAX_MERIT_DOCUMENTS, `Máximo ${MAX_MERIT_DOCUMENTS} documentos`)
      .refine((ids) => new Set(ids).size === ids.length, 'Hay documentos repetidos'),
  })
  .transform((input, ctx) => {
    const result = getMeritType(input.type).schema.safeParse(input.data);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ code: 'custom', message: issue.message, path: ['data', ...issue.path] });
      }
      return z.NEVER;
    }
    return { ...input, data: result.data as Record<string, unknown> };
  });

export type MeritInput = z.input<typeof meritInputSchema>;
export type MeritInputData = z.output<typeof meritInputSchema>;

export const listMeritsQuerySchema = z.object({
  type: meritTypeSchema.optional(),
  /** Apartado del CV; incluye sus subapartados (`4.c` devuelve también `4.c.3.a`). */
  section: z.enum(CV_SECTION_CODES).optional(),
});

/** Justificante de un mérito, en su orden. */
export interface MeritDocumentDto {
  id: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  pageCount: number | null;
}

export interface MeritDto {
  id: string;
  type: MeritType;
  data: Record<string, unknown>;
  schemaVersion: number;
  cvSection: CvSectionCode;
  sortDate: string | null;
  summary: string;
  notes: string | null;
  documents: MeritDocumentDto[];
  createdAt: string;
  updatedAt: string;
}

/** Dónde se usa un documento (`GET /documents/:id/usages`). */
export interface DocumentUsagesDto {
  merits: Pick<MeritDto, 'id' | 'type' | 'cvSection' | 'summary'>[];
  /** Es la copia del DNI del perfil. */
  idDocument: boolean;
}
