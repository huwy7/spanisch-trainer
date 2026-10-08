import type { Direction } from '../sentences/filter.ts';
import type { Phrase, PhraseCategory, Region } from './types.ts';

/** Stable card ID (SPEC §4): p:<id> for DE → ES, p:r:<id> for ES → DE. */
export const phraseCardId = (id: string, dir: Direction) =>
  dir === 'de-es' ? `p:${id}` : `p:r:${id}`;

/**
 * Phrases for the session in new-card order. Categories are interleaved round-robin, the file
 * order (most common first) holds within a category. No category selected = all categories;
 * `general` phrases are always included.
 */
export function selectPhrases(
  phrases: readonly Phrase[],
  categories: readonly PhraseCategory[],
  regions: readonly Region[],
): Phrase[] {
  const byCat = new Map<PhraseCategory, Phrase[]>();
  for (const p of phrases) {
    if (categories.length && !categories.includes(p.cat)) continue;
    if (p.region !== 'general' && !regions.includes(p.region)) continue;
    const list = byCat.get(p.cat) ?? [];
    list.push(p);
    byCat.set(p.cat, list);
  }
  const lists = [...byCat.values()];
  const total = lists.reduce((n, l) => n + l.length, 0);
  const out: Phrase[] = [];
  for (let i = 0; out.length < total; i++) {
    for (const l of lists) if (i < l.length) out.push(l[i]!);
  }
  return out;
}
