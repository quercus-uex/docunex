import { PDFDocument } from 'pdf-lib';
import { beforeAll, describe, expect, it } from 'vitest';
import { embeddedImages, makePdf, makeScannedPdf } from '../../test/support/fixtures.js';
import { recompressPdf } from './recompress.js';
import { extractPageTexts } from './text.js';

describe('recompressPdf', () => {
  let scan: Buffer;
  beforeAll(async () => {
    scan = await makeScannedPdf(2);
  }, 60_000);

  it('reduce y recodifica en JPEG las imágenes de un escaneo sin tocar el resto', async () => {
    expect(scan.length).toBeGreaterThan(10_000_000);
    const result = await recompressPdf(scan, { maxSide: 1754, quality: 70 });

    expect(result.length).toBeLessThan(scan.length / 20);
    expect(await embeddedImages(result)).toEqual([
      { width: 1240, height: 1754, filter: 'DCTDecode' },
      { width: 1240, height: 1754, filter: 'DCTDecode' },
    ]);
    expect(extractPageTexts(result)).toEqual(['Escaneo - pagina 1', 'Escaneo - pagina 2']);
    expect((await PDFDocument.load(result)).getPageCount()).toBe(2);
  });

  it('el nivel más agresivo reduce más', async () => {
    const mild = await recompressPdf(scan, { maxSide: 1754, quality: 70 });
    const strong = await recompressPdf(scan, { maxSide: 1240, quality: 55 });
    expect(strong.length).toBeLessThan(mild.length);
  });

  it('devuelve el mismo PDF si no hay imágenes que reducir', async () => {
    const text = await makePdf(2);
    expect(await recompressPdf(text, { maxSide: 1754, quality: 70 })).toBe(text);
  });
});
