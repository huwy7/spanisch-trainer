import {
  PERSONS,
  SIMPLE_TENSES,
  type VerbEntry,
  type VerbsFile,
} from '../../src/modules/conjugation/types.ts';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { lemmaFrequencies, parseFrequencyLine } from '../frequency.ts';
import { lines, tokens } from '../lib/io.ts';
import { sourceFile } from '../sources.ts';
import { rankMeanings } from './meanings.ts';
import { classify } from './regular.ts';
import { isReflexive, parseVerb, type ParsedVerb, type WiktEntry } from './wiktionary.ts';

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

export async function buildVerbs(
  log: (s: string) => void,
): Promise<{ file: VerbsFile; stats: VerbBuildStats }> {
  // 1. en.wiktionary: lemmas, form → lemma map, verb tables
  const lemmas = new Set<string>();
  const formLemmas = new Map<string, string[]>();
  const parsed = new Map<string, ParsedVerb>();
  const addForm = (form: string, lemma: string) => {
    const list = formLemmas.get(form);
    if (!list) formLemmas.set(form, [lemma]);
    else if (!list.includes(lemma)) list.push(lemma);
  };
  for await (const line of lines(sourceFile('enWiktionary'))) {
    const e = JSON.parse(line) as WiktEntry;
    if (e.lang_code !== 'es' || !e.word || !e.pos) continue;
    const word = e.word.toLowerCase();
    const senses = e.senses ?? [];
    if (senses.length && senses.every((s) => s.form_of?.length)) {
      for (const s of senses) for (const f of s.form_of ?? []) addForm(word, f.word.toLowerCase());
      continue;
    }
    if (e.pos === 'name') continue;
    lemmas.add(word);
    for (const f of e.forms ?? []) {
      const form = f.form?.toLowerCase();
      if (form && !form.includes(' ')) addForm(form, word);
    }
    if (e.pos === 'verb' && !isReflexive(word) && !parsed.has(word)) {
      const v = parseVerb(e);
      if (v) parsed.set(word, v);
    }
  }
  log(`verbs: ${parsed.size} complete non-reflexive verb tables`);

  // 2. frequency
  const rows: { form: string; count: number }[] = [];
  for await (const line of lines(sourceFile('frequency'))) {
    const r = parseFrequencyLine(line);
    if (r) rows.push(r);
  }
  const freq = lemmaFrequencies(
    rows,
    (w) => lemmas.has(w),
    (f) => formLemmas.get(f) ?? [],
  );
  const candidates = [...parsed.keys()]
    .filter((inf) => freq.has(inf))
    .sort((a, b) => freq.get(b)! - freq.get(a)!)
    .slice(0, VERB_LIMIT * 2);
  const candidateSet = new Set(candidates);
  for (const r of REQUIRED)
    if (!candidateSet.has(r)) throw new Error(`required verb missing: ${r}`);

  // 3. de.wiktionary: German candidates
  const direct = new Map<string, string[]>();
  const reverseRaw = new Map<string, { word: string; pos: number }[]>();
  for await (const line of lines(sourceFile('deWiktionary'))) {
    // cheap pre-filter: skip lines without Spanish content
    if (!line.includes('"es"')) continue;
    const e = JSON.parse(line) as WiktEntry;
    if (!e.word) continue;
    if (e.lang_code === 'es') {
      const w = e.word.toLowerCase();
      if (!candidateSet.has(w)) continue;
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
        if (candidateSet.has(w)) {
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
  const links = new Map<number, number>();
  for await (const line of lines(sourceFile('tatoebaLinks'))) {
    const [a, b] = line.split('\t').map(Number);
    if (a && b && !links.has(a)) links.set(a, b);
  }
  const deText = new Map<number, string>();
  const deIds = new Set(links.values());
  for await (const line of lines(sourceFile('tatoebaDeu'))) {
    const [id, , text] = line.split('\t');
    if (id && text && deIds.has(Number(id))) deText.set(Number(id), text);
  }
  const df = new Map<string, number>();
  for (const text of deText.values()) {
    for (const t of new Set(tokens(text))) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const verbSentences = new Map<string, string[][]>();
  for await (const line of lines(sourceFile('tatoebaSpa'))) {
    const [id, , text] = line.split('\t');
    const de = deText.get(links.get(Number(id)) ?? 0);
    if (!text || !de) continue;
    const verbs = new Set(
      tokens(text)
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
        { sentences: verbSentences.get(inf) ?? [], total: deText.size, df: (t) => df.get(t) ?? 0 },
        { verb: true },
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
