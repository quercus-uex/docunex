import { renderToBuffer } from '@react-pdf/renderer';
import * as mupdf from 'mupdf';
import type { ReactElement } from 'react';

/** Renderiza un documento y devuelve el texto de cada página (con los espacios normalizados). */
export async function renderPages(element: ReactElement): Promise<string[]> {
  // oxlint-disable-next-line typescript/no-explicit-any -- renderToBuffer exige un <Document>.
  const buffer = await renderToBuffer(element as any);
  const document = mupdf.Document.openDocument(buffer, 'application/pdf');
  try {
    return Array.from({ length: document.countPages() }, (_, index) =>
      document.loadPage(index).toStructuredText('').asText().replace(/\s+/g, ' ').trim(),
    );
  } finally {
    document.destroy();
  }
}
