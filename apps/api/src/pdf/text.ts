import * as mupdf from 'mupdf';

/** Texto de cada página, con los espacios normalizados. */
export function extractPageTexts(data: Uint8Array): string[] {
  const document = mupdf.Document.openDocument(data, 'application/pdf');
  try {
    return Array.from({ length: document.countPages() }, (_, index) => {
      const page = document.loadPage(index);
      try {
        return page.toStructuredText('').asText().replace(/\s+/g, ' ').trim();
      } finally {
        page.destroy();
      }
    });
  } finally {
    document.destroy();
  }
}
