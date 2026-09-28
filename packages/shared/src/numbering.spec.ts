import { describe, expect, it } from 'vitest';
import { assignDocCodes, formatDocCode, formatDocRanges } from './numbering.js';

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

describe('assignDocCodes', () => {
  it('numera primero los requisitos y después los justificantes, sin repetir documentos', () => {
    const result = assignDocCodes({
      requirementDocumentIds: ['titulo', 'certificacion'],
      meritDocumentIds: [['certificacion'], ['articulo', 'contrato'], ['contrato', 'patente']],
    });
    expect(result).toEqual([
      { documentId: 'titulo', code: 1, block: 5 },
      { documentId: 'certificacion', code: 2, block: 5 },
      { documentId: 'articulo', code: 3, block: 6 },
      { documentId: 'contrato', code: 4, block: 6 },
      { documentId: 'patente', code: 5, block: 6 },
    ]);
  });

  it('no deja huecos aunque no haya requisitos', () => {
    const result = assignDocCodes({ requirementDocumentIds: [], meritDocumentIds: [['a'], ['b']] });
    expect(result.map((doc) => doc.code)).toEqual([1, 2]);
  });
});
