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

export interface AssignedDocCode {
  documentId: string;
  code: number;
  /** Bloque del expediente en el que se imprime: 5 (requisitos) o 6 (méritos). */
  block: 5 | 6;
}

/**
 * Numera los documentos acreditativos en su orden físico en el expediente: primero los requisitos
 * (bloque 5) y después los justificantes de cada mérito siguiendo el CV (bloque 6). Un documento que
 * ya ha salido conserva su número y no se repite, aunque sea requisito y mérito a la vez.
 */
export function assignDocCodes(input: {
  requirementDocumentIds: readonly string[];
  /** Justificantes de cada mérito, con los méritos en el orden del CV. */
  meritDocumentIds: readonly (readonly string[])[];
}): AssignedDocCode[] {
  const assigned: AssignedDocCode[] = [];
  const seen = new Set<string>();
  const add = (documentId: string, block: 5 | 6) => {
    if (seen.has(documentId)) return;
    seen.add(documentId);
    assigned.push({ documentId, code: assigned.length + 1, block });
  };
  for (const id of input.requirementDocumentIds) add(id, 5);
  for (const ids of input.meritDocumentIds) for (const id of ids) add(id, 6);
  return assigned;
}
