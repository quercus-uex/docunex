import type { DocumentDto } from '@docunex/shared';
import type { Document } from './document.entity.js';

export type DocumentUsage = DocumentDto['usage'];

const NO_USAGE: DocumentUsage = { merits: 0, applications: 0, idDocument: false };

export function toDocumentDto(document: Document, usage: DocumentUsage = NO_USAGE): DocumentDto {
  return {
    id: document.id,
    name: document.name,
    kind: document.kind,
    originalFilename: document.originalFilename,
    originalMime: document.originalMime,
    originalSize: document.originalSize,
    sha256: document.sha256,
    pdfSize: document.pdfSize,
    pageCount: document.pageCount,
    issuedAt: document.issuedAt,
    status: document.status,
    errorMessage: document.errorMessage,
    usage,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}
