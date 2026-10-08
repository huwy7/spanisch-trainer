import {
  PERSONS,
  SIMPLE_TENSES,
  type VerbEntry,
  type VerbsFile,
} from '../../src/modules/conjugation/types.ts';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Corpus } from '../corpus.ts';
import type { GermanCandidates } from '../german.ts';
import { tokens } from '../lib/io.ts';
import { rankMeanings } from './meanings.ts';
import { classify } from './regular.ts';

/** Number of verbs exported (most frequent first). */
export const VERB_LIMIT = 1000;
/** Auxiliaries required by the engine (composed tenses). */
const REQUIRED = ['haber', 'ir'];
/** German sentences kept per verb for ranking meanings. */
const SENTENCES_PER_VERB = 300;

export interface VerbBuildStats {
  parsedVerbs: number;
  withFrequency: number;
  withMeaning: number;
  exported: number;
  irregular: number;
  spellingOnly: number;
}

/** Verbs considered for export: complete tables, most frequent first (2× the limit). */
export function verbCandidates(corpus: Corpus): string[] {
  return [...corpus.wikt.verbs.keys()]
    .filter((inf) => corpus.lemmaFreq.has(inf))
    .sort((a, b) => corpus.lemmaFreq.get(b)! - corpus.lemmaFreq.get(a)!)
    .slice(0, VERB_LIMIT * 2);
}

export async function buildVerbs(
  corpus: Corpus,
  german: GermanCandidates,
): Promise<{ file: VerbsFile; stats: VerbBuildStats }> {
  const { verbs: parsed } = corpus.wikt;
  const candidates = verbCandidates(corpus);
  const candidateSet = new Set(candidates);
  for (const r of REQUIRED)
    if (!candidateSet.has(r)) throw new Error(`required verb missing: ${r}`);

  // 3. German candidates (de.wiktionary, loaded once for all modules)
  const { direct, reverse } = german;

  // 4. Tatoeba: German translations of sentences containing a form of each verb
  const formToVerb = new Map<string, string>();
  for (const inf of candidates) {
    const v = parsed.get(inf)!;
    const all = [
      inf,
      v.participle,
      v.gerund,
      ...v.subjImperfSe,
      ...SIMPLE_TENSES.flatMap((t) => v.forms[t]),
    ];
    for (const f of all) if (f && !formToVerb.has(f)) formToVerb.set(f, inf);
  }
  const df = new Map<string, number>();
  for (const { de } of corpus.pairs) {
    for (const t of new Set(tokens(de))) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const verbSentences = new Map<string, string[][]>();
  for (const { es, de } of corpus.pairs) {
    const verbs = new Set(
      tokens(es)
        .map((t) => formToVerb.get(t))
        .filter((v): v is string => !!v),
    );
    if (!verbs.size) continue;
    const deTokens = tokens(de);
    for (const v of verbs) {
      const list = verbSentences.get(v) ?? [];
      if (list.length < SENTENCES_PER_VERB) list.push(deTokens);
      verbSentences.set(v, list);
    }
  }

  // 5. assemble (curated overrides win over generated meanings)
  const overrides = await loadMeaningOverrides();
  const verbs: VerbEntry[] = [];
  let withMeaning = 0;
  for (const inf of candidates) {
    if (overrides.get(inf) === null) continue;
    const de =
      overrides.get(inf) ??
      rankMeanings(
        { direct: direct.get(inf) ?? [], reverse: reverse.get(inf) ?? [] },
        {
          sentences: verbSentences.get(inf) ?? [],
          total: corpus.pairs.length,
          df: (t) => df.get(t) ?? 0,
        },
        { kind: 'verb' },
      );
    if (!de.length) continue;
    withMeaning++;
    if (verbs.length >= VERB_LIMIT && !REQUIRED.includes(inf)) continue;
    const v = parsed.get(inf)!;
    verbs.push({ ...v, de, rank: verbs.length + 1, ...classify(v) });
  }
  for (const r of REQUIRED)
    if (!verbs.some((v) => v.inf === r)) throw new Error(`required verb without meaning: ${r}`);

  const stats: VerbBuildStats = {
    parsedVerbs: parsed.size,
    withFrequency: candidates.length,
    withMeaning,
    exported: verbs.length,
    irregular: verbs.filter((v) => v.irregular).length,
    spellingOnly: verbs.filter((v) => v.spelling).length,
  };
  return { file: { version: 1, verbs }, stats };
}

/** Sanity checks before the file is written; the build fails on violations. */
export function validateVerbs(file: VerbsFile): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const v of file.verbs) {
    if (seen.has(v.inf)) errors.push(`duplicate verb ${v.inf}`);
    seen.add(v.inf);
    if (!v.de.length) errors.push(`${v.inf}: no German meaning`);
    for (const t of SIMPLE_TENSES) {
      PERSONS.forEach((p, i) => {
        const f = v.forms[t][i];
        const shouldExist = !(t === 'imp_aff' && p === '1s');
        if (shouldExist && !f) errors.push(`${v.inf} ${t} ${p}: missing`);
        if (!shouldExist && f) errors.push(`${v.inf} ${t} ${p}: must be empty`);
        if (f && /\s/.test(f)) errors.push(`${v.inf} ${t} ${p}: contains space`);
        if (f && /(áis|éis|ís)$/.test(f))
          errors.push(`${v.inf} ${t} ${p}: looks like vosotros (${f})`);
      });
    }
  }
  return errors;
}

const OVERRIDES_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'curated',
  'verb-meanings.json',
);

/** data/curated/verb-meanings.json: list replaces meanings, null removes the verb. */
export async function loadMeaningOverrides(): Promise<Map<string, string[] | null>> {
  const raw = JSON.parse(await readFile(OVERRIDES_FILE, 'utf8')) as Record<string, unknown>;
  const map = new Map<string, string[] | null>();
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue;
    if (v !== null && !(Array.isArray(v) && v.length && v.every((x) => typeof x === 'string'))) {
      throw new Error(`verb-meanings.json: invalid entry for ${k}`);
    }
    map.set(k, v as string[] | null);
  }
  return map;
}
