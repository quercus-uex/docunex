/** Cabecera Content-Disposition con nombre de fichero UTF-8 (RFC 6266) y alternativa ASCII. */
export function contentDisposition(type: 'inline' | 'attachment', filename: string): string {
  const ascii = filename
    .normalize('NFD')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
