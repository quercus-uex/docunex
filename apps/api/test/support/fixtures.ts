// Ficheros de prueba generados al vuelo (no se guardan en el repositorio).
import * as mupdf from 'mupdf';
import { PDFDocument, PDFName, PDFNumber, PDFRawStream, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';

export async function makePdf(pages: number, label = 'Documento'): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let page = 1; page <= pages; page++) {
    pdf.addPage().drawText(`${label} - pagina ${page}`, { x: 50, y: 750, size: 18, font });
  }
  return Buffer.from(await pdf.save());
}

/** Re-guarda un PDF cifrado con MuPDF. Sin `userPassword` se abre sin contraseña. */
export function encryptPdf(
  data: Uint8Array,
  { ownerPassword, userPassword = '' }: { ownerPassword: string; userPassword?: string },
): Buffer {
  const document = mupdf.Document.openDocument(data, 'application/pdf');
  const buffer = document
    .asPDF()!
    .saveToBuffer(`encrypt=aes-256,owner-password=${ownerPassword},user-password=${userPassword}`);
  const result = Buffer.from(buffer.asUint8Array());
  buffer.destroy();
  document.destroy();
  return result;
}

export function makeJpeg(width: number, height: number, orientation?: number): Promise<Buffer> {
  const image = sharp({ create: { width, height, channels: 3, background: '#3366cc' } });
  return (orientation ? image.withMetadata({ orientation }) : image).jpeg().toBuffer();
}

export function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 4, background: '#ff000080' } })
    .png()
    .toBuffer();
}

/** Escaneo en blanco y negro puro (1 bit por píxel, TIFF CCITT G4). */
export function makeBilevelTiff(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ffffff' } })
    .toColourspace('b-w')
    .tiff({ bitdepth: 1, compression: 'ccittfax4' })
    .toBuffer();
}

export interface EmbeddedImage {
  width: number;
  height: number;
  /** `DCTDecode` para JPEG, `FlateDecode` para PNG. */
  filter: string;
}

/** Imágenes incrustadas en un PDF, para comprobar cómo se han recodificado. */
export async function embeddedImages(data: Uint8Array): Promise<EmbeddedImage[]> {
  const document = await PDFDocument.load(data);
  return document.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(
      (object): object is PDFRawStream =>
        object instanceof PDFRawStream &&
        object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'),
    )
    .map((stream) => ({
      width: (stream.dict.get(PDFName.of('Width')) as PDFNumber).asNumber(),
      height: (stream.dict.get(PDFName.of('Height')) as PDFNumber).asNumber(),
      filter: String(stream.dict.get(PDFName.of('Filter'))).replace('/', ''),
    }));
}
