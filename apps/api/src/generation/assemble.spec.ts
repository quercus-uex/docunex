import {
  getMeritType,
  MAX_PACKAGE_BYTES,
  MERIT_EXAMPLES,
  type MeritType,
  type NumberedDocumentDto,
} from '@docunex/shared';
import { EXAMPLE_APPLICANT } from '@docunex/templates';
import * as mupdf from 'mupdf';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { embeddedImages, makeScannedPdf } from '../../test/support/fixtures.js';
import { extractPageTexts } from '../pdf/text.js';
import { assemblePackage } from './assemble.js';
import { assembleWithinLimit, SIZE_TARGET, sizeWarnings } from './fit-size.js';
import { checkPackage } from './self-check.js';
import type { GenerationSnapshot, SnapshotDocument, SnapshotMerit } from './snapshot.js';

const pageCounts = new Map<string, number>();

function doc(
  id: string,
  pages: number,
  kind: SnapshotDocument['kind'] = 'certificate',
): SnapshotDocument {
  pageCounts.set(id, pages);
  return {
    id,
    name: `Documento ${id}`,
    kind,
    status: 'ready',
    pdfKey: id,
    pdfSize: 1000,
    pageCount: pages,
  };
}

async function readPdf(document: SnapshotDocument): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pageCounts.get(document.id)!;
  for (let page = 1; page <= pages; page++) {
    pdf
      .addPage()
      .drawText(`Contenido ${document.id} pagina ${page}`, { x: 50, y: 400, size: 14, font });
  }
  return pdf.save();
}

function merit(
  id: string,
  type: MeritType,
  documents: SnapshotDocument[],
  data: object = {},
): SnapshotMerit {
  const merged = { ...MERIT_EXAMPLES[type], ...data };
  const def = getMeritType(type);
  const parsed = def.schema.parse(merged);
  return {
    id,
    type,
    data: merged,
    cvSection: def.cvSection(parsed),
    summary: def.summary(parsed),
    documents,
  };
}

function snapshot(overrides: Partial<GenerationSnapshot> = {}): GenerationSnapshot {
  const certificacion = doc('certificacion', 3, 'transcript');
  const compartido = doc('compartido', 1);
  return {
    profile: { ...EXAMPLE_APPLICANT, idDocumentId: 'dni', degreeVerifications: [] },
    idDocument: doc('dni', 1, 'identity'),
    position: { id: 'plaza', code: 'IN123456', resolutionDate: '2026-09-15' },
    applicationDate: '2026-09-28',
    expone: 'Expone',
    solicita: 'Solicita',
    requirementDocuments: [doc('titulo', 2, 'degree'), certificacion],
    merits: [
      merit('expediente', 'academic_record', [certificacion]),
      merit('articulo', 'article', [doc('articulo', 4, 'publication')]),
      merit('proyecto', 'project', [doc('resolucion', 2), compartido]),
      merit('contrato', 'industry_contract', [compartido, doc('convenio', 1)]),
    ],
    ...overrides,
  };
}

describe('assemblePackage', () => {
  it('numera, pagina, sella y enlaza todo el expediente', async () => {
    const result = await assemblePackage(snapshot(), readPdf);
    const pages = extractPageTexts(result.pdf);
    expect(pages).toHaveLength(result.pageCount);

    // Numeración: sin huecos ni repetidos; la certificación conserva su número de requisito.
    expect(result.documents.map((d) => [d.code, d.block, d.documentId])).toEqual([
      [1, 5, 'titulo'],
      [2, 5, 'certificacion'],
      [3, 6, 'articulo'],
      [4, 6, 'resolucion'],
      [5, 6, 'compartido'],
      [6, 6, 'convenio'],
    ]);

    // Cada documento empieza donde dice y lleva su sello en cada página.
    for (const document of result.documents) {
      for (let page = 0; page < document.pageCount; page++) {
        const text = pages[document.startPage - 1 + page]!;
        expect(text).toContain(`Contenido ${document.documentId} pagina ${page + 1}`);
        expect(text).toContain(`DOC_0${document.code} · ${page + 1}/${document.pageCount}`);
      }
    }

    // Bloques contiguos, cada uno con su separador.
    expect(result.layout.map((block) => block.number)).toEqual([1, 2, 3, 4, 5, 6]);
    result.layout.forEach((block, index) => {
      const previous = result.layout[index - 1];
      expect(block.startPage).toBe(previous ? previous.endPage + 1 : 1);
      if (block.number > 1) expect(pages[block.startPage - 1]).toContain(block.title);
    });
    expect(result.layout.at(-1)!.endPage).toBe(result.pageCount);

    // "Doc. nº" del CV con los códigos definitivos.
    const cv = result.layout.find((block) => block.number === 3)!;
    const cvText = pages.slice(cv.startPage, cv.endPage).join(' ');
    expect(cvText).toContain('Nota Media del Expediente Doc. nº: DOC_02');
    expect(cvText).toContain('Con índice de referencia Doc. nº: DOC_03');
    expect(cvText).toContain('Participación en proyectos de investigación Doc. nº: DOC_04, DOC_05');
    expect(cvText).toContain(
      'Participación en contratos y convenios con empresas Doc. nº: DOC_05, DOC_06',
    );

    // La hoja índice cita el cuartil del artículo.
    expect(pages.join(' ')).toContain('JCR, Q1, Computer Science, Theory & Methods (12/143)');

    expect(checkPackage(result.pdf, result.layout, result.documents)).toEqual([]);

    const document = mupdf.Document.openDocument(result.pdf, 'application/pdf');
    const outline = document.loadOutline() ?? [];
    expect(outline.map((item) => item.title)).toEqual(
      result.layout.map((block) => `${block.number}. ${block.title}`),
    );
    expect(outline[5]!.down!.map((item) => [item.title, item.page! + 1])).toEqual(
      result.documents.slice(2).map((d) => [`DOC_0${d.code} – ${d.name}`, d.startPage]),
    );
    expect(document.getMetaData('info:Title')).toBe('Solicitud IN123456 – Fernández Gómez, Lucía');
    document.destroy();
  });

  it('recalcula las páginas cuando la hoja índice ocupa más de una página', async () => {
    const many = Array.from({ length: 60 }, (_, index) => doc(`curso-${index + 1}`, 1));
    const result = await assemblePackage(
      snapshot({
        requirementDocuments: [],
        merits: many.map((document, index) =>
          merit(`m${index}`, 'language', [document], { language: `Idioma ${index + 1}` }),
        ),
      }),
      readPdf,
    );
    const index = result.layout.find((block) => block.number === 4)!;
    expect(index.endPage - index.startPage).toBeGreaterThan(1);
    expect(result.layout.map((block) => block.number)).toEqual([1, 2, 3, 4, 6]);
    expect(checkPackage(result.pdf, result.layout, result.documents)).toEqual([]);
  });

  it('la autocomprobación detecta un índice que no cuadra', async () => {
    const result = await assemblePackage(snapshot(), readPdf);
    const shifted = result.documents.map((d) =>
      d.code === 3 ? { ...d, startPage: d.startPage + 1 } : d,
    );
    expect(checkPackage(result.pdf, result.layout, shifted).map((issue) => issue.code)).toEqual([
      'SELF_CHECK_STAMP',
      'SELF_CHECK_INDEX',
    ]);
  });
});

describe('assembleWithinLimit', () => {
  it('un expediente de escaneos de más de 10 MB baja del límite recomprimiendo las imágenes', async () => {
    const scan = await makeScannedPdf(1);
    const scans = new Map<string, Uint8Array>([
      ['titulo', scan],
      ['articulo', scan],
    ]);
    const read = (document: SnapshotDocument) =>
      scans.has(document.id) ? Promise.resolve(scans.get(document.id)!) : readPdf(document);
    const data = snapshot();
    // Los escaneos tienen una página.
    pageCounts.set('titulo', 1);
    pageCounts.set('articulo', 1);

    const plain = await assemblePackage(data, read);
    expect(plain.pdf.length).toBeGreaterThan(MAX_PACKAGE_BYTES);

    const steps: string[] = [];
    const result = await assembleWithinLimit(data, read, (step) => void steps.push(step));
    expect(result.pdf.length).toBeLessThanOrEqual(SIZE_TARGET);
    expect(steps).toContain('Reduciendo el tamaño (1/2)');
    expect(steps).not.toContain('Reduciendo el tamaño (2/2)');

    // Solo se han tocado los escaneos, y la numeración sigue cuadrando.
    const reduced = result.documents.filter((document) => document.originalSize !== null);
    expect(reduced.map((document) => document.documentId)).toEqual(['titulo', 'articulo']);
    expect(reduced.every((document) => document.size < scan.length / 10)).toBe(true);
    expect(result.documents.map((document) => document.startPage)).toEqual(
      plain.documents.map((document) => document.startPage),
    );
    expect(checkPackage(result.pdf, result.layout, result.documents)).toEqual([]);
    expect((await embeddedImages(result.pdf)).map((image) => image.filter)).toContain('DCTDecode');

    const warnings = sizeWarnings(result.pdf.length, result.documents);
    expect(warnings.map((warning) => warning.code)).toEqual(['SIZE_REDUCED']);
    expect(warnings[0]!.message).toContain('2 documentos');
  }, 60_000);

  it('si no llega al objetivo, prueba todos los niveles y devuelve el expediente', async () => {
    const steps: string[] = [];
    const result = await assembleWithinLimit(snapshot(), readPdf, (step) => void steps.push(step), {
      target: 1000,
    });
    expect(steps.filter((step) => step.startsWith('Reduciendo'))).toEqual([
      'Reduciendo el tamaño (1/2)',
      'Reduciendo el tamaño (2/2)',
    ]);
    expect(result.pdf.length).toBeGreaterThan(1000);
    expect(result.documents.every((document) => document.originalSize === null)).toBe(true);
  });
});

describe('sizeWarnings', () => {
  it('avisa con el desglose de los documentos más pesados si pasa de 10 MB', () => {
    const document = (code: number, size: number): NumberedDocumentDto => ({
      code,
      block: 6,
      documentId: `d${code}`,
      name: `Documento ${code}`,
      detail: null,
      startPage: code,
      pageCount: 1,
      size,
      originalSize: null,
    });
    const documents = [1, 2, 3, 4, 5, 6].map((code) => document(code, code * 1_000_000));
    const [warning, ...rest] = sizeWarnings(21_500_000, documents);
    expect(rest).toEqual([]);
    expect(warning!.code).toBe('SIZE_OVER_LIMIT');
    expect(warning!.message).toContain('21,5 MB');
    expect(warning!.message).toContain(
      'Documento 6 (6 MB), Documento 5 (5 MB), Documento 4 (4 MB), Documento 3 (3 MB), Documento 2 (2 MB).',
    );
  });
});
