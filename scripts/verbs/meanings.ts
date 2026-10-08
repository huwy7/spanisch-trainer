/** Choosing German meanings for a Spanish lemma (docs/spike-report.md §3). */

export interface MeaningCandidates {
  /** Translations of the Spanish entry in de.wiktionary (curated per entry). */
  direct: readonly string[];
  /**
   * German headwords whose translation table lists the Spanish word, best first
   * (sorted by the position of the Spanish word in that table: main translations come first).
   */
  reverse: readonly string[];
}

/** Statistics of the German side of the corpus, for IDF weighting. */
export interface Corpus {
  /** German sentences (tokens) that translate a Spanish sentence containing the lemma. */
  sentences: readonly (readonly string[])[];
  /** Number of German sentences in the whole corpus. */
  total: number;
  /** Document frequency of a German token in the whole corpus. */
  df: (token: string) => number;
}

const VERB_SUFFIXES = ['', 'e', 'st', 't', 'en', 'et', 'te', 'test', 'ten', 'tet', 'end', 'n'];

/** Inflected forms of a German word that are matched in sentences. */
export function germanForms(word: string): Set<string> {
  const w = word.toLowerCase().replace(/^sich\s+/, '');
  const forms = new Set([w]);
  const m = /^(.*?)(ern|eln|en|n)$/.exec(w);
  if (m && m[1]!.length >= 2) {
    const stem = m[2] === 'ern' || m[2] === 'eln' ? m[1]! + m[2]!.slice(0, 2) : m[1]!;
    for (const s of VERB_SUFFIXES) forms.add(stem + s);
    forms.add(`ge${stem}t`);
    forms.add(`ge${stem}en`);
    if (stem.endsWith('ier')) forms.add(`${stem}t`); // passiert, interessiert
  }
  return forms;
}

/** Number of sentences containing a form of `word`. */
export function countMatches(word: string, sentences: readonly (readonly string[])[]): number {
  const forms = germanForms(word);
  let n = 0;
  for (const toks of sentences) if (toks.some((t) => forms.has(t))) n++;
  return n;
}

const looksLikeGermanVerb = (w: string) => /^(sich\s+)?[a-zäöüß]+(en|ern|eln|n)$/.test(w);

/** Which German candidates fit the Spanish word class. */
export type MeaningKind = 'verb' | 'noun' | 'other';
const FITS: Record<MeaningKind, (w: string) => boolean> = {
  verb: looksLikeGermanVerb,
  noun: (w) => /^[A-ZÄÖÜ]/.test(w),
  other: (w) => /^[a-zäöüß]/.test(w),
};

/**
 * Up to `max` meanings, best first.
 * Score: co-occurrence in German translations × IDF (frequent words like "sein" weigh less).
 * Without evidence, the order of the translation tables decides (direct first, then reverse
 * by position), so a main translation beats a marginal one.
 */
export function rankMeanings(
  c: MeaningCandidates,
  corpus: Corpus,
  opts: { kind: MeaningKind; max?: number },
): string[] {
  const max = opts.max ?? 3;
  const seen = new Set<string>();
  const scored: { word: string; score: number; order: number }[] = [];
  const add = (word: string) => {
    const w = word.trim();
    const key = w.toLowerCase();
    if (!w || seen.has(key)) return;
    if (!FITS[opts.kind](w)) return;
    seen.add(key);
    const hits = countMatches(w, corpus.sentences);
    const df = Math.max(...[...germanForms(w)].map(corpus.df), 1);
    const idf = Math.log((corpus.total + 1) / df);
    scored.push({ word: w, score: hits * idf, order: scored.length });
  };
  c.direct.forEach(add);
  c.reverse.forEach(add);

  const withEvidence = scored.filter((s) => s.score > 0);
  if (!withEvidence.length) return scored.slice(0, max).map((s) => s.word);
  return withEvidence
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, max)
    .map((s) => s.word);
}
