/** Choosing German meanings for a Spanish lemma (docs/spike-report.md §3). */

export interface MeaningCandidates {
  /** Translations of the Spanish entry in de.wiktionary (curated per entry). */
  direct: readonly string[];
  /** German headwords whose translation table lists the Spanish word. */
  reverse: readonly string[];
}

/** Rough German stem for matching inflected forms in sentences (beginnen → beginn). */
export function germanStem(word: string): string {
  const w = word.toLowerCase().replace(/^sich\s+/, '');
  const stem = w.replace(/(ern|eln|en|n)$/, '');
  return stem.length >= 3 ? stem : w;
}

/** Number of German sentences containing a form of `word`. */
export function countMatches(word: string, sentences: readonly (readonly string[])[]): number {
  const stem = germanStem(word);
  const exact = stem === word.toLowerCase();
  let n = 0;
  for (const toks of sentences) {
    if (toks.some((t) => (exact ? t === stem : t.startsWith(stem)))) n++;
  }
  return n;
}

const looksLikeGermanVerb = (w: string) => /^(sich\s+)?[a-zäöüß]+(en|ern|eln|n)$/.test(w);

/**
 * Up to `max` meanings, best first. Candidates are ranked by how often they occur in the
 * German translations of Tatoeba sentences that contain the Spanish lemma.
 */
export function rankMeanings(
  c: MeaningCandidates,
  sentences: readonly (readonly string[])[],
  opts: { verb: boolean; max?: number },
): string[] {
  const max = opts.max ?? 3;
  const seen = new Set<string>();
  const scored: { word: string; score: number; direct: boolean; order: number }[] = [];
  const add = (word: string, direct: boolean) => {
    const w = word.trim();
    const key = w.toLowerCase();
    if (!w || seen.has(key)) return;
    if (opts.verb && !looksLikeGermanVerb(w)) return;
    seen.add(key);
    scored.push({ word: w, score: countMatches(w, sentences), direct, order: scored.length });
  };
  c.direct.forEach((w) => add(w, true));
  c.reverse.forEach((w) => add(w, false));

  const kept = scored.filter((s) => s.direct || s.score > 0);
  const pool = kept.length ? kept : scored;
  return pool
    .sort((a, b) => b.score - a.score || Number(b.direct) - Number(a.direct) || a.order - b.order)
    .slice(0, max)
    .map((s) => s.word);
}
