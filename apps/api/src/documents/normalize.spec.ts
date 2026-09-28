import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import {
  embeddedImages,
  encryptPdf,
  makeBilevelTiff,
  makeJpeg,
  makePdf,
  makePng,
} from '../../test/support/fixtures.js';
import { detectFileType, DocumentProcessingError, imageToPdf, normalizePdf } from './normalize.js';

async function pageSizes(pdf: Uint8Array) {
  const document = await PDFDocument.load(pdf);
  return document.getPages().map((page) => {
    const { width, height } = page.getSize();
    return { width: Math.round(width), height: Math.round(height) };
  });
}

describe('detectFileType', () => {
  it('reconoce PDFs e imágenes por su contenido', async () => {
    expect(await detectFileType(await makePdf(1))).toEqual({
      mime: 'application/pdf',
      extension: 'pdf',
    });
    expect((await detectFileType(await makeJpeg(10, 10)))?.mime).toBe('image/jpeg');
    expect((await detectFileType(await makePng(10, 10)))?.mime).toBe('image/png');
  });

  it('rechaza otros ficheros', async () => {
    expect(await detectFileType(Buffer.from('hola, esto es texto'))).toBeNull();
  });
});

describe('imageToPdf', () => {
  it('pone una imagen vertical en un A4 vertical', async () => {
    const { pdf, pageCount } = await imageToPdf(await makeJpeg(1200, 1700));
    expect(pageCount).toBe(1);
    expect(await pageSizes(pdf)).toEqual([{ width: 595, height: 842 }]);
  });

  it('pone una imagen apaisada en un A4 apaisado', async () => {
    const { pdf } = await imageToPdf(await makeJpeg(1700, 1200));
    expect(await pageSizes(pdf)).toEqual([{ width: 842, height: 595 }]);
  });

  it('aplica la orientación EXIF', async () => {
    // 1700×1200 almacenada, pero la etiqueta EXIF 6 la gira 90°: se ve vertical.
    const { pdf } = await imageToPdf(await makeJpeg(1700, 1200, 6));
    expect(await pageSizes(pdf)).toEqual([{ width: 595, height: 842 }]);
  });

  it('reduce las imágenes muy grandes a ~200 ppp y las recodifica en JPEG', async () => {
    const { pdf } = await imageToPdf(await makeJpeg(6000, 8000));
    expect(await embeddedImages(pdf)).toEqual([{ width: 1754, height: 2339, filter: 'DCTDecode' }]);
  });

  it('no amplía las imágenes pequeñas', async () => {
    const { pdf } = await imageToPdf(await makeJpeg(400, 300));
    expect(await embeddedImages(pdf)).toEqual([{ width: 400, height: 300, filter: 'DCTDecode' }]);
  });

  it('guarda los escaneos en blanco y negro como PNG', async () => {
    const { pdf } = await imageToPdf(await makeBilevelTiff(1000, 1400));
    expect(await embeddedImages(pdf)).toEqual([
      { width: 1000, height: 1400, filter: 'FlateDecode' },
    ]);
  });

  it('admite PNG con transparencia', async () => {
    const { pageCount } = await imageToPdf(await makePng(800, 600));
    expect(pageCount).toBe(1);
  });

  it('rechaza imágenes dañadas', async () => {
    await expect(imageToPdf(Buffer.from('no es una imagen'))).rejects.toThrow(
      DocumentProcessingError,
    );
  });
});

describe('normalizePdf', () => {
  it('conserva las páginas de un PDF normal', async () => {
    const { pdf, pageCount } = await normalizePdf(await makePdf(3));
    expect(pageCount).toBe(3);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3);
  });

  it('quita el cifrado cuando solo hay contraseña de propietario', async () => {
    const encrypted = encryptPdf(await makePdf(2), { ownerPassword: 'propietario' });
    await expect(PDFDocument.load(encrypted)).rejects.toThrow(/encrypted/);

    const { pdf, pageCount } = await normalizePdf(encrypted);
    expect(pageCount).toBe(2);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
  });

  it('rechaza los PDF con contraseña de apertura', async () => {
    const encrypted = encryptPdf(await makePdf(1), {
      ownerPassword: 'propietario',
      userPassword: 'usuario',
    });
    await expect(normalizePdf(encrypted)).rejects.toThrow(/contraseña de apertura/);
  });

  it('rechaza ficheros que no son PDF', async () => {
    await expect(normalizePdf(Buffer.from('%PDF-1.7 basura'))).rejects.toThrow(
      DocumentProcessingError,
    );
  });
});
