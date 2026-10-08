import { lines } from './lib/io.ts';
import { sourceFile } from './sources.ts';
import type { WiktEntry } from './verbs/wiktionary.ts';

/** German translation candidates per Spanish lemma (docs/spike-report.md §3). */
export interface GermanCandidates {
  /** Translations listed in the Spanish entry of de.wiktionary. */
  direct: Map<string, string[]>;
  /** German headwords whose translation table lists the Spanish word, main translations first. */
  reverse: Map<string, string[]>;
}

/** One pass over de.wiktionary (~300 MB) for all requested Spanish words. */
export async function loadGerman(words: ReadonlySet<string>): Promise<GermanCandidates> {
  const direct = new Map<string, string[]>();
  const reverseRaw = new Map<string, { word: string; pos: number }[]>();
  for await (const line of lines(sourceFile('deWiktionary'))) {
    if (!line.includes('"es"')) continue; // cheap pre-filter
    const e = JSON.parse(line) as WiktEntry;
    if (!e.word) continue;
    if (e.lang_code === 'es') {
      const w = e.word.toLowerCase();
      if (!words.has(w)) continue;
      const list = direct.get(w) ?? [];
      for (const t of e.translations ?? []) {
        if ((t.lang_code ?? t.code) === 'de' && t.word && !list.includes(t.word)) list.push(t.word);
      }
      direct.set(w, list);
    } else if (e.lang_code === 'de') {
      // position of the Spanish word among the Spanish translations of this German entry
      let pos = 0;
      for (const t of e.translations ?? []) {
        if ((t.lang_code ?? t.code) !== 'es' || !t.word) continue;
        const w = t.word.toLowerCase();
        if (words.has(w)) {
          const list = reverseRaw.get(w) ?? [];
          if (!list.some((x) => x.word === e.word)) list.push({ word: e.word, pos });
          reverseRaw.set(w, list);
        }
        pos++;
      }
    }
  }
  const reverse = new Map(
    [...reverseRaw].map(([k, list]) => [k, list.sort((a, b) => a.pos - b.pos).map((x) => x.word)]),
  );
  return { direct, reverse };
}
