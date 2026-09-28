import { MERIT_EXAMPLES } from '@docunex/shared';
import { describe, expect, it } from 'vitest';
import { indexSheetDetails } from './details.js';

describe('indexSheetDetails', () => {
  it('pone el índice, el cuartil, la categoría y la posición de los artículos indexados', () => {
    const unindexed = { ...MERIT_EXAMPLES.article, indexed: false, index: null, quartile: null };
    const details = indexSheetDetails([
      { type: 'article', data: MERIT_EXAMPLES.article, documentIds: ['a', 'b'] },
      { type: 'article', data: unindexed, documentIds: ['c'] },
      { type: 'language', data: MERIT_EXAMPLES.language, documentIds: ['d'] },
      {
        type: 'article',
        data: {
          ...MERIT_EXAMPLES.article,
          index: 'other',
          otherIndex: 'MIAR',
          quartile: 'not_included',
          category: null,
          rank: null,
          categoryTotal: null,
        },
        documentIds: ['b'],
      },
    ]);
    expect(Object.fromEntries(details)).toEqual({
      a: 'JCR, Q1, Computer Science, Theory & Methods (12/143)',
      b: 'JCR, Q1, Computer Science, Theory & Methods (12/143); MIAR, No incluido',
    });
  });
});
