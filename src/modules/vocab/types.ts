/**
 * Shared data format of public/data/vocab.json (module V, SPEC §3).
 * Erasable TypeScript only: also imported by the Node pipeline.
 */

export type WordClass = 'noun' | 'verb' | 'adj' | 'adv' | 'other';
export type Gender = 'm' | 'f' | 'mf';

export interface VocabEntry {
  /** Spanish lemma; stable card ID `v:<lemma>` (SPEC §4). */
  lemma: string;
  pos: WordClass;
  gender?: Gender;
  /** German meanings, best first (1–3). */
  de: string[];
  /** Frequency rank within the list (1 = most frequent). */
  rank: number;
  /** Example sentence: [Tatoeba ID, Spanish, German]. */
  ex?: [number, string, string];
}

export interface VocabFile {
  version: 1;
  words: VocabEntry[];
}

export const vocabCardId = (lemma: string) => `v:${lemma}`;
