import { Font } from '@react-pdf/renderer';
import { FONT_FILES } from './files.js';

/** Liberation Sans y Serif: métricas idénticas a Arial y Times New Roman, las de las plantillas. */
export const SANS = 'Liberation Sans';
export const SERIF = 'Liberation Serif';

Font.register({
  family: SANS,
  fonts: [
    { src: FONT_FILES.sans },
    { src: FONT_FILES.sansBold, fontWeight: 'bold' },
    { src: FONT_FILES.sansItalic, fontStyle: 'italic' },
    { src: FONT_FILES.sansBoldItalic, fontWeight: 'bold', fontStyle: 'italic' },
  ],
});
Font.register({
  family: SERIF,
  fonts: [{ src: FONT_FILES.serif }, { src: FONT_FILES.serifItalic, fontStyle: 'italic' }],
});

// Sin guionado: el de react-pdf sigue reglas del inglés y parte mal las palabras en español.
Font.registerHyphenationCallback((word) => [word]);
