const bytesFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${bytesFormatter.format(bytes / 1024)} KB`;
  return `${bytesFormatter.format(bytes / (1024 * 1024))} MB`;
}

/** En unidades decimales, como los límites de RedSara (10 MB por fichero); KB por debajo de 1 MB. */
export function formatMegabytes(bytes: number): string {
  if (bytes < 1e6) return `${Math.max(1, Math.round(bytes / 1e3)).toLocaleString('es-ES')} KB`;
  return `${(bytes / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
}

/** `2024-05-17` → `17/05/2024`. */
export function formatIsoDate(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
