/** Código de un documento acreditativo: `DOC_07`. */
export function formatDocCode(code: number): string {
  return `DOC_${String(code).padStart(2, '0')}`;
}

/**
 * Lista de códigos agrupada en rangos, como se imprime en el "Doc. nº" del CV:
 * `[12, 13, 14, 15, 18]` → `"DOC_12–DOC_15, DOC_18"`. Ordena y quita repetidos; dos códigos seguidos
 * no forman rango (`"DOC_01, DOC_02"`).
 */
export function formatDocRanges(codes: readonly number[]): string {
  const sorted = [...new Set(codes)].sort((a, b) => a - b);
  const ranges: [number, number][] = [];
  for (const code of sorted) {
    const last = ranges.at(-1);
    if (last && code === last[1] + 1) last[1] = code;
    else ranges.push([code, code]);
  }
  return ranges
    .flatMap(([start, end]) =>
      end - start >= 2
        ? [`${formatDocCode(start)}–${formatDocCode(end)}`]
        : start === end
          ? [formatDocCode(start)]
          : [formatDocCode(start), formatDocCode(end)],
    )
    .join(', ');
}
