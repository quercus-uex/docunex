import { EXAMPLE_HIRING } from '@docunex/templates';
import * as mupdf from 'mupdf';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { extractPageTexts } from '../pdf/text.js';
import { assembleHiringPackage, type HiringPackageDocument } from './assemble-hiring.js';

const pageCounts = new Map<string, number>();

function doc(id: string, pages: number): HiringPackageDocument {
  pageCounts.set(id, pages);
  return { id, name: `Documento ${id}`, pdfKey: id };
}

async function readPdf(document: HiringPackageDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let page = 1; page <= pageCounts.get(document.id)!; page++) {
    pdf
      .addPage()
      .drawText(`Contenido ${document.id} pagina ${page}`, { x: 50, y: 400, size: 14, font });
  }
  return pdf.save();
}

const { entries: _entries, ...sheet } = EXAMPLE_HIRING;

function outlineTitles(data: Uint8Array): string[] {
  const document = mupdf.Document.openDocument(data, 'application/pdf');
  try {
    type Item = NonNullable<ReturnType<typeof document.loadOutline>>[number];
    const titles: string[] = [];
    const walk = (items: Item[] | undefined, depth: number) => {
      for (const item of items ?? []) {
        titles.push(`${'  '.repeat(depth)}${item.title}`);
        walk(item.down, depth + 1);
      }
    };
    walk(document.loadOutline() ?? [], 0);
    return titles;
  } finally {
    document.destroy();
  }
}

describe('assembleHiringPackage', () => {
  it('pone la portada y detrás los documentos, con sus páginas en la relación y marcadores', async () => {
    const dni = doc('dni', 2);
    const { pdf, pageCount } = await assembleHiringPackage(
      {
        sheet,
        items: [
          { label: 'DNI, NIE o pasaporte', required: true, documents: [dni] },
          {
            label: 'Certificado de titularidad de la cuenta bancaria',
            required: true,
            documents: [doc('banco', 1)],
          },
          { label: 'Modelo 145 del IRPF', required: true, documents: [] },
          {
            label: 'Declaraciones',
            required: true,
            documents: [doc('separacion', 1), doc('incompatibilidad', 3)],
          },
        ],
      },
      readPdf,
    );

    expect(pageCount).toBe(1 + 2 + 1 + 1 + 3);
    const pages = extractPageTexts(pdf);
    expect(pages).toHaveLength(pageCount);
    const cover = pages[0]!;
    expect(cover).toContain('DOCUMENTACIÓN PARA LA FORMALIZACIÓN DEL CONTRATO');
    expect(cover).toContain('1 DNI, NIE o pasaporte · Documento dni 2');
    expect(cover).toContain(
      '2 Certificado de titularidad de la cuenta bancaria · Documento banco 4',
    );
    expect(cover).toContain('3 Modelo 145 del IRPF No se adjunta');
    expect(cover).toContain(
      '4 Declaraciones · Documento separacion (pág. 5) · Documento incompatibilidad (pág. 6) 5',
    );
    expect(pages[1]).toContain('Contenido dni pagina 1');
    expect(pages[3]).toContain('Contenido banco pagina 1');
    expect(pages[5]).toContain('Contenido incompatibilidad pagina 1');

    expect(outlineTitles(pdf)).toEqual([
      'Datos para el contrato y relación de documentos',
      '1. DNI, NIE o pasaporte',
      '2. Certificado de titularidad de la cuenta bancaria',
      '4. Declaraciones',
      '  Documento separacion',
      '  Documento incompatibilidad',
    ]);
  });

  it('sin documentos, solo la portada', async () => {
    const { pageCount } = await assembleHiringPackage(
      { sheet, items: [{ label: 'Modelo 145 del IRPF', required: true, documents: [] }] },
      readPdf,
    );
    expect(pageCount).toBe(1);
  });
});
