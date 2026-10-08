/**
 * Shared data format of the sentence chunks (module S, SPEC §3, §6).
 * Erasable TypeScript only: also imported by the Node pipeline.
 */
import { TENSE_IDS, type Level, type TenseId } from '../conjugation/tenses.ts';

/** One sentence: [Tatoeba ID, Spanish, German, tense bitmask (bit i = TENSE_IDS[i])]. */
export type SentenceRow = [number, string, string, number];

export interface SentenceChunk {
  version: 1;
  level: Level;
  /** In the order new cards are introduced. */
  rows: SentenceRow[];
}

export function tenseMask(tenses: Iterable<TenseId>): number {
  let mask = 0;
  for (const t of tenses) mask |= 1 << TENSE_IDS.indexOf(t);
  return mask;
}

export function tensesOf(mask: number): TenseId[] {
  return TENSE_IDS.filter((_, i) => mask & (1 << i));
}

/** Chunk file name pattern in public/data (hash makes it immutable for caching). */
export const SENTENCE_CHUNK = /^sentences-(A2|B1|B2)\.[0-9a-f]+\.json$/;
