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
  if (SKIP_POS.has(e.pos)) continue;
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
const formTense = new Map<string, Tense>();
for (const [form, info] of forms) {
  if (!info.tagSets.length) continue;
  const all = info.tagSets;
  const unambiguous = !lemmaPos.has(form);
  if (unambiguous && all.every(isVosotros)) vosotrosForms.add(form);
  if (unambiguous && all.every(isVoseo)) voseoForms.add(form);
  const tenses = new Set(all.filter((t) => !isVosotros(t) && !isVoseo(t)).map(tenseOf));
  if (tenses.size === 1 && !tenses.has(null)) formTense.set(form, [...tenses][0]!);
}
for (const w of ['vosotros', 'vosotras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'os']) {
  vosotrosForms.add(w);
}
say(
  `- vosotros-Formen (eindeutig): ${vosotrosForms.size.toLocaleString('de-CH')}, voseo-Formen: ${voseoForms.size.toLocaleString('de-CH')}`,
);
say(`- Formen mit eindeutiger Zeitform: ${formTense.size.toLocaleString('de-CH')}`);

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

const deGloss = new Map<string, string[]>(); // es lemma -> German glosses (Spanish entries)
const deReverse = new Map<string, Set<string>>(); // es word -> German headwords (translation tables)
let deEntries = 0;
let printedDeSample = 0;
for await (const line of lines(dl.dewikt.file)) {
  if (!line) continue;
  deEntries++;
  const e = JSON.parse(line) as WiktEntry;
  if (!e.word) continue;
  if (e.lang_code === 'es') {
    const glosses = (e.senses ?? []).flatMap((s) => s.glosses ?? []).filter(Boolean);
    if (glosses.length) {
      const w = e.word.toLowerCase();
      deGloss.set(w, [...(deGloss.get(w) ?? []), ...glosses]);
      if (printedDeSample < 3) {
        printedDeSample++;
        console.log('DEBUG de.wikt Spanish entry:', JSON.stringify(e).slice(0, 600));
      }
    }
  } else if (e.lang_code === 'de') {
    for (const t of e.translations ?? []) {
      if ((t.lang_code ?? t.code) !== 'es' || !t.word) continue;
      const w = t.word.toLowerCase();
      let set = deReverse.get(w);
      if (!set) deReverse.set(w, (set = new Set()));
      set.add(e.word);
    }
  }
}
say();
say('## de.wiktionary (kaikki) – deutsche Übersetzungen');
say();
say(`- Einträge gelesen: ${deEntries.toLocaleString('de-CH')}`);
say(`- Spanische Einträge mit deutscher Bedeutung: ${deGloss.size.toLocaleString('de-CH')}`);
say(
  `- Spanische Wörter aus Übersetzungstabellen deutscher Einträge: ${deReverse.size.toLocaleString('de-CH')}`,
);
say();
say('| Top N Lemmata | Bedeutungen (A) | Übersetzungstabellen (B) | A ∪ B |');
say('|---|---|---|---|');
for (const n of [1000, 3000, 8000]) {
  const top = rankedLemmas.slice(0, n);
  const a = top.filter((l) => deGloss.has(l)).length;
  const b = top.filter((l) => deReverse.has(l)).length;
  const ab = top.filter((l) => deGloss.has(l) || deReverse.has(l)).length;
  say(`| ${n} | ${pct(a, top.length)} | ${pct(b, top.length)} | ${pct(ab, top.length)} |`);
}
say();
say('Stichprobe (Top 8000):');
say();
for (const l of sample(rankedLemmas.slice(0, 8000), 30)) {
  const a = (deGloss.get(l) ?? []).slice(0, 2).join(' | ');
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
  const tenses = [...new Set(tok.map((t) => formTense.get(t)).filter((t): t is Tense => !!t))];
  const maxRank = Math.max(
    ...tok.map((t) => {
      const ls = lemmaPos.has(t) ? [t] : [...(forms.get(t)?.lemmas ?? [])];
      const ranks = ls.map((l) => lemmaRank.get(l)).filter((r): r is number => !!r);
      return ranks.length ? Math.min(...ranks) : 99999;
    }),
  );
  kept.push({ id, es, de, tenses, maxRank });
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
say();
say('Modus-Kandidaten (Auslöser im Satz · davon mit Subjuntivo-Form):');
say();
for (const tr of TRIGGERS) {
  const re = new RegExp(`(^|[^\\p{L}])${tr}([^\\p{L}]|$)`, 'iu');
  const hits = kept.filter((p) => re.test(p.es));
  const subj = hits.filter((p) => p.tenses.some((t) => t.startsWith('subj'))).length;
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

say();
say(`**Gesamtlaufzeit: ${elapsed()}**`);

const report = out.join('\n') + '\n';
await writeFile(join(CACHE_DIR, 'report.md'), report);
if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, report);
