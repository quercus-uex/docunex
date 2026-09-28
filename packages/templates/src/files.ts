/**
 * Ficheros del paquete (fuentes y logotipos). Se localizan con `new URL(…, import.meta.url)`, que funciona
 * igual en Node (una ruta local, desde `src/` o desde `dist/`) y en el navegador (Vite lo convierte en la
 * URL del recurso).
 */
function resolve(url: URL): string {
  if (url.protocol !== 'file:') return url.href;
  const path = decodeURIComponent(url.pathname);
  // En Windows la ruta de una URL `file:` empieza por `/C:/`.
  return /^\/[A-Za-z]:\//.test(path) ? path.slice(1) : path;
}

export const FONT_FILES = {
  sans: resolve(new URL('../fonts/LiberationSans-Regular.ttf', import.meta.url)),
  sansBold: resolve(new URL('../fonts/LiberationSans-Bold.ttf', import.meta.url)),
  sansItalic: resolve(new URL('../fonts/LiberationSans-Italic.ttf', import.meta.url)),
  sansBoldItalic: resolve(new URL('../fonts/LiberationSans-BoldItalic.ttf', import.meta.url)),
  serif: resolve(new URL('../fonts/LiberationSerif-Regular.ttf', import.meta.url)),
  serifItalic: resolve(new URL('../fonts/LiberationSerif-Italic.ttf', import.meta.url)),
};

/** Logotipos de la UEx tal como aparecen en cada plantilla oficial. */
export const LOGO_FILES = {
  annex: resolve(new URL('../assets/uex-annex.png', import.meta.url)),
  cv: resolve(new URL('../assets/uex-cv.jpg', import.meta.url)),
  vertical: resolve(new URL('../assets/uex-vertical.png', import.meta.url)),
};
