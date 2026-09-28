import {
  formatDocCode,
  type NumberedDocumentDto,
  type PackageBlockLayout,
  type ValidationIssue,
} from '@docunex/shared';
import { extractPageTexts } from '../pdf/text.js';

/**
 * Autocomprobación (§8.10): en la página de inicio de cada documento está su sello, y la hoja índice
 * cita cada código con esa misma página. Devuelve los problemas encontrados.
 */
export function checkPackage(
  pdf: Uint8Array,
  layout: PackageBlockLayout[],
  documents: NumberedDocumentDto[],
): ValidationIssue[] {
  const pages = extractPageTexts(pdf);
  const issues: ValidationIssue[] = [];
  const indexBlock = layout.find((block) => block.number === 4);
  // Sin el separador, que es la primera página del bloque.
  const indexText = indexBlock
    ? pages.slice(indexBlock.startPage, indexBlock.endPage).join(' ')
    : '';

  documents.forEach((document, position) => {
    const code = formatDocCode(document.code);
    const stamp = `${code} · 1/${document.pageCount}`;
    if (!pages[document.startPage - 1]?.includes(stamp)) {
      issues.push({
        code: 'SELF_CHECK_STAMP',
        message: `No se encuentra el sello "${stamp}" en la página ${document.startPage}.`,
        documentId: document.documentId ?? undefined,
      });
    }
    const start = indexText.indexOf(`${code} `);
    const next = documents[position + 1];
    const end = next ? indexText.indexOf(`${formatDocCode(next.code)} `, start) : indexText.length;
    const row = start >= 0 ? indexText.slice(start, end >= 0 ? end : undefined).trim() : '';
    // La página va en su columna; el detalle (cuartil) puede salir antes o después según la fila.
    if (!new RegExp(`(^|\\s)${document.startPage}(\\s|$)`).test(row.slice(code.length))) {
      issues.push({
        code: 'SELF_CHECK_INDEX',
        message: `La hoja índice no indica la página ${document.startPage} para ${code}.`,
        documentId: document.documentId ?? undefined,
      });
    }
  });
  return issues;
}
