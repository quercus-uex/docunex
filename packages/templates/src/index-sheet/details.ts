import type { MeritData, MeritType } from '@docunex/shared';
import { articleIndexing, articleRank } from '../format.js';

/**
 * Segunda línea de cada documento en la hoja índice: el cuartil de los artículos indexados que
 * justifica (las instrucciones piden que conste también ahí).
 */
export function indexSheetDetails(
  merits: readonly { type: MeritType; data: unknown; documentIds: readonly string[] }[],
): Map<string, string> {
  const lines = new Map<string, string[]>();
  for (const merit of merits) {
    if (merit.type !== 'article') continue;
    const data = merit.data as MeritData<'article'>;
    const indexing = articleIndexing(data);
    if (!indexing) continue;
    const rank = articleRank(data);
    const line = rank ? `${indexing} (${rank})` : indexing;
    for (const id of merit.documentIds) {
      const current = lines.get(id) ?? [];
      if (!current.includes(line)) lines.set(id, [...current, line]);
    }
  }
  return new Map([...lines].map(([id, entries]) => [id, entries.join('; ')]));
}
