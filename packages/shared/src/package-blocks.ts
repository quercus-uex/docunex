/**
 * Bloques del expediente (PDF único), con los títulos de la lista del Anexo III. Van en este orden y,
 * salvo el primero, precedidos de una página separadora con su número y título.
 */
export const PACKAGE_BLOCKS = [
  { number: 1, title: 'Modelo de solicitud (ANEXO III)' },
  { number: 2, title: 'Copia del DNI o pasaporte' },
  { number: 3, title: 'Currículum Vitae normalizado del solicitante' },
  { number: 4, title: 'Hoja índice en la que se enumeren los méritos presentados' },
  {
    number: 5,
    title: 'Documentos justificativos de cumplir los requisitos establecidos para la convocatoria.',
  },
  { number: 6, title: 'Documentos justificativos de los méritos alegados' },
] as const;

export type PackageBlockNumber = (typeof PACKAGE_BLOCKS)[number]['number'];
