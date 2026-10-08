import { TENSES, type Level, type TenseId } from '../../src/modules/conjugation/tenses.ts';

const ORDER: Level[] = ['A2', 'B1', 'B2'];
const max = (...ls: Level[]) => ORDER[Math.max(...ls.map((l) => ORDER.indexOf(l)))]!;

/** Vocabulary signal: frequency rank of the rarest content word. */
export function rarityLevel(rarestRank: number): Level {
  if (rarestRank <= 1500) return 'A2';
  if (rarestRank <= 4000) return 'B1';
  return 'B2';
}

export function lengthLevel(words: number): Level {
  if (words <= 8) return 'A2';
  if (words <= 14) return 'B1';
  return 'B2';
}

/** SPEC §6: level = max(tense level, vocabulary level, length level). An approximation. */
export function sentenceLevel(tenses: Iterable<TenseId>, rarestRank: number, words: number): Level {
  const tenseLevels = [...tenses].map((t) => TENSES[t].level);
  return max('A2', ...tenseLevels, rarityLevel(rarestRank), lengthLevel(words));
}
