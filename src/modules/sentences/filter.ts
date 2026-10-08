import type { Level, TenseId } from '../conjugation/tenses.ts';
import { tenseMask, type SentenceChunk, type SentenceRow } from './types.ts';

export type Direction = 'de-es' | 'es-de';

/** Stable card ID (SPEC §4): s:<id> for DE → ES, s:r:<id> for ES → DE. */
export const sentenceCardId = (id: number, dir: Direction) =>
  dir === 'de-es' ? `s:${id}` : `s:r:${id}`;

/**
 * Rows for the session in new-card order: levels A2 → B2, each chunk already ordered.
 * With a tense filter, only sentences containing at least one selected tense.
 */
export function selectRows(
  chunks: Partial<Record<Level, SentenceChunk>>,
  levels: readonly Level[],
  tenses: readonly TenseId[],
): SentenceRow[] {
  const mask = tenseMask(tenses);
  const out: SentenceRow[] = [];
  for (const level of ['A2', 'B1', 'B2'] as const) {
    if (!levels.includes(level)) continue;
    for (const row of chunks[level]?.rows ?? []) if (!mask || row[3] & mask) out.push(row);
  }
  return out;
}
