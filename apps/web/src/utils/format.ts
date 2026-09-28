const bytesFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${bytesFormatter.format(bytes / 1024)} KB`;
  return `${bytesFormatter.format(bytes / (1024 * 1024))} MB`;
}

/** `2024-05-17` → `17/05/2024`. */
export function formatIsoDate(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
