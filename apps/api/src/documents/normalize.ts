import type { AcceptedMimeType } from '@docunex/shared';
import * as mupdf from 'mupdf';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

/** Error esperable al procesar un documento; su mensaje se muestra al usuario. */
export class DocumentProcessingError extends Error {
  override name = 'DocumentProcessingError';
}

export interface DetectedType {
  mime: AcceptedMimeType;
  extension: string;
}

export interface NormalizedPdf {
  pdf: Uint8Array;
  pageCount: number;
}

const IMAGE_FORMATS: Partial<Record<string, DetectedType>> = {
  jpeg: { mime: 'image/jpeg', extension: 'jpg' },
  png: { mime: 'image/png', extension: 'png' },
  tiff: { mime: 'image/tiff', extension: 'tiff' },
  webp: { mime: 'image/webp', extension: 'webp' },
};

/** Tipo real del fichero según su contenido (no según su nombre), o `null` si no se acepta. */
export async function detectFileType(data: Uint8Array): Promise<DetectedType | null> {
  // La cabecera %PDF- puede ir precedida de basura; los lectores la buscan en el primer KB.
  if (Buffer.from(data.subarray(0, 1024)).includes('%PDF-')) {
    return { mime: 'application/pdf', extension: 'pdf' };
  }
  try {
    const { format } = await sharp(data).metadata();
    return IMAGE_FORMATS[format] ?? null;
  } catch {
    return null;
  }
}

// A4 en puntos PDF y margen de 10 mm alrededor de la imagen.
const A4_SHORT = 595.28;
const A4_LONG = 841.89;
const MARGIN = 28.35;
// Lado mayor máximo: ~200 ppp sobre el lado largo de un A4 (11,69 pulgadas).
const MAX_IMAGE_SIDE = 2339;

/**
 * Convierte una imagen (o cada página de un TIFF multipágina) en páginas A4 con la imagen centrada.
 * Aplica la orientación EXIF, reduce la resolución y recodifica: PNG si es un escaneo de 1 bit
 * (blanco y negro puro) y JPEG en el resto de casos.
 */
export async function imageToPdf(data: Uint8Array): Promise<NormalizedPdf> {
  const metadata = await sharp(data)
    .metadata()
    .catch(() => {
      throw new DocumentProcessingError('La imagen está dañada o no se puede leer.');
    });
  const pages = metadata.pages ?? 1;
  const bilevel = metadata.bitsPerSample === 1;

  const pdf = await PDFDocument.create();
  for (let page = 0; page < pages; page++) {
    const pipeline = sharp(data, { page })
      .rotate()
      .resize({
        width: MAX_IMAGE_SIDE,
        height: MAX_IMAGE_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' });

    const { data: encoded, info } = bilevel
      ? await pipeline.png({ palette: true, colours: 2 }).toBuffer({ resolveWithObject: true })
      : await pipeline.jpeg({ quality: 80, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    const image = bilevel ? await pdf.embedPng(encoded) : await pdf.embedJpg(encoded);

    const landscape = info.width > info.height;
    const [pageWidth, pageHeight] = landscape ? [A4_LONG, A4_SHORT] : [A4_SHORT, A4_LONG];
    const scale = Math.min(
      (pageWidth - 2 * MARGIN) / info.width,
      (pageHeight - 2 * MARGIN) / info.height,
    );
    const width = info.width * scale;
    const height = info.height * scale;
    pdf.addPage([pageWidth, pageHeight]).drawImage(image, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
  }

  return { pdf: await pdf.save(), pageCount: pages };
}

/**
 * Sanea un PDF con MuPDF: repara la estructura si está dañada, quita el cifrado cuando solo tiene
 * contraseña de propietario, elimina objetos sin usar y comprime. Después comprueba que pdf-lib
 * (que se usa al ensamblar el expediente) puede abrirlo.
 */
export async function normalizePdf(data: Uint8Array): Promise<NormalizedPdf> {
  let document: mupdf.Document;
  try {
    document = mupdf.Document.openDocument(data, 'application/pdf');
  } catch {
    throw new DocumentProcessingError('El PDF está dañado y no se ha podido reparar.');
  }

  let result: NormalizedPdf;
  try {
    if (document.needsPassword()) {
      throw new DocumentProcessingError(
        'El PDF está protegido con contraseña de apertura. Quítala (por ejemplo, imprimiéndolo a PDF) y vuelve a subirlo.',
      );
    }
    const pageCount = document.countPages();
    if (pageCount === 0) throw new DocumentProcessingError('El PDF no tiene páginas.');

    const pdf = document.asPDF();
    if (!pdf) throw new DocumentProcessingError('El fichero no es un PDF válido.');
    const buffer = pdf.saveToBuffer('encrypt=none,garbage=deduplicate,compress');
    // Copia fuera de la memoria de WebAssembly antes de liberar el buffer.
    result = { pdf: Uint8Array.from(buffer.asUint8Array()), pageCount };
    buffer.destroy();
  } catch (error) {
    if (error instanceof DocumentProcessingError) throw error;
    throw new DocumentProcessingError('No se ha podido procesar el PDF.');
  } finally {
    document.destroy();
  }

  let loadedPages: number;
  try {
    loadedPages = (await PDFDocument.load(result.pdf)).getPageCount();
  } catch {
    throw new DocumentProcessingError('El PDF tiene una estructura que no se puede combinar.');
  }
  if (loadedPages !== result.pageCount) {
    throw new DocumentProcessingError('El PDF tiene una estructura que no se puede combinar.');
  }
  return result;
}
