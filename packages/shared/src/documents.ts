import { z } from 'zod';
import { isoDateSchema } from './common.js';

export const DOCUMENT_KINDS = [
  'identity',
  'degree',
  'transcript',
  'certificate',
  'grant_credential',
  'contract',
  'publication',
  'other',
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
  identity: 'Documento de identidad',
  degree: 'Título',
  transcript: 'Certificación académica',
  certificate: 'Certificado',
  grant_credential: 'Credencial de beca',
  contract: 'Contrato',
  publication: 'Publicación',
  other: 'Otro',
};

export const DOCUMENT_STATUSES = ['processing', 'ready', 'error'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface DocumentDto {
  id: string;
  name: string;
  kind: DocumentKind;
  originalFilename: string;
  originalMime: string;
  originalSize: number;
  sha256: string;
  pdfSize: number | null;
  pageCount: number | null;
  issuedAt: string | null;
  status: DocumentStatus;
  errorMessage: string | null;
  /** Dónde se usa, resumido; el detalle está en `GET /documents/:id/usages`. */
  usage: { merits: number; applications: number; idDocument: boolean };
  createdAt: string;
  updatedAt: string;
}

/** Tipos de fichero aceptados como justificante, con sus extensiones. */
export const ACCEPTED_UPLOAD_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/tiff': ['.tif', '.tiff'],
  'image/webp': ['.webp'],
} as const;

export type AcceptedMimeType = keyof typeof ACCEPTED_UPLOAD_TYPES;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 20;

export const documentKindSchema = z.enum(DOCUMENT_KINDS);

export const updateDocumentSchema = z
  .object({
    name: z.string().trim().min(1, 'Indica un nombre').max(255),
    kind: documentKindSchema,
    issuedAt: isoDateSchema.nullable(),
  })
  .partial();

export type UpdateDocumentInput = z.input<typeof updateDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
  kind: documentKindSchema.optional(),
  q: z.string().trim().max(100).optional(),
  /** Solo los documentos que no usa ningún mérito, solicitud ni el perfil. */
  unused: z.stringbool().optional(),
});

/** Campos del formulario multipart de `POST /documents`, además de `files`. */
export const uploadDocumentsBodySchema = z.object({
  kind: documentKindSchema.optional(),
});

/** Resultado de cada fichero de una subida por lotes. */
export type UploadResult =
  | { filename: string; status: 'created'; document: DocumentDto }
  | { filename: string; status: 'duplicate'; document: DocumentDto }
  | { filename: string; status: 'rejected'; error: string };
