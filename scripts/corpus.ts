/**
 * Loads the shared sources once per pipeline run (SPEC §6): en.wiktionary (lemmas, forms,
 * verb tables), Tatoeba ES–DE pairs and the frequency list. Used by all modules' builders.
 */
import { lemmaFrequencies, parseFrequencyLine } from './frequency.ts';
import { lines } from './lib/io.ts';
import { sourceFile } from './sources.ts';
import { isReflexive, parseVerb, type ParsedVerb, type WiktEntry } from './verbs/wiktionary.ts';

export interface Wiktionary {
  /** Spanish lemmas (no proper names). */
  lemmas: Set<string>;
  /** Inflected form → lemmas. */
  formLemmas: Map<string, string[]>;
  /** Proper names (to avoid false matches like Tomás = vos-form of tomar). */
  names: Set<string>;
  /** Complete conjugation tables of non-reflexive verbs. */
  verbs: Map<string, ParsedVerb>;
  /** Word class (and gender of nouns) of each lemma: verbs with a conjugation table are verbs,
   * otherwise the first (main) Wiktionary entry wins, function words before nouns. */
  info: Map<string, LemmaInfo>;
  /** Forms that are unambiguously vosotros / voseo (for the sentence filter, SPEC §2). */
  vosotros: Set<string>;
  voseo: Set<string>;
}

export type WordClass = 'noun' | 'verb' | 'adj' | 'adv' | 'other';
export type Gender = 'm' | 'f' | 'mf';

export interface LemmaInfo {
  pos: WordClass;
  gender?: Gender;
}

const POS: Record<string, WordClass> = { noun: 'noun', verb: 'verb', adj: 'adj', adv: 'adv' };

/** Grammatical gender of a Spanish noun entry (head template arg or expansion "casa f"). */
export function genderOf(e: WiktEntry): Gender | undefined {
  const tpl = e.head_templates?.find((t) => t.name?.startsWith('es-noun'));
  const arg = tpl?.args?.['1'] ?? tpl?.args?.g;
  const fromText = /^\S+ (m or f|mf|m|f)\b/.exec(tpl?.expansion ?? '')?.[1];
  const g = (arg ?? fromText ?? '').replace(/-p$/, '');
  if (g === 'm' || g === 'f') return g;
  if (g === 'mf' || g === 'm or f' || g === 'mfbysense') return 'mf';
  const tags = e.tags ?? [];
  if (tags.includes('masculine') && tags.includes('feminine')) return 'mf';
  if (tags.includes('masculine')) return 'm';
  if (tags.includes('feminine')) return 'f';
  return undefined;
}

/** Closed-class and adverb entries: a word that is one of these is not a card as a noun. */
const FUNCTION_POS = new Set([
  'adv',
  'prep',
  'pron',
  'conj',
  'det',
  'article',
  'particle',
  'intj',
  'num',
  'contraction',
]);

/**
 * Whether a later Wiktionary entry replaces the stored word class. The first entry wins, except
 * that a function word beats a noun reading (letter names: de, te, ese; el no).
 */
export const replacesInfo = (prev: LemmaInfo, nextPos: string) =>
  prev.pos === 'noun' && FUNCTION_POS.has(nextPos);

export interface SentencePair {
  /** Tatoeba ID of the Spanish sentence (stable card ID for sentence cards). */
  id: number;
  es: string;
  de: string;
}

export interface Corpus {
  wikt: Wiktionary;
  pairs: SentencePair[];
  frequency: { form: string; count: number }[];
  /** Lemma → occurrences in the frequency list (forms aggregated). */
  lemmaFreq: Map<string, number>;
}

export async function loadWiktionary(): Promise<Wiktionary> {
  const w: Wiktionary = {
    lemmas: new Set(),
    formLemmas: new Map(),
    names: new Set(),
    verbs: new Map(),
    info: new Map(),
    vosotros: new Set(),
    voseo: new Set(),
  };
  // per form: seen as vosotros / voseo / anything else
  const flags = new Map<string, number>();
  const VOS = 1;
  const VOSEO = 2;
  const OTHER = 4;
  const flag = (form: string, f: number) => flags.set(form, (flags.get(form) ?? 0) | f);
  const addForm = (form: string, lemma: string) => {
    const list = w.formLemmas.get(form);
    if (!list) w.formLemmas.set(form, [lemma]);
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
    if (e.pos === 'name') {
      w.names.add(word);
      continue;
    }
    w.lemmas.add(word);
    const pos = POS[e.pos] ?? 'other';
    const prev = w.info.get(word);
    if (!prev || replacesInfo(prev, e.pos)) {
      w.info.set(word, pos === 'noun' ? { pos, gender: genderOf(e) } : { pos });
    }
    for (const f of e.forms ?? []) {
      const form = f.form?.toLowerCase();
      if (!form || form.includes(' ')) continue;
      addForm(form, word);
      const tags = f.tags ?? [];
      flag(form, isVosotrosTags(tags) ? VOS : isVoseoTags(tags) ? VOSEO : OTHER);
    }
    if (e.pos === 'verb' && !isReflexive(word) && !w.verbs.has(word)) {
      const v = parseVerb(e);
      if (v) w.verbs.set(word, v);
    }
  }
  // infinitives used as nouns (el poder, el ser) are secondary: the verb reading wins
  for (const inf of w.verbs.keys()) w.info.set(inf, { pos: 'verb' });
  for (const [form, f] of flags) {
    const ambiguous = f & OTHER || w.lemmas.has(form) || w.names.has(form);
    if (ambiguous) continue;
    if (f & VOS) w.vosotros.add(form);
    else if (f & VOSEO) w.voseo.add(form);
  }
  return w;
}

/** Tags of a vosotros form (2nd person plural, not the formal ustedes). */
export const isVosotrosTags = (tags: readonly string[]) =>
  tags.includes('second-person') &&
  tags.includes('plural') &&
  !tags.includes('formal') &&
  !tags.includes('third-person');

export const isVoseoTags = (tags: readonly string[]) =>
  tags.includes('vos-form') || tags.includes('voseo');

/** Spanish sentences with their first direct German translation. */
export async function loadTatoeba(): Promise<SentencePair[]> {
  const links = new Map<number, number>();
  for await (const line of lines(sourceFile('tatoebaLinks'))) {
    const [a, b] = line.split('\t').map(Number);
    if (a && b && !links.has(a)) links.set(a, b);
  }
  const deIds = new Set(links.values());
  const deText = new Map<number, string>();
  for await (const line of lines(sourceFile('tatoebaDeu'))) {
    const [id, , text] = line.split('\t');
    if (id && text && deIds.has(Number(id))) deText.set(Number(id), text);
  }
  const pairs: SentencePair[] = [];
  for await (const line of lines(sourceFile('tatoebaSpa'))) {
    const [id, , es] = line.split('\t');
    const de = deText.get(links.get(Number(id)) ?? 0);
    if (id && es && de) pairs.push({ id: Number(id), es, de });
  }
  return pairs;
}

export async function loadFrequency(): Promise<{ form: string; count: number }[]> {
  const rows: { form: string; count: number }[] = [];
  for await (const line of lines(sourceFile('frequency'))) {
    const r = parseFrequencyLine(line);
    if (r) rows.push(r);
  }
  return rows;
}

export async function loadCorpus(log: (s: string) => void): Promise<Corpus> {
  const [wikt, pairs, frequency] = await Promise.all([
    loadWiktionary(),
    loadTatoeba(),
    loadFrequency(),
  ]);
  const lemmaFreq = lemmaFrequencies(
    frequency,
    (w) => wikt.lemmas.has(w),
    (f) => wikt.formLemmas.get(f) ?? [],
  );
  log(
    `corpus: ${wikt.lemmas.size} lemmas, ${wikt.verbs.size} verb tables, ${pairs.length} ES–DE pairs`,
  );
  return { wikt, pairs, frequency, lemmaFreq };
}
