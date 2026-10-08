/**
 * Data pipeline (`npm run data`), SPEC §6: download → filter → JSON chunks in public/data/.
 *
 * DATA_OFFLINE=1 uses the committed dev sample in data/dev/ instead of the sources
 * (the dev container cannot reach them). CI always runs online and fails on errors.
 */
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildManifest } from './manifest.ts';
import { ensureSources } from './sources.ts';
import { loadCorpus, type Corpus } from './corpus.ts';
import { buildMode, validateMode } from './mode/build.ts';
import { buildVerbs, validateVerbs } from './verbs/build.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const DEV_SAMPLE = join(ROOT, 'data', 'dev', 'verbs.sample.json');
const offline = process.env.DATA_OFFLINE === '1';
const log = (s: string) => console.log(`data: ${s}`);
const t0 = performance.now();

await mkdir(OUT_DIR, { recursive: true });

let corpus: Corpus | null = null;
if (offline) {
  log('DATA_OFFLINE=1 → using dev sample (not for production)');
  await copyFile(DEV_SAMPLE, join(OUT_DIR, 'verbs.json'));
} else {
  await ensureSources(log);
  corpus = await loadCorpus(log);
  const { file, stats } = await buildVerbs(corpus);
  const errors = validateVerbs(file);
  if (errors.length) {
    console.error(errors.slice(0, 50).join('\n'));
    throw new Error(`verbs.json: ${errors.length} validation errors`);
  }
  log(`verbs: ${JSON.stringify(stats)}`);
  await writeFile(join(OUT_DIR, 'verbs.json'), JSON.stringify(file));
}

// Module M: offline only from curated sentences, online also from Tatoeba.
const mode = await buildMode(corpus);
const modeErrors = [...mode.errors, ...validateMode(mode.file)];
if (modeErrors.length) {
  console.error(modeErrors.slice(0, 50).join('\n'));
  throw new Error(`mode.json: ${modeErrors.length} errors`);
}
log(`mode: ${JSON.stringify(mode.stats)}`);
// Review aid in the CI log: Tatoeba cards with the gap marked.
const fromTatoeba = mode.file.cards.filter((c) => c.tatoebaId !== undefined);
const step = Math.max(1, Math.floor(fromTatoeba.length / 30));
for (const c of fromTatoeba.filter((_, i) => i % step === 0).slice(0, 30)) {
  const marked = `${c.es.slice(0, c.gap[0])}[${c.es.slice(c.gap[0], c.gap[1])}]${c.es.slice(c.gap[1])}`;
  log(`mode sample: ${c.category}/${c.mood} (${c.inf}) ${marked}`);
}
await writeFile(join(OUT_DIR, 'mode.json'), JSON.stringify(mode.file));

const chunks: Record<string, string> = {
  'verbs.json': await readFile(join(OUT_DIR, 'verbs.json'), 'utf8'),
  'mode.json': await readFile(join(OUT_DIR, 'mode.json'), 'utf8'),
};
const manifest = buildManifest(chunks);
await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
log(
  `${Object.keys(chunks).length} chunk(s) → ${OUT_DIR} in ${((performance.now() - t0) / 1000).toFixed(0)} s`,
);
