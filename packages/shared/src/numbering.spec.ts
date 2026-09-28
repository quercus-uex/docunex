import { describe, expect, it } from 'vitest';
import { formatDocCode, formatDocRanges } from './numbering.js';

describe('formatDocCode', () => {
  it('rellena con ceros hasta dos cifras', () => {
    expect(formatDocCode(7)).toBe('DOC_07');
    expect(formatDocCode(42)).toBe('DOC_42');
    expect(formatDocCode(123)).toBe('DOC_123');
  });
});

describe('formatDocRanges', () => {
  it('agrupa los códigos consecutivos en rangos', () => {
    expect(formatDocRanges([12, 13, 14, 15, 18])).toBe('DOC_12–DOC_15, DOC_18');
  });

  it('ordena, quita repetidos y no hace rangos de dos', () => {
    expect(formatDocRanges([5, 1, 2, 5, 9, 8, 7])).toBe('DOC_01, DOC_02, DOC_05, DOC_07–DOC_09');
  });

  it('devuelve una cadena vacía si no hay códigos', () => {
    expect(formatDocRanges([])).toBe('');
  });
});
