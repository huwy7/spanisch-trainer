/** Placement test (SPEC §3 V): blocks of 50 words in frequency order. */

export const BLOCK_SIZE = 50;
/** Below this share of known words in a block, finishing the placement is suggested. */
export const STOP_SUGGESTION = 0.3;
/** Horizontal swipe distance (px) that counts as a decision. */
export const SWIPE_THRESHOLD = 80;

export type Decision = 'known' | 'unknown';

/** Swipe right = known, left = unknown, short moves = no decision. */
export function swipeDecision(dx: number): Decision | null {
  if (dx >= SWIPE_THRESHOLD) return 'known';
  if (dx <= -SWIPE_THRESHOLD) return 'unknown';
  return null;
}

export function blockOf(index: number): { block: number; position: number } {
  return { block: Math.floor(index / BLOCK_SIZE) + 1, position: (index % BLOCK_SIZE) + 1 };
}

export const isBlockEnd = (nextIndex: number) => nextIndex > 0 && nextIndex % BLOCK_SIZE === 0;

export function suggestStop(knownInBlock: number, blockSize = BLOCK_SIZE): boolean {
  return knownInBlock / blockSize < STOP_SUGGESTION;
}

/** Article-free gender label shown next to nouns (el/la would be wrong for el agua). */
export function genderLabel(gender: 'm' | 'f' | 'mf' | undefined): string {
  return gender === 'mf' ? 'm/f' : (gender ?? '');
}

export function posLabel(pos: 'noun' | 'verb' | 'adj' | 'adv' | 'other'): string {
  return { noun: 'Nomen', verb: 'Verb', adj: 'Adjektiv', adv: 'Adverb', other: 'Wort' }[pos];
}
