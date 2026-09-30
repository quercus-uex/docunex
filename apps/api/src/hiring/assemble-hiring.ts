import type { HiringSheetModel } from '@docunex/templates';
import { fullName, sortableName } from '@docunex/templates';
import { renderHiringSheet } from '@docunex/templates/node';
import { PDFDocument } from 'pdf-lib';
import { GenerationError } from '../generation/assemble.js';
import { addOutline, type OutlineItem } from '../pdf/outline.js';

export interface HiringPackageDocument {
  id: string;
  name: string;
  pdfKey: string | null;
}

export interface HiringPackageItem {
  label: string;
  required: boolean;
  documents: HiringPackageDocument[];
}

export interface HiringPackageInput {
  /** Portada sin la lista de documentos, que se calcula aquí con sus páginas. */
  sheet: Omit<HiringSheetModel, 'entries'>;
  /** Entradas de la lista de la segunda fase, en su orden. */
  items: HiringPackageItem[];
}

/** Iteraciones como mucho para que el nº de páginas de la portada se estabilice. */
const MAX_COVER_ITERATIONS = 3;

async function load(data: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(data, { updateMetadata: false });
}

/**
 * PDF con la documentación de la segunda fase: portada con los datos del contrato y la relación de
 * documentos (con su página) y, detrás, los documentos vinculados en el orden de la lista.
 */
export async function assembleHiringPackage(
  input: HiringPackageInput,
  readPdf: (document: HiringPackageDocument) => Promise<Uint8Array>,
): Promise<{ pdf: Uint8Array; pageCount: number }> {
  // Cada documento una vez, aunque esté en varias entradas.
  const loaded = new Map<string, PDFDocument>();
  for (const document of input.items.flatMap((item) => item.documents)) {
    if (!loaded.has(document.id)) loaded.set(document.id, await load(await readPdf(document)));
  }

  /** Página de inicio (base 1) de cada documento de cada entrada si la portada ocupa `coverPages`. */
  const layout = (coverPages: number) => {
    let page = coverPages + 1;
    return input.items.map((item) =>
      item.documents.map((document) => {
        const start = page;
        page += loaded.get(document.id)!.getPageCount();
        return start;
      }),
    );
  };
  const renderCover = (starts: number[][]) =>
    renderHiringSheet({
      ...input.sheet,
      entries: input.items.map((item, index) => ({
        label: item.label,
        required: item.required,
        documents: item.documents.map((document, position) => ({
          name: document.name,
          page: starts[index]![position]!,
        })),
      })),
    }).then(load);

  let coverPages = 1;
  let starts = layout(coverPages);
  let cover = await renderCover(starts);
  for (let iteration = 1; cover.getPageCount() !== coverPages; iteration++) {
    if (iteration >= MAX_COVER_ITERATIONS) {
      throw new GenerationError('La portada no llega a un número de páginas estable');
    }
    coverPages = cover.getPageCount();
    starts = layout(coverPages);
    cover = await renderCover(starts);
  }

  const output = await PDFDocument.create();
  const append = async (source: PDFDocument): Promise<number> => {
    const first = output.getPageCount();
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
    return first;
  };

  const outline: OutlineItem[] = [
    { title: 'Datos para el contrato y relación de documentos', pageIndex: await append(cover) },
  ];
  for (const [index, item] of input.items.entries()) {
    if (item.documents.length === 0) continue;
    const children: OutlineItem[] = [];
    for (const [position, document] of item.documents.entries()) {
      const first = await append(loaded.get(document.id)!);
      if (first + 1 !== starts[index]![position]) {
        throw new GenerationError(`La paginación de "${document.name}" no cuadra`);
      }
      children.push({ title: document.name, pageIndex: first });
    }
    outline.push({
      title: `${index + 1}. ${item.label}`,
      pageIndex: children[0]!.pageIndex,
      ...(children.length > 1 && { children }),
    });
  }

  addOutline(output, outline);
  const name = sortableName(input.sheet.applicant);
  output.setTitle(
    `Contratación ${input.sheet.positionCode ?? ''}${name ? ` – ${name}` : ''}`.trim(),
  );
  output.setAuthor(fullName(input.sheet.applicant));
  output.setSubject(
    'Documentación para la formalización del contrato (segunda fase de las plazas PCI)',
  );
  output.setCreator('DocUNEx');
  output.setProducer('DocUNEx');
  output.setLanguage('es-ES');

  const pdf = await output.save();
  return { pdf, pageCount: output.getPageCount() };
}
