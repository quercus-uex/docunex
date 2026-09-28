import * as mupdf from 'mupdf';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { addOutline } from './outline.js';
import { stampPage } from './stamp.js';
import { extractPageTexts } from './text.js';

/** Posición (en coordenadas de la página tal como se ve) del texto que contiene `needle`. */
function visualPosition(data: Uint8Array, pageIndex: number, needle: string) {
  const document = mupdf.Document.openDocument(data, 'application/pdf');
  const page = document.loadPage(pageIndex);
  const [, , width, height] = page.getBounds();
  const hits = page.search(needle, '');
  const quad = hits[0]![0]!;
  document.destroy();
  return { x: quad[0] / width, y: quad[1] / height };
}

describe('stampPage', () => {
  it('sella la esquina superior derecha tal como se ve la página, con cualquier rotación', async () => {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    for (const angle of [0, 90, 180, 270]) {
      const page = pdf.addPage([595, 842]);
      page.setRotation({ type: 'degrees', angle } as never);
      stampPage(page, `DOC_07 · ${angle}`, font);
    }
    const bytes = await pdf.save();
    for (const [index, angle] of [0, 90, 180, 270].entries()) {
      const { x, y } = visualPosition(bytes, index, `DOC_07 · ${angle}`);
      expect(x, String(angle)).toBeGreaterThan(0.7);
      expect(y, String(angle)).toBeLessThan(0.1);
    }
    expect(extractPageTexts(bytes)).toEqual([
      'DOC_07 · 0',
      'DOC_07 · 90',
      'DOC_07 · 180',
      'DOC_07 · 270',
    ]);
  });

  it('respeta un recuadro de página que no empieza en el origen', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([600, 800]);
    page.setMediaBox(100, 200, 400, 500);
    stampPage(page, 'DOC_01 · 1/1', await pdf.embedFont(StandardFonts.HelveticaBold));
    const { x, y } = visualPosition(await pdf.save(), 0, 'DOC_01');
    expect(x).toBeGreaterThan(0.6);
    expect(y).toBeLessThan(0.1);
  });
});

describe('addOutline', () => {
  it('escribe marcadores anidados que apuntan a sus páginas', async () => {
    const pdf = await PDFDocument.create();
    for (let i = 0; i < 5; i++) pdf.addPage();
    addOutline(pdf, [
      { title: '1. Modelo de solicitud (ANEXO III)', pageIndex: 0 },
      {
        title: '6. Méritos',
        pageIndex: 2,
        children: [
          { title: 'DOC_01 – Título', pageIndex: 3 },
          { title: 'DOC_02 – Artículo', pageIndex: 4 },
        ],
      },
    ]);
    const document = mupdf.Document.openDocument(await pdf.save(), 'application/pdf');
    type Item = NonNullable<ReturnType<typeof document.loadOutline>>[number];
    const simplify = (items: Item[]): unknown[] =>
      items.map((item) => [item.title, item.page, ...(item.down ? [simplify(item.down)] : [])]);
    expect(simplify(document.loadOutline() ?? [])).toEqual([
      ['1. Modelo de solicitud (ANEXO III)', 0],
      [
        '6. Méritos',
        2,
        [
          ['DOC_01 – Título', 3],
          ['DOC_02 – Artículo', 4],
        ],
      ],
    ]);
    document.destroy();
  });
});
