import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { VocabEntry, VocabFile } from '../../src/modules/vocab/types.ts';
import type { Corpus } from '../corpus.ts';
import type { GermanCandidates } from '../german.ts';
import { tokens } from '../lib/io.ts';
import { rejectSentence, words } from '../sentences/filter.ts';
import { rankMeanings, type MeaningKind } from '../verbs/meanings.ts';

/** SPEC §3 V: top ~8000 lemmas with a German translation. */
export const VOCAB_LIMIT = 8000;
const CANDIDATES = 12000;
const SENTENCES_PER_LEMMA = 300;
const EXAMPLE_WORDS: [number, number] = [4, 12];

/** Most frequent lemmas that can become vocabulary cards (no names, letters only). */
export function vocabCandidates(corpus: Corpus): string[] {
  return [...corpus.lemmaFreq]
    .filter(([l]) => corpus.wikt.info.has(l) && /^\p{L}+$/u.test(l))
    .sort((a, b) => b[1] - a[1])
    .slice(0, CANDIDATES)
    .map(([l]) => l);
}

const kindOf = (pos: string): MeaningKind =>
  pos === 'noun' ? 'noun' : pos === 'verb' ? 'verb' : 'other';

/**
 * Example sentence choice: shortest filtered Tatoeba sentence (4–12 words) in which a token maps
 * to this lemma unambiguously (so "Como una manzana" is no example for the conjunction como).
 */
export function betterExample(
  current: [number, string, string] | undefined,
  candidate: [number, string, string],
): [number, string, string] {
  if (!current) return candidate;
  const a = words(candidate[1]).length;
  const b = words(current[1]).length;
  return a < b || (a === b && candidate[0] < current[0]) ? candidate : current;
}

export async function buildVocab(
  corpus: Corpus,
  german: GermanCandidates,
): Promise<{ file: VocabFile; stats: Record<string, number> }> {
  const { wikt } = corpus;
  const candidates = vocabCandidates(corpus);
  const set = new Set(candidates);
  const lemmasOf = (tok: string) => {
    const ls = new Set<string>();
    if (set.has(tok)) ls.add(tok);
    for (const l of wikt.formLemmas.get(tok) ?? []) if (set.has(l)) ls.add(l);
    return ls;
  };

  // evidence: German translations of sentences containing the lemma; examples
  const df = new Map<string, number>();
  const evidence = new Map<string, string[][]>();
  const examples = new Map<string, [number, string, string]>();
  for (const p of corpus.pairs) {
    const deTokens = tokens(p.de);
    for (const t of new Set(deTokens)) df.set(t, (df.get(t) ?? 0) + 1);
    const n = words(p.es).length;
    const exampleOk = n >= EXAMPLE_WORDS[0] && n <= EXAMPLE_WORDS[1] && !rejectSentence(p.es, wikt);
    for (const tok of new Set(tokens(p.es))) {
      const ls = lemmasOf(tok);
      for (const l of ls) {
        const list = evidence.get(l) ?? [];
        if (list.length < SENTENCES_PER_LEMMA) list.push(deTokens);
        evidence.set(l, list);
      }
      if (exampleOk && ls.size === 1) {
        const l = [...ls][0]!;
        examples.set(l, betterExample(examples.get(l), [p.id, p.es, p.de]));
      }
    }
  }

  const overrides = await loadVocabOverrides();
  const out: VocabEntry[] = [];
  let withMeaning = 0;
  for (const lemma of candidates) {
    if (out.length >= VOCAB_LIMIT) break;
    if (overrides.get(lemma) === null) continue;
    const info = wikt.info.get(lemma)!;
    const de =
      overrides.get(lemma) ??
      rankMeanings(
        { direct: german.direct.get(lemma) ?? [], reverse: german.reverse.get(lemma) ?? [] },
        {
          sentences: evidence.get(lemma) ?? [],
          total: corpus.pairs.length,
          df: (t) => df.get(t) ?? 0,
        },
        { kind: kindOf(info.pos) },
      );
    if (!de.length) continue;
    withMeaning++;
    const ex = examples.get(lemma);
    out.push({
      lemma,
      pos: info.pos,
      ...(info.gender ? { gender: info.gender } : {}),
      de,
      rank: out.length + 1,
      ...(ex ? { ex } : {}),
    });
  }
  return {
    file: { version: 1, words: out },
    stats: {
      candidates: candidates.length,
      exported: out.length,
      withMeaning,
      withExample: out.filter((w) => w.ex).length,
      nouns: out.filter((w) => w.pos === 'noun').length,
      nounsWithGender: out.filter((w) => w.gender).length,
      depthRank: candidates.indexOf(out.at(-1)?.lemma ?? '') + 1,
    },
  };
}

export function validateVocab(
  file: VocabFile,
  lex: Parameters<typeof rejectSentence>[1],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const w of file.words) {
    if (seen.has(w.lemma)) errors.push(`duplicate ${w.lemma}`);
    seen.add(w.lemma);
    if (!w.de.length) errors.push(`${w.lemma}: no meaning`);
    if (w.ex && rejectSentence(w.ex[1], lex))
      errors.push(`${w.lemma}: example violates the sentence filter`);
  }
  return errors;
}

const OVERRIDES_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'curated',
  'vocab-meanings.json',
);

/** data/curated/vocab-meanings.json: list replaces meanings, null removes the word. */
export async function loadVocabOverrides(): Promise<Map<string, string[] | null>> {
  const raw = JSON.parse(await readFile(OVERRIDES_FILE, 'utf8')) as Record<string, unknown>;
  const map = new Map<string, string[] | null>();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (v !== null && !(Array.isArray(v) && v.length && v.every((x) => typeof x === 'string'))) {
      throw new Error(`vocab-meanings.json: invalid entry for ${k}`);
    }
    map.set(k, v as string[] | null);
  }
  return map;
}
