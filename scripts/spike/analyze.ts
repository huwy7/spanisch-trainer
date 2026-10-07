/**
 * M0b data spike (SPEC §7). Downloads the candidate sources, measures them and
 * prints a Markdown report. Runs in GitHub Actions; not part of the app build.
 */
import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { CACHE_DIR, download, lines, mb, pct, sample, tokens, type Download } from './lib.ts';

const SRC = {
  spa: 'https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2',
  deu: 'https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2',
  links: 'https://downloads.tatoeba.org/exports/per_language/spa/spa-deu_links.tsv.bz2',
  enwikt: 'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl',
  dewikt: 'https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz',
  freq: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
  // CC BY-NC-SA: only used here as an independent reference, never shipped.
  jehle:
    'https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv',
};

const out: string[] = [];
const say = (s = '') => {
  out.push(s);
  console.log(s);
};
const t0 = performance.now();
const elapsed = () => `${((performance.now() - t0) / 1000).toFixed(0)} s`;

// ---------------------------------------------------------------- downloads

say('# M0b – Daten-Spike (automatischer Bericht)');
say();
say('## Downloads');
say();
say('| Quelle | Grösse | Dauer |');
say('|---|---|---|');
const dl: Record<keyof typeof SRC, Download> = {} as never;
for (const [key, url] of Object.entries(SRC) as [keyof typeof SRC, string][]) {
  const name = url.split('/').pop()!;
  dl[key] = await download(url, `${key}-${name}`);
  say(`| ${key} | ${mb(dl[key].bytes)} | ${dl[key].seconds.toFixed(1)} s |`);
}
const totalBytes = Object.values(dl).reduce((s, d) => s + d.bytes, 0);
say(`| **Total** | **${mb(totalBytes)}** | ${elapsed()} |`);

// ------------------------------------------------- en.wiktionary (Spanish)

type Tags = string[];
interface FormInfo {
  lemmas: Set<string>;
  tagSets: Tags[];
}
const lemmaPos = new Map<string, Set<string>>(); // lemma -> POS
const forms = new Map<string, FormInfo>(); // inflected form -> info
const addForm = (form: string, lemma: string, tags: Tags) => {
  const f = form.toLowerCase();
  let info = forms.get(f);
  if (!info) forms.set(f, (info = { lemmas: new Set(), tagSets: [] }));
  info.lemmas.add(lemma);
  if (tags.length) info.tagSets.push(tags);
};

interface WiktEntry {
  word?: string;
  pos?: string;
  lang_code?: string;
  senses?: { glosses?: string[]; tags?: string[]; form_of?: { word: string }[] }[];
  forms?: { form: string; tags?: string[] }[];
  translations?: { lang_code?: string; code?: string; word?: string }[];
}

type Person = '1s' | '2s' | '3s' | '1p' | '3p';
/** Person without vosotros and voseo; usted/ustedes count as 3s/3p. */
function personOf(tags: Tags): Person | null {
  const t = new Set(tags);
  if (t.has('vos-form') || t.has('voseo')) return null;
  const sg = t.has('singular');
  const pl = t.has('plural');
  if (t.has('first-person')) return sg ? '1s' : pl ? '1p' : null;
  if (t.has('third-person')) return sg ? '3s' : pl ? '3p' : null;
  if (t.has('second-person')) {
    if (t.has('formal')) return sg ? '3s' : pl ? '3p' : null;
    return sg ? '2s' : null;
  }
  return null;
}

const names = new Set<string>(); // proper names (to avoid false vosotros/voseo hits)
const verbTables = new Map<string, Map<string, Set<string>>>(); // lemma -> "tense:person" -> forms

const SKIP_POS = new Set(['name', 'character', 'symbol', 'suffix', 'prefix', 'infix', 'affix']);
let enEntries = 0;
let printedVerbSample = false;
for await (const line of lines(dl.enwikt.file)) {
  if (!line) continue;
  const e = JSON.parse(line) as WiktEntry;
  enEntries++;
  if (e.lang_code !== 'es' || !e.word || !e.pos) continue;
  const word = e.word.toLowerCase();
  const senses = e.senses ?? [];
  const formOf = senses.flatMap((s) => s.form_of?.map((f) => f.word.toLowerCase()) ?? []);
  const isFormOnly = senses.length > 0 && senses.every((s) => s.form_of?.length);
  if (isFormOnly) {
    for (const l of formOf) addForm(word, l, []);
    continue;
  }
  if (e.pos === 'name') names.add(word);
  if (SKIP_POS.has(e.pos)) continue;
  if (e.pos === 'verb') {
    let table = verbTables.get(word);
    if (!table) verbTables.set(word, (table = new Map()));
    for (const f of e.forms ?? []) {
      if (!f.form || f.form.includes(' ') || !f.tags) continue;
      const tense = tenseOf(f.tags);
      const person = personOf(f.tags);
      if (!tense || !person) continue;
      const key = `${tense}:${person}`;
      let set = table.get(key);
      if (!set) table.set(key, (set = new Set()));
      set.add(f.form.toLowerCase());
    }
  }
  let pos = lemmaPos.get(word);
  if (!pos) lemmaPos.set(word, (pos = new Set()));
  pos.add(e.pos);
  for (const f of e.forms ?? []) {
    if (!f.form || f.form.includes(' ')) continue;
    addForm(f.form, word, f.tags ?? []);
  }
  if (!printedVerbSample && e.pos === 'verb' && word === 'tener') {
    printedVerbSample = true;
    console.log('DEBUG tener forms (first 40):');
    for (const f of (e.forms ?? []).slice(0, 40))
      console.log(`  ${f.form}  [${f.tags?.join(',')}]`);
  }
}
const verbLemmas = [...lemmaPos].filter(([, p]) => p.has('verb')).length;
say();
say('## en.wiktionary (kaikki) – Spanisch');
say();
say(`- Einträge gelesen: ${enEntries.toLocaleString('de-CH')}`);
say(
  `- Lemmata (ohne Eigennamen): ${lemmaPos.size.toLocaleString('de-CH')}, davon Verben: ${verbLemmas.toLocaleString('de-CH')}`,
);
say(`- Formen → Lemma: ${forms.size.toLocaleString('de-CH')}`);
say(`- Zeit: ${elapsed()}`);

// Tense categories used by SPEC §3.
type Tense =
  | 'presente'
  | 'indefinido'
  | 'imperfecto'
  | 'futuro'
  | 'condicional'
  | 'subj_presente'
  | 'subj_imperfecto'
  | 'imperativo';

function tenseOf(tags: Tags): Tense | null {
  const t = new Set(tags);
  if (t.has('imperative')) return 'imperativo';
  if (t.has('subjunctive')) {
    if (t.has('present')) return 'subj_presente';
    if (t.has('imperfect')) return 'subj_imperfecto';
    return null;
  }
  if (t.has('conditional')) return 'condicional';
  if (t.has('future')) return 'futuro';
  if (t.has('preterite')) return 'indefinido';
  if (t.has('imperfect')) return 'imperfecto';
  if (t.has('present') && t.has('indicative')) return 'presente';
  return null;
}

const isVosotros = (tags: Tags) =>
  tags.includes('second-person') &&
  tags.includes('plural') &&
  !tags.includes('formal') &&
  !tags.includes('third-person');
const isVoseo = (tags: Tags) => tags.some((t) => t === 'voseo' || t === 'vos-form');

const vosotrosForms = new Set<string>();
const voseoForms = new Set<string>();
const formTenses = new Map<string, Set<Tense>>();
for (const [form, info] of forms) {
  if (!info.tagSets.length) continue;
  const all = info.tagSets;
  const unambiguous = !lemmaPos.has(form) && !names.has(form);
  if (unambiguous && all.every(isVosotros)) vosotrosForms.add(form);
  if (unambiguous && all.every(isVoseo)) voseoForms.add(form);
  const tenses = new Set(
    all
      .filter((t) => !isVosotros(t) && !isVoseo(t))
      .map(tenseOf)
      .filter((t): t is Tense => t !== null),
  );
  if (tenses.size) formTenses.set(form, tenses);
}
for (const f of ['tengo', 'es', 'está', 'quiera', 'vengas', 'hable']) {
  console.log(
    `DEBUG ${f}: lemmas=${[...(forms.get(f)?.lemmas ?? [])].join(',')} tenses=${[...(formTenses.get(f) ?? [])].join(',')} tagSets=${JSON.stringify(forms.get(f)?.tagSets.slice(0, 6))}`,
  );
}
/** Tense of a token if unambiguous; subj_presente/imperativo collisions count as subjunctive. */
function tokenTense(tok: string): Tense | null {
  const ts = formTenses.get(tok);
  if (!ts) return null;
  if (ts.size === 1) return [...ts][0]!;
  if (ts.size === 2 && ts.has('subj_presente') && ts.has('imperativo')) return 'subj_presente';
  return null;
}
const isSubjToken = (tok: string) =>
  [...(formTenses.get(tok) ?? [])].some((t) => t.startsWith('subj'));
for (const w of ['vosotros', 'vosotras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'os']) {
  vosotrosForms.add(w);
}
say(
  `- vosotros-Formen (eindeutig): ${vosotrosForms.size.toLocaleString('de-CH')}, voseo-Formen: ${voseoForms.size.toLocaleString('de-CH')}`,
);
say(`- Formen mit erkannter Zeitform: ${formTenses.size.toLocaleString('de-CH')}`);

// ---------------------------------------------------------------- frequency

const freqRows: { form: string; count: number }[] = [];
for await (const line of lines(dl.freq.file)) {
  const [form, count] = line.split(' ');
  if (form && count) freqRows.push({ form: form.toLowerCase(), count: Number(count) });
}
const lemmaFreq = new Map<string, number>();
let resolved = 0;
let ambiguous = 0;
const unresolvedTop: string[] = [];
for (const [i, { form, count }] of freqRows.entries()) {
  let lemmas: string[];
  if (lemmaPos.has(form)) lemmas = [form];
  else lemmas = [...(forms.get(form)?.lemmas ?? [])].filter((l) => lemmaPos.has(l));
  if (!lemmas.length) {
    if (i < 10000 && unresolvedTop.length < 40) unresolvedTop.push(form);
    continue;
  }
  if (i < 10000) {
    resolved++;
    if (lemmas.length > 1) ambiguous++;
  }
  for (const l of lemmas) lemmaFreq.set(l, (lemmaFreq.get(l) ?? 0) + count / lemmas.length);
}
const rankedLemmas = [...lemmaFreq].sort((a, b) => b[1] - a[1]).map(([l]) => l);
const lemmaRank = new Map(rankedLemmas.map((l, i) => [l, i + 1]));
say();
say('## Häufigkeitsliste (FrequencyWords 2018, OpenSubtitles)');
say();
say(`- Formen: ${freqRows.length.toLocaleString('de-CH')}`);
say(
  `- Top-10'000-Formen einem Lemma zugeordnet: ${pct(resolved, Math.min(10000, freqRows.length))} (mehrdeutig: ${pct(ambiguous, resolved)})`,
);
say(`- Nicht zugeordnet (Beispiele aus Top 10'000): ${unresolvedTop.join(', ')}`);
say(`- Lemmata nach Aggregation: ${rankedLemmas.length.toLocaleString('de-CH')}`);
say(`- Top 30 Lemmata: ${rankedLemmas.slice(0, 30).join(', ')}`);
say(`- Rang 7'980–8'000: ${rankedLemmas.slice(7979, 8000).join(', ')}`);

// --------------------------------------------- de.wiktionary (translations)

const deTrans = new Map<string, Set<string>>(); // es lemma -> German translations (Spanish entries)
const deReverse = new Map<string, Set<string>>(); // es word -> German headwords (translation tables)
const addTo = (m: Map<string, Set<string>>, k: string, v: string) => {
  let set = m.get(k);
  if (!set) m.set(k, (set = new Set()));
  set.add(v);
};
let deEntries = 0;
for await (const line of lines(dl.dewikt.file)) {
  if (!line) continue;
  deEntries++;
  const e = JSON.parse(line) as WiktEntry;
  if (!e.word) continue;
  if (e.lang_code === 'es') {
    for (const t of e.translations ?? []) {
      if ((t.lang_code ?? t.code) === 'de' && t.word) addTo(deTrans, e.word.toLowerCase(), t.word);
    }
  } else if (e.lang_code === 'de') {
    for (const t of e.translations ?? []) {
      if ((t.lang_code ?? t.code) === 'es' && t.word)
        addTo(deReverse, t.word.toLowerCase(), e.word);
    }
  }
}
const hasDe = (l: string) => deTrans.has(l) || deReverse.has(l);
say();
say('## de.wiktionary (kaikki) – deutsche Übersetzungen');
say();
say(`- Einträge gelesen: ${deEntries.toLocaleString('de-CH')}`);
say(`- (A) Spanische Einträge mit deutscher Übersetzung: ${deTrans.size.toLocaleString('de-CH')}`);
say(
  `- (B) Spanische Wörter aus Übersetzungstabellen deutscher Einträge: ${deReverse.size.toLocaleString('de-CH')}`,
);
say();
say('| Top N Lemmata | A | B | A ∪ B |');
say('|---|---|---|---|');
for (const n of [1000, 3000, 8000]) {
  const top = rankedLemmas.slice(0, n);
  const a = top.filter((l) => deTrans.has(l)).length;
  const b = top.filter((l) => deReverse.has(l)).length;
  const ab = top.filter(hasDe).length;
  say(`| ${n} | ${pct(a, top.length)} | ${pct(b, top.length)} | ${pct(ab, top.length)} |`);
}
const translatable = rankedLemmas.filter(hasDe);
const vocab = translatable.slice(0, 8000);
const depth = vocab.length === 8000 ? lemmaRank.get(vocab[7999]!) : undefined;
const dropped = rankedLemmas.slice(0, 8000).filter((l) => !hasDe(l));
say();
say(`- Übersetzbare Lemmata gesamt: ${translatable.length.toLocaleString('de-CH')}`);
say(`- 8000 übersetzbare Lemmata erreicht bei Rang: ${depth ?? 'nicht erreicht'}`);
say(`- In Top 8000 ohne Übersetzung (Beispiele): ${sample(dropped, 40).join(', ')}`);
say();
say('Stichprobe Vokabelliste (A bevorzugt, sonst B):');
say();
for (const l of sample(vocab, 40)) {
  const a = [...(deTrans.get(l) ?? [])].slice(0, 3).join(', ');
  const b = [...(deReverse.get(l) ?? [])].slice(0, 4).join(', ');
  say(`- **${l}** (#${lemmaRank.get(l)}) A: ${a || '–'} · B: ${b || '–'}`);
}
say(`- Zeit: ${elapsed()}`);

// ------------------------------------------------------------------ Tatoeba

const links = new Map<number, number[]>(); // spa id -> deu ids
for await (const line of lines(dl.links.file)) {
  const [a, b] = line.split('\t').map(Number);
  if (!a || !b) continue;
  links.set(a, [...(links.get(a) ?? []), b]);
}
const deuIds = new Set([...links.values()].flat());
const spa = new Map<number, string>();
let spaTotal = 0;
for await (const line of lines(dl.spa.file)) {
  const [id, , text] = line.split('\t');
  spaTotal++;
  if (id && text && links.has(Number(id))) spa.set(Number(id), text);
}
const deu = new Map<number, string>();
let deuTotal = 0;
for await (const line of lines(dl.deu.file)) {
  const [id, , text] = line.split('\t');
  deuTotal++;
  if (id && text && deuIds.has(Number(id))) deu.set(Number(id), text);
}

interface Pair {
  id: number;
  es: string;
  de: string[];
  tenses: Tense[];
  subj: boolean;
  maxRank: number;
}
const stats = { pairs: 0, length: 0, vosotros: 0, voseo: 0, dup: 0 };
const removedVosotros: string[] = [];
const removedVoseo: string[] = [];
const seen = new Set<string>();
const kept: Pair[] = [];
for (const [id, es] of spa) {
  const de = (links.get(id) ?? []).map((d) => deu.get(d)).filter((d): d is string => !!d);
  if (!de.length) continue;
  stats.pairs++;
  const tok = tokens(es);
  if (tok.length < 3 || tok.length > 20) {
    stats.length++;
    continue;
  }
  if (tok.some((t) => vosotrosForms.has(t))) {
    stats.vosotros++;
    removedVosotros.push(es);
    continue;
  }
  if (tok.includes('vos') || tok.some((t) => voseoForms.has(t))) {
    stats.voseo++;
    removedVoseo.push(es);
    continue;
  }
  const key = tok.join(' ');
  if (seen.has(key)) {
    stats.dup++;
    continue;
  }
  seen.add(key);
  const tenses = [...new Set(tok.map(tokenTense).filter((t): t is Tense => !!t))];
  const subj = tok.some(isSubjToken);
  // Ignore proper names: capitalised words after the first one, and known names.
  const raw = es
    .normalize('NFC')
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
  const content = tok.filter(
    (t, i) => !(names.has(t) && !lemmaPos.has(t)) && !(i > 0 && /^\p{Lu}/u.test(raw[i] ?? '')),
  );
  const maxRank = Math.max(
    0,
    ...content.map((t) => {
      const ls = lemmaPos.has(t) ? [t] : [...(forms.get(t)?.lemmas ?? [])];
      const ranks = ls.map((l) => lemmaRank.get(l)).filter((r): r is number => !!r);
      return ranks.length ? Math.min(...ranks) : 99999;
    }),
  );
  kept.push({ id, es, de, tenses, subj, maxRank });
}

say();
say('## Tatoeba ES–DE');
say();
say(
  `- Spanische Sätze gesamt: ${spaTotal.toLocaleString('de-CH')}, deutsche: ${deuTotal.toLocaleString('de-CH')}`,
);
say(`- ES-Sätze mit ≥ 1 direkter DE-Übersetzung: **${stats.pairs.toLocaleString('de-CH')}**`);
say(`- entfernt Länge (3–20 Wörter): ${stats.length.toLocaleString('de-CH')}`);
say(
  `- entfernt vosotros: ${stats.vosotros.toLocaleString('de-CH')} (${pct(stats.vosotros, stats.pairs)})`,
);
say(`- entfernt voseo: ${stats.voseo.toLocaleString('de-CH')}`);
say(`- entfernt Duplikate: ${stats.dup.toLocaleString('de-CH')}`);
say(`- **Verbleibend: ${kept.length.toLocaleString('de-CH')}** (Ziel ≥ 10'000)`);

const tenseCount = new Map<Tense, number>();
for (const p of kept) for (const t of p.tenses) tenseCount.set(t, (tenseCount.get(t) ?? 0) + 1);
const perf = kept.filter((p) =>
  /\b(he|has|ha|hemos|han)\s+\p{L}+(ado|ido|to|cho|so)\b/iu.test(p.es),
).length;
const irA = kept.filter((p) =>
  /\b(voy|vas|va|vamos|van)\s+a\s+\p{L}+(ar|er|ir)\b/iu.test(p.es),
).length;
say();
say('Sätze pro erkannter Zeitform (Mehrfachzählung möglich):');
say();
for (const [t, c] of [...tenseCount].sort((a, b) => b[1] - a[1]))
  say(`- ${t}: ${c.toLocaleString('de-CH')}`);
say(`- perfecto (he/ha … + Partizip, Regex): ${perf.toLocaleString('de-CH')}`);
say(`- ir a + Infinitiv (Regex): ${irA.toLocaleString('de-CH')}`);
say(
  `- ohne erkannte Zeitform: ${kept.filter((p) => !p.tenses.length).length.toLocaleString('de-CH')}`,
);

const TRIGGERS = [
  'ojalá',
  'para que',
  'antes de que',
  'espero que',
  'quiero que',
  'no creo que',
  'creo que',
  'cuando',
  'aunque',
  'es importante que',
  'en cuanto',
  'sin que',
  'a menos que',
];
say(
  `- mit möglicher Subjuntivo-Form: ${kept.filter((p) => p.subj).length.toLocaleString('de-CH')}`,
);
say();
say('Modus-Kandidaten (Auslöser im Satz · davon mit Subjuntivo-Form):');
say();
for (const tr of TRIGGERS) {
  const re = new RegExp(`(^|[^\\p{L}])${tr}([^\\p{L}]|$)`, 'iu');
  const hits = kept.filter((p) => re.test(p.es));
  const subj = hits.filter((p) => p.subj).length;
  say(`- ${tr}: ${hits.length} · ${subj}`);
}

const buckets = [1000, 3000, 8000, 99998];
say();
say('Seltenstes Wort pro Satz (Rang in Lemma-Liste) – Basis der Niveau-Heuristik:');
say();
let prev = 0;
for (const b of buckets) {
  const c = kept.filter((p) => p.maxRank > prev && p.maxRank <= b).length;
  say(`- ${prev + 1}–${b === 99998 ? '…' : b}: ${c.toLocaleString('de-CH')}`);
  prev = b;
}
say(
  `- unbekanntes Wort: ${kept.filter((p) => p.maxRank === 99999).length.toLocaleString('de-CH')}`,
);

const json = JSON.stringify(
  kept.map((p) => ({ id: p.id, es: p.es, de: p.de.slice(0, 2), t: p.tenses })),
);
say();
say(`- Grösse als JSON: ${mb(json.length)}, gzip: ${mb(gzipSync(json).length)}`);
say();
say('Stichprobe behaltene Paare:');
say();
for (const p of sample(kept, 25)) say(`- ${p.es} → ${p.de[0]} [${p.tenses.join(', ')}]`);
say();
say('Stichprobe entfernt (vosotros):');
say();
for (const s of sample(removedVosotros, 12)) say(`- ${s}`);
say();
say('Stichprobe entfernt (voseo):');
say();
for (const s of sample(removedVoseo, 8)) say(`- ${s}`);

// ------------------------------------- verb tables: coverage and accuracy

const TENSES: Tense[] = [
  'presente',
  'indefinido',
  'imperfecto',
  'futuro',
  'condicional',
  'subj_presente',
  'subj_imperfecto',
  'imperativo',
];
const PERSONS: Person[] = ['1s', '2s', '3s', '1p', '3p'];
const cellsOf = (t: Tense) => (t === 'imperativo' ? PERSONS.filter((p) => p !== '1s') : PERSONS);
const rankedVerbs = rankedLemmas.filter((l) => verbTables.has(l));
say();
say('## Konjugation – Abdeckung der Wiktionary-Tabellen');
say();
say('| Top N Verben (nach Häufigkeit) | vollständig (8 Zeitformen × Personen) |');
say('|---|---|');
for (const n of [300, 600, 1000, 2000]) {
  const top = rankedVerbs.slice(0, n);
  const full = top.filter((v) =>
    TENSES.every((t) => cellsOf(t).every((p) => verbTables.get(v)!.get(`${t}:${p}`)?.size)),
  ).length;
  say(`| ${n} | ${pct(full, top.length)} |`);
}
const incomplete = rankedVerbs
  .slice(0, 600)
  .filter(
    (v) => !TENSES.every((t) => cellsOf(t).every((p) => verbTables.get(v)!.get(`${t}:${p}`)?.size)),
  );
say(`- Unvollständig in Top 600 (Beispiele): ${incomplete.slice(0, 25).join(', ')}`);

// Jehle comparison (independent reference)
const JEHLE_TENSE: Record<string, Tense> = {
  'Indicative|Present': 'presente',
  'Indicative|Preterite': 'indefinido',
  'Indicative|Imperfect': 'imperfecto',
  'Indicative|Future': 'futuro',
  'Indicative|Conditional': 'condicional',
  'Subjunctive|Present': 'subj_presente',
  'Subjunctive|Imperfect': 'subj_imperfecto',
  'Imperative Affirmative|Present': 'imperativo',
};
const parseCsvLine = (line: string) =>
  [...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)|,(?=,|$)/g)].map((m) =>
    (m[1] ?? m[2] ?? '').replace(/""/g, '"'),
  );
let header: string[] | null = null;
const cmp = { checked: 0, match: 0, noTable: 0 };
const perTense = new Map<Tense, { checked: number; match: number }>();
const mismatches: string[] = [];
for await (const line of lines(dl.jehle.file)) {
  const cols = parseCsvLine(line);
  if (!header) {
    header = cols;
    continue;
  }
  const row = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']));
  const tense = JEHLE_TENSE[`${row.mood_english}|${row.tense_english}`];
  if (!tense) continue;
  const inf = row.infinitive!.toLowerCase();
  const reflexive = inf.endsWith('se');
  if (reflexive && tense === 'imperativo') continue;
  const table = verbTables.get(inf) ?? (reflexive ? verbTables.get(inf.slice(0, -2)) : undefined);
  for (const p of cellsOf(tense)) {
    let form = (row[`form_${p}`] ?? '').trim().toLowerCase();
    if (!form) continue;
    form = form.replace(/^(me|te|se|nos)\s+/, '');
    if (!table) {
      cmp.noTable++;
      continue;
    }
    cmp.checked++;
    const stat = perTense.get(tense) ?? { checked: 0, match: 0 };
    perTense.set(tense, stat);
    stat.checked++;
    const wikt = table.get(`${tense}:${p}`);
    if (wikt?.has(form)) {
      cmp.match++;
      stat.match++;
    } else if (mismatches.length < 40) {
      mismatches.push(
        `${inf} ${tense} ${p}: Jehle «${form}» · Wiktionary «${[...(wikt ?? [])].join('/') || '–'}»`,
      );
    }
  }
}
say();
say('### Abgleich Wiktionary ↔ Fred Jehle (unabhängige Referenz)');
say();
say(
  `- Verglichene Formen: ${cmp.checked.toLocaleString('de-CH')}, übereinstimmend: **${pct(cmp.match, cmp.checked)}**, Verb fehlt in Wiktionary: ${cmp.noTable}`,
);
for (const [t, st] of perTense) say(`- ${t}: ${pct(st.match, st.checked)} (${st.checked})`);
say();
say('Abweichungen (Beispiele):');
say();
for (const m of mismatches) say(`- ${m}`);

// ----------------------------------------------------------------- licenses

say();
say('## Lizenzangaben an der Quelle');
say();
for (const url of [
  'https://tatoeba.org/en/downloads',
  'https://kaikki.org/dictionary/index.html',
  'https://kaikki.org/dewiktionary/index.html',
]) {
  try {
    const html = await (await fetch(url)).text();
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const hits = [
      ...text.matchAll(
        /[^.]{0,120}(CC[ -]BY[^.]{0,80}|Creative Commons[^.]{0,80}|GFDL[^.]{0,40}|licen[cs]e[^.]{0,80})/gi,
      ),
    ].map((m) => m[0].trim());
    say(`- ${url}`);
    for (const h of [...new Set(hits)].slice(0, 5)) say(`  - «${h}»`);
  } catch (e) {
    say(`- ${url}: ${String(e)}`);
  }
}

say();
say(`**Gesamtlaufzeit: ${elapsed()}**`);

const report = out.join('\n') + '\n';
await writeFile(join(CACHE_DIR, 'report.md'), report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
