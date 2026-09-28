import {
  assignDocCodes,
  formatDocCode,
  type NumberedDocumentDto,
  PACKAGE_BLOCKS,
  type PackageBlockLayout,
  type PackageBlockNumber,
} from '@docunex/shared';
import { buildCvModel, fullName, indexSheetDetails, sortableName } from '@docunex/templates';
import {
  renderAnnexIII,
  renderCv,
  renderIndexSheet,
  renderSeparator,
} from '@docunex/templates/node';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { addOutline, type OutlineItem } from '../pdf/outline.js';
import { stampPage } from '../pdf/stamp.js';
import type { GenerationSnapshot, SnapshotDocument } from './snapshot.js';

/** Error del proceso que se muestra tal cual al usuario. */
export class GenerationError extends Error {}

export interface AssembledPackage {
  pdf: Uint8Array;
  pageCount: number;
  layout: PackageBlockLayout[];
  documents: NumberedDocumentDto[];
}

export type ReadPdf = (document: SnapshotDocument) => Promise<Uint8Array>;

/** Iteraciones como mucho para que el nº de páginas de la hoja índice se estabilice (§8.6). */
const MAX_INDEX_ITERATIONS = 3;

async function load(data: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(data, { updateMetadata: false });
}

function blockTitle(number: PackageBlockNumber): string {
  return PACKAGE_BLOCKS.find((block) => block.number === number)!.title;
}

/**
 * Genera el expediente completo a partir de la instantánea: numeración, Anexo III, CV, hoja índice,
 * separadores, justificantes sellados y marcadores. `readPdf` devuelve el PDF normalizado de un
 * documento; `progress` informa del paso en curso.
 */
export async function assemblePackage(
  snapshot: GenerationSnapshot,
  readPdf: ReadPdf,
  progress: (step: string) => Promise<void> | void = () => {},
): Promise<AssembledPackage> {
  const { profile } = snapshot;
  if (!snapshot.idDocument) throw new GenerationError('Falta la copia del DNI en el perfil');

  // 1. Numeración.
  await progress('Numerando los documentos');
  const assigned = assignDocCodes({
    requirementDocumentIds: snapshot.requirementDocuments.map((document) => document.id),
    meritDocumentIds: snapshot.merits.map((merit) =>
      merit.documents.map((document) => document.id),
    ),
  });
  const documentsById = new Map<string, SnapshotDocument>();
  for (const document of [
    ...snapshot.requirementDocuments,
    ...snapshot.merits.flatMap((merit) => merit.documents),
  ]) {
    documentsById.set(document.id, document);
  }
  const meritInputs = snapshot.merits.map((merit) => ({
    type: merit.type,
    data: merit.data,
    documentIds: merit.documents.map((document) => document.id),
  }));
  const details = indexSheetDetails(meritInputs);

  // 2. Partes generadas.
  await progress('Generando el Anexo III y el currículum');
  const applicant = { ...profile };
  const [annex, cv] = await Promise.all([
    renderAnnexIII({
      applicant,
      positionCode: snapshot.position.code,
      resolutionDate: snapshot.position.resolutionDate,
      date: snapshot.applicationDate,
    }).then(load),
    renderCv(
      buildCvModel({
        applicant,
        positionCode: snapshot.position.code,
        date: snapshot.applicationDate,
        degreeVerifications: profile.degreeVerifications,
        merits: meritInputs,
        docCodes: new Map(assigned.map(({ documentId, code }) => [documentId, code])),
      }),
    ).then(load),
  ]);

  // 3. Justificantes.
  await progress('Leyendo los justificantes');
  const idDocument = await load(await readPdf(snapshot.idDocument));
  const numbered: {
    code: number;
    block: 5 | 6;
    document: SnapshotDocument;
    data: Uint8Array;
    pdf: PDFDocument;
  }[] = [];
  for (const { documentId, code, block } of assigned) {
    const document = documentsById.get(documentId)!;
    const data = await readPdf(document);
    numbered.push({ code, block, document, data, pdf: await load(data) });
  }
  const blocks5and6 = ([5, 6] as const).filter((block) =>
    numbered.some((item) => item.block === block),
  );
  const separators = new Map<PackageBlockNumber, PDFDocument>();
  for (const number of [2, 3, 4, ...blocks5and6] as PackageBlockNumber[]) {
    separators.set(
      number,
      await load(await renderSeparator({ number, title: blockTitle(number) })),
    );
  }

  // 4. Paginación: el índice necesita las páginas absolutas, que dependen de cuántas ocupe él mismo.
  await progress('Paginando la hoja índice');
  // Anexo, separador y DNI, separador y CV, separador del índice.
  const pagesBeforeIndex =
    annex.getPageCount() + 1 + idDocument.getPageCount() + 1 + cv.getPageCount() + 1;
  const startPages = (indexPages: number) => {
    let page = pagesBeforeIndex + indexPages + 1;
    const starts = new Map<number, number>();
    let previousBlock: number | null = null;
    for (const item of numbered) {
      if (item.block !== previousBlock) {
        page += 1; // separador del bloque
        previousBlock = item.block;
      }
      starts.set(item.code, page);
      page += item.pdf.getPageCount();
    }
    return starts;
  };
  const renderIndex = (starts: Map<number, number>) =>
    renderIndexSheet({
      applicant,
      positionCode: snapshot.position.code,
      entries: numbered.map((item) => ({
        code: item.code,
        name: item.document.name,
        detail: details.get(item.document.id) ?? null,
        page: starts.get(item.code)!,
      })),
    }).then(load);

  let indexPages = 1;
  let starts = startPages(indexPages);
  let index = await renderIndex(starts);
  for (let iteration = 1; index.getPageCount() !== indexPages; iteration++) {
    if (iteration >= MAX_INDEX_ITERATIONS) {
      throw new GenerationError('La hoja índice no llega a un número de páginas estable');
    }
    indexPages = index.getPageCount();
    starts = startPages(indexPages);
    index = await renderIndex(starts);
  }

  // 5. Ensamblado.
  await progress('Uniendo y sellando los documentos');
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.HelveticaBold);
  const layout: PackageBlockLayout[] = [];
  const outline: OutlineItem[] = [];

  const append = async (source: PDFDocument): Promise<number> => {
    const first = output.getPageCount();
    const pages = await output.copyPages(source, source.getPageIndices());
    for (const page of pages) output.addPage(page);
    return first;
  };
  const startBlock = async (number: PackageBlockNumber) => {
    const first = await append(number === 1 ? annex : separators.get(number)!);
    const title = `${number}. ${blockTitle(number)}`;
    layout.push({ number, title: blockTitle(number), startPage: first + 1, endPage: 0 });
    const item: OutlineItem = { title, pageIndex: first, children: [] };
    outline.push(item);
    return item;
  };
  const endBlock = () => {
    layout.at(-1)!.endPage = output.getPageCount();
  };

  await startBlock(1);
  endBlock();
  await startBlock(2);
  await append(idDocument);
  endBlock();
  await startBlock(3);
  await append(cv);
  endBlock();
  await startBlock(4);
  await append(index);
  endBlock();

  const documents: NumberedDocumentDto[] = [];
  for (const block of blocks5and6) {
    const blockItem = await startBlock(block);
    for (const item of numbered.filter((entry) => entry.block === block)) {
      const first = await append(item.pdf);
      const count = item.pdf.getPageCount();
      if (first + 1 !== starts.get(item.code)) {
        throw new GenerationError(`La paginación de ${formatDocCode(item.code)} no cuadra`);
      }
      for (let page = 0; page < count; page++) {
        stampPage(
          output.getPage(first + page),
          `${formatDocCode(item.code)} · ${page + 1}/${count}`,
          font,
        );
      }
      blockItem.children!.push({
        title: `${formatDocCode(item.code)} – ${item.document.name}`,
        pageIndex: first,
      });
      documents.push({
        code: item.code,
        block: item.block,
        documentId: item.document.id,
        name: item.document.name,
        detail: details.get(item.document.id) ?? null,
        startPage: first + 1,
        pageCount: count,
        size: item.data.length,
        originalSize: null,
      });
    }
    endBlock();
  }

  addOutline(output, outline);
  const name = sortableName(profile);
  output.setTitle(`Solicitud ${snapshot.position.code}${name ? ` – ${name}` : ''}`);
  output.setAuthor(fullName(profile));
  output.setSubject(
    'Solicitud de participación en proceso selectivo PCI de la Universidad de Extremadura',
  );
  output.setCreator('DocUNEx');
  output.setProducer('DocUNEx');
  output.setLanguage('es-ES');

  const pdf = await output.save();
  return { pdf, pageCount: output.getPageCount(), layout, documents };
}
