/**
 * One-off (manual workflow "Data fixtures"): runs the verb pipeline and writes
 *  - data/dev/verbs.sample.json: small real dataset for offline development (DATA_OFFLINE=1)
 *  - src/modules/conjugation/__fixtures__/reference.json: engine reference (DoD M1, ≥ 200 forms)
 *
 * The reference comes from Fred Jehle's database as an independent source. It is used only
 * here to check the engine; single conjugated forms are linguistic facts, not the database.
 * The files are printed to the log because the dev container cannot reach the sources.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { conjugate } from '../src/modules/conjugation/engine.ts';
import { TENSES, type TenseId } from '../src/modules/conjugation/tenses.ts';
import { PERSONS, type Person, type VerbsFile } from '../src/modules/conjugation/types.ts';
import { download, lines } from './lib/io.ts';
import { DOWNLOAD_DIR, ensureSources } from './sources.ts';
import { loadCorpus } from './corpus.ts';
import { buildVerbs } from './verbs/build.ts';

const JEHLE =
  'https://raw.githubusercontent.com/ghidinelli/fred-jehle-spanish-verbs/master/jehle_verb_database.csv';
const JEHLE_TENSE: Record<string, TenseId> = {
  'Indicative|Present': 'pres',
  'Indicative|Preterite': 'indef',
  'Indicative|Imperfect': 'imperf',
  'Indicative|Future': 'fut',
  'Indicative|Conditional': 'cond',
  'Indicative|Present Perfect': 'perf',
  'Indicative|Past Perfect': 'plusc',
  'Indicative|Future Perfect': 'fut_perf',
  'Indicative|Conditional Perfect': 'cond_comp',
  'Subjunctive|Present': 'subj_pres',
  'Subjunctive|Imperfect': 'subj_imperf',
  'Subjunctive|Present Perfect': 'subj_perf',
  'Subjunctive|Past Perfect': 'subj_plusc',
  'Imperative Affirmative|Present': 'imp_aff',
  'Imperative Negative|Present': 'imp_neg',
};
const REFERENCE_SIZE = 320;

const log = (s: string) => console.log(`fixtures: ${s}`);
await ensureSources(log);
const { file } = await buildVerbs(await loadCorpus(log));

// Dev sample: top 30 + every 50th rank, always with the auxiliaries.
const sample = file.verbs.filter(
  (v) => v.rank <= 30 || v.rank % 50 === 0 || v.inf === 'haber' || v.inf === 'ir',
);
const sampleFile: VerbsFile = { version: 1, verbs: sample.map((v, i) => ({ ...v, rank: i + 1 })) };
const byInf = new Map(sampleFile.verbs.map((v) => [v.inf, v]));
const lookup = (inf: string) => byInf.get(inf);

// Reference from Jehle for the sample verbs.
const jehleFile = join(DOWNLOAD_DIR, 'jehle.csv');
await download(JEHLE, jehleFile);
const parseCsv = (line: string) =>
  [...line.matchAll(/"((?:[^"]|"")*)"|([^,]+)|,(?=,|$)/g)].map((m) =>
    (m[1] ?? m[2] ?? '').replace(/""/g, '"'),
  );
interface Ref {
  inf: string;
  tense: TenseId;
  person: Person;
  form: string;
}
const agree: Ref[] = [];
const disagree: string[] = [];
let header: string[] | null = null;
for await (const line of lines(jehleFile)) {
  const cols = parseCsv(line);
  if (!header) {
    header = cols;
    continue;
  }
  const row = Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']));
  const tense = JEHLE_TENSE[`${row.mood_english}|${row.tense_english}`];
  const verb = lookup(row.infinitive ?? '');
  if (!tense || !verb) continue;
  for (const person of PERSONS) {
    if (!TENSES[tense].persons.includes(person)) continue;
    const form = (row[`form_${person}`] ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!form) continue;
    const ours = conjugate(verb, tense, person, lookup)?.answer;
    if (ours === form) agree.push({ inf: verb.inf, tense, person, form });
    else disagree.push(`${verb.inf} ${tense} ${person}: Jehle «${form}» · engine «${ours ?? '–'}»`);
  }
}
const step = Math.max(1, agree.length / REFERENCE_SIZE);
const reference = Array.from(
  { length: Math.min(REFERENCE_SIZE, agree.length) },
  (_, i) => agree[Math.floor(i * step)]!,
);

log(`sample verbs: ${sampleFile.verbs.length} (${sampleFile.verbs.map((v) => v.inf).join(', ')})`);
log(`jehle comparison: ${agree.length} agree, ${disagree.length} differ`);
for (const d of disagree) log(`DIFF ${d}`);
log(
  `irregular in top 60: ${file.verbs
    .slice(0, 60)
    .map((v) => `${v.inf}${v.irregular ? '*' : v.spelling ? '°' : ''}`)
    .join(', ')}`,
);
log(
  `meanings sample: ${file.verbs
    .filter((_, i) => i % 40 === 0)
    .map((v) => `${v.inf}=${v.de.join('/')}`)
    .join(' · ')}`,
);

const outDir = join(import.meta.dirname, '..', '.cache', 'fixtures');
await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, 'verbs.sample.json'), JSON.stringify(sampleFile));
await writeFile(join(outDir, 'reference.json'), JSON.stringify(reference));
console.log(`BEGIN_SAMPLE${JSON.stringify(sampleFile)}END_SAMPLE`);
console.log(`BEGIN_REFERENCE${JSON.stringify(reference)}END_REFERENCE`);
