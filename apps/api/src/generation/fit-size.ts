import { MAX_PACKAGE_BYTES, type NumberedDocumentDto, type ValidationIssue } from '@docunex/shared';
import { recompressPdf, type RecompressLevel } from '../pdf/recompress.js';
import { type AssembledPackage, assemblePackage, type ReadPdf } from './assemble.js';
import type { GenerationSnapshot } from './snapshot.js';

/** Objetivo al recomprimir: un 5 % por debajo del límite, para que quepa la firma de AutoFirma. */
export const SIZE_TARGET = Math.floor(MAX_PACKAGE_BYTES * 0.95);

/**
 * Niveles de recompresión, de menos a más agresivo: ~150 ppp y ~105 ppp sobre el lado largo de un A4.
 * Se parte siempre del PDF normalizado, no del ya recomprimido.
 */
export const RECOMPRESS_LEVELS: RecompressLevel[] = [
  { maxSide: 1754, quality: 70 },
  { maxSide: 1240, quality: 55 },
];

export interface FitOptions {
  target?: number;
  levels?: RecompressLevel[];
}

/**
 * Genera el expediente y, si pasa de `target`, recomprime las imágenes de los documentos más pesados
 * (del DNI y de los justificantes) y lo vuelve a generar, nivel a nivel, hasta que cabe. Si no cabe
 * ni con el último nivel, devuelve el más pequeño que ha conseguido. `documents[].originalSize`
 * indica qué documentos se han recomprimido.
 */
export async function assembleWithinLimit(
  snapshot: GenerationSnapshot,
  readPdf: ReadPdf,
  progress: (step: string) => Promise<void> | void = () => {},
  { target = SIZE_TARGET, levels = RECOMPRESS_LEVELS }: FitOptions = {},
): Promise<AssembledPackage> {
  const originals = new Map<string, Uint8Array>();
  const current = new Map<string, Uint8Array>();
  const read: ReadPdf = async (document) => {
    let data = current.get(document.id);
    if (!data) {
      data = await readPdf(document);
      originals.set(document.id, data);
      current.set(document.id, data);
    }
    return data;
  };

  let result = await assemblePackage(snapshot, read, progress);
  for (const [index, level] of levels.entries()) {
    if (result.pdf.length <= target) break;
    await progress(`Reduciendo el tamaño (${index + 1}/${levels.length})`);
    let excess = result.pdf.length - target;
    const heaviest = [...current.entries()].sort(([, a], [, b]) => b.length - a.length);
    for (const [id, data] of heaviest) {
      if (excess <= 0) break;
      const smaller = await recompressPdf(originals.get(id)!, level);
      if (smaller.length < data.length) {
        current.set(id, smaller);
        excess -= data.length - smaller.length;
      }
    }
    result = await assemblePackage(snapshot, read);
  }

  return {
    ...result,
    documents: result.documents.map((document) => {
      const original = document.documentId ? originals.get(document.documentId) : undefined;
      return {
        ...document,
        originalSize: original && original.length !== document.size ? original.length : null,
      };
    }),
  };
}

const megabytes = (bytes: number) =>
  `${(bytes / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;

/** Avisos sobre el tamaño del expediente generado. */
export function sizeWarnings(size: number, documents: NumberedDocumentDto[]): ValidationIssue[] {
  const warnings: ValidationIssue[] = [];
  const reduced = documents.filter((document) => document.originalSize !== null);
  if (reduced.length > 0) {
    const before = reduced.reduce((total, document) => total + document.originalSize!, 0);
    const after = reduced.reduce((total, document) => total + document.size, 0);
    warnings.push({
      code: 'SIZE_REDUCED',
      message: `Para no pasar de 10 MB se han recomprimido las imágenes de ${reduced.length === 1 ? '1 documento' : `${reduced.length} documentos`} (de ${megabytes(before)} a ${megabytes(after)}): ${reduced.map((document) => document.name).join(', ')}. Comprueba que se leen bien.`,
    });
  }
  if (size > MAX_PACKAGE_BYTES) {
    const largest = [...documents]
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .map((document) => `${document.name} (${megabytes(document.size)})`)
      .join(', ');
    warnings.push({
      code: 'SIZE_OVER_LIMIT',
      message: `El expediente ocupa ${megabytes(size)} aun recomprimiendo las imágenes, y RedSara admite 10 MB por fichero. Los documentos más pesados: ${largest}. Quita méritos poco relevantes o sustituye esos documentos por versiones más ligeras.`,
    });
  }
  return warnings;
}
