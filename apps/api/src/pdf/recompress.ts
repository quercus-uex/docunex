import * as mupdf from 'mupdf';
import sharp from 'sharp';

export interface RecompressLevel {
  /** Lado mayor máximo de cada imagen, en píxeles. */
  maxSide: number;
  /** Calidad JPEG (1–100). */
  quality: number;
}

/** Imágenes más pequeñas no merecen la pena. */
const MIN_IMAGE_BYTES = 32 * 1024;
/** Solo se sustituye una imagen si baja al menos esto. */
const MIN_SAVING = 0.9;

/** Referencias de las máscaras (`/SMask`, `/Mask`) de otras imágenes, que se dejan como están. */
function maskObjects(pdf: mupdf.PDFDocument): Set<number> {
  const masks = new Set<number>();
  for (let num = 1; num < pdf.countObjects(); num++) {
    const object = pdf.newIndirect(num);
    if (!object.isStream()) continue;
    for (const key of ['SMask', 'Mask']) {
      const mask = object.get(key);
      if (mask.isIndirect()) masks.add(mask.asIndirect());
    }
  }
  return masks;
}

function isRecompressible(object: mupdf.PDFObject, masks: Set<number>, num: number): boolean {
  if (!object.isStream() || object.get('Subtype').asName() !== 'Image') return false;
  if (masks.has(num) || object.get('ImageMask').asBoolean()) return false;
  // Los escaneos de 1 bit (CCITT, JBIG2) ya son pequeños y en JPEG ocuparían más.
  if (object.get('BitsPerComponent').asNumber() === 1) return false;
  return object.readRawStream().length >= MIN_IMAGE_BYTES;
}

/** Píxeles en gris o RGB, sin alfa y sin relleno de fila, o `null` si la imagen no se puede tratar. */
function pixelsOf(
  image: mupdf.Image,
): { data: Buffer; width: number; height: number; channels: 1 | 3 } | null {
  let pixmap = image.toPixmap();
  try {
    if (pixmap.getAlpha()) return null;
    const components = pixmap.getNumberOfComponents();
    if (components !== 1 && components !== 3) {
      const rgb = pixmap.convertToColorSpace(mupdf.ColorSpace.DeviceRGB);
      pixmap.destroy();
      pixmap = rgb;
    }
    const width = pixmap.getWidth();
    const height = pixmap.getHeight();
    const channels = pixmap.getNumberOfComponents() as 1 | 3;
    const stride = pixmap.getStride();
    const pixels = pixmap.getPixels();
    const row = width * channels;
    const data = Buffer.alloc(row * height);
    for (let y = 0; y < height; y++) {
      data.set(pixels.subarray(y * stride, y * stride + row), y * row);
    }
    return { data, width, height, channels };
  } finally {
    pixmap.destroy();
  }
}

/**
 * Recomprime las imágenes de un PDF: las reduce a `maxSide` píxeles de lado mayor y las recodifica en
 * JPEG. Deja intactas las máscaras, las imágenes de 1 bit y las que no bajarían de tamaño. Devuelve
 * el PDF nuevo (con las mismas páginas) o el original si no se ha podido reducir.
 */
export async function recompressPdf(data: Uint8Array, level: RecompressLevel): Promise<Uint8Array> {
  const document = mupdf.Document.openDocument(data, 'application/pdf');
  try {
    const pdf = document.asPDF();
    if (!pdf) return data;
    const masks = maskObjects(pdf);
    let changed = false;

    for (let num = 1; num < pdf.countObjects(); num++) {
      const object = pdf.newIndirect(num);
      if (!isRecompressible(object, masks, num)) continue;
      const originalSize = object.readRawStream().length;

      let pixels: ReturnType<typeof pixelsOf>;
      const image = pdf.loadImage(object);
      try {
        pixels = pixelsOf(image);
      } catch {
        pixels = null; // Imagen que MuPDF no sabe decodificar: se deja como está.
      } finally {
        image.destroy();
      }
      if (!pixels) continue;

      const { data: jpeg, info } = await sharp(pixels.data, {
        raw: { width: pixels.width, height: pixels.height, channels: pixels.channels },
      })
        .resize({
          width: level.maxSide,
          height: level.maxSide,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: level.quality, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
      if (jpeg.length > originalSize * MIN_SAVING) continue;

      object.writeRawStream(jpeg);
      object.put('Filter', pdf.newName('DCTDecode'));
      object.put('Width', info.width);
      object.put('Height', info.height);
      object.put('BitsPerComponent', 8);
      object.put('ColorSpace', pdf.newName(pixels.channels === 1 ? 'DeviceGray' : 'DeviceRGB'));
      // Los píxeles ya salen decodificados y convertidos.
      for (const key of ['DecodeParms', 'Decode', 'Intent']) object.delete(key);
      changed = true;
    }

    if (!changed) return data;
    const buffer = pdf.saveToBuffer('garbage=deduplicate,compress');
    const result = Uint8Array.from(buffer.asUint8Array());
    buffer.destroy();
    return result.length < data.length ? result : data;
  } finally {
    document.destroy();
  }
}
