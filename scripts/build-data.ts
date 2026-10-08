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
import { loadCorpus } from './corpus.ts';
import { buildVerbs, validateVerbs } from './verbs/build.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const DEV_SAMPLE = join(ROOT, 'data', 'dev', 'verbs.sample.json');
const offline = process.env.DATA_OFFLINE === '1';
const log = (s: string) => console.log(`data: ${s}`);
const t0 = performance.now();

await mkdir(OUT_DIR, { recursive: true });

if (offline) {
  log('DATA_OFFLINE=1 → using dev sample (not for production)');
  await copyFile(DEV_SAMPLE, join(OUT_DIR, 'verbs.json'));
} else {
  await ensureSources(log);
  const corpus = await loadCorpus(log);
  const { file, stats } = await buildVerbs(corpus);
  const errors = validateVerbs(file);
  if (errors.length) {
    console.error(errors.slice(0, 50).join('\n'));
    throw new Error(`verbs.json: ${errors.length} validation errors`);
  }
  log(`verbs: ${JSON.stringify(stats)}`);
  await writeFile(join(OUT_DIR, 'verbs.json'), JSON.stringify(file));
}

const chunks: Record<string, string> = {
  'verbs.json': await readFile(join(OUT_DIR, 'verbs.json'), 'utf8'),
};
const manifest = buildManifest(chunks);
await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
log(
  `${Object.keys(chunks).length} chunk(s) → ${OUT_DIR} in ${((performance.now() - t0) / 1000).toFixed(0)} s`,
);
