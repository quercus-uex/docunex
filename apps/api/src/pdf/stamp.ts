import { degrees, type PDFFont, type PDFPage, rgb } from 'pdf-lib';

const MARGIN = 8;
const PADDING = 2.5;

/**
 * Convierte coordenadas "visuales" (origen arriba a la izquierda de la página tal como se ve, `u` hacia
 * la derecha y `v` hacia abajo) a coordenadas PDF, teniendo en cuenta `/Rotate` y el origen del
 * recuadro de recorte.
 */
function toPdfSpace(page: PDFPage) {
  const box = page.getCropBox();
  const [x0, y0, x1, y1] = [box.x, box.y, box.x + box.width, box.y + box.height];
  const rotation = (((page.getRotation().angle % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const width = rotation % 180 === 0 ? box.width : box.height;
  const map = {
    0: (u: number, v: number) => ({ x: x0 + u, y: y1 - v }),
    90: (u: number, v: number) => ({ x: x0 + v, y: y0 + u }),
    180: (u: number, v: number) => ({ x: x1 - u, y: y0 + v }),
    270: (u: number, v: number) => ({ x: x1 - v, y: y1 - u }),
  }[rotation];
  return { map, width, rotate: degrees(rotation) };
}

/** Escribe `text` en la esquina superior derecha de la página (como se ve), sobre fondo blanco. */
export function stampPage(page: PDFPage, text: string, font: PDFFont, size = 9): void {
  const { map, width, rotate } = toPdfSpace(page);
  const textWidth = font.widthOfTextAtSize(text, size);
  const boxWidth = textWidth + PADDING * 2;
  const boxHeight = size + PADDING * 2;
  const left = width - MARGIN - boxWidth;

  page.drawRectangle({
    ...map(left, MARGIN + boxHeight),
    width: boxWidth,
    height: boxHeight,
    rotate,
    color: rgb(1, 1, 1),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  // La línea base queda a una quinta parte del cuerpo por encima del borde inferior del recuadro.
  page.drawText(text, {
    ...map(left + PADDING, MARGIN + boxHeight - PADDING - size * 0.2),
    size,
    font,
    rotate,
    color: rgb(0, 0, 0),
  });
}
