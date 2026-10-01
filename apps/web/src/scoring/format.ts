import { formatPoints, type ScoreRange } from '@docunex/shared';

/** `{ min: 0.5, max: 2 }` → `0,5 – 2`; un solo número si coinciden. */
export function formatRange(range: ScoreRange): string {
  return range.min === range.max
    ? formatPoints(range.max)
    : `${formatPoints(range.min)} – ${formatPoints(range.max)}`;
}
