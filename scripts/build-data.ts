/**
 * Data pipeline (`npm run data`), SPEC §6: download → filter → JSON chunks in public/data/.
 *
 * DATA_OFFLINE=1 uses the committed dev sample in data/dev/ instead of the sources
 * (the dev container cannot reach them). CI always runs online and fails on errors.
 */
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { buildManifest } from './manifest.ts';
import { ensureSources } from './sources.ts';
import { loadCorpus, type Corpus } from './corpus.ts';
import { buildMode, validateMode } from './mode/build.ts';
import { buildSentences, validateSentences } from './sentences/build.ts';
import { hashContent } from './manifest.ts';
import { LEVELS, type Level } from '../src/modules/conjugation/tenses.ts';
import type { SentenceChunk } from '../src/modules/sentences/types.ts';
import { loadGerman, type GermanCandidates } from './german.ts';
import { verbCandidates, buildVerbs, validateVerbs } from './verbs/build.ts';
import { buildVocab, validateVocab, vocabCandidates } from './vocab/build.ts';
import { FALLBACK_LEXICON, loadPhrases, mergeLexicon, validatePhrases } from './phrases/build.ts';

const ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const DEV_SAMPLE = join(ROOT, 'data', 'dev', 'verbs.sample.json');
const offline = process.env.DATA_OFFLINE === '1';
const log = (s: string) => console.log(`data: ${s}`);
const t0 = performance.now();

await mkdir(OUT_DIR, { recursive: true });

let corpus: Corpus | null = null;
let german: GermanCandidates | null = null;
if (offline) {
  log('DATA_OFFLINE=1 → using dev sample (not for production)');
  await copyFile(DEV_SAMPLE, join(OUT_DIR, 'verbs.json'));
} else {
  await ensureSources(log);
  corpus = await loadCorpus(log);
  german = await loadGerman(new Set([...verbCandidates(corpus), ...vocabCandidates(corpus)]));
  const { file, stats } = await buildVerbs(corpus, german);
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

// Module V: vocabulary (offline: committed dev sample)
const DEV_VOCAB = join(ROOT, 'data', 'dev', 'vocab.sample.json');
if (corpus && german) {
  const vocab = await buildVocab(corpus, german);
  const vocabErrors = validateVocab(vocab.file, corpus.wikt);
  if (vocabErrors.length) {
    console.error(vocabErrors.slice(0, 50).join('\n'));
    throw new Error(`vocab.json: ${vocabErrors.length} errors`);
  }
  log(`vocab: ${JSON.stringify(vocab.stats)}`);
  log(`vocab homographs dropped: ${vocab.homographs.slice(0, 80).join(', ')}`);
  const step = Math.floor(vocab.file.words.length / 25) || 1;
  for (const w of vocab.file.words.filter((_, i) => i % step === 0)) {
    log(
      `vocab sample: #${w.rank} ${w.lemma} (${w.pos}${w.gender ? ' ' + w.gender : ''}) = ${w.de.join(' / ')}${w.ex ? ` · ${w.ex[1]}` : ''}`,
    );
  }
  await writeFile(join(OUT_DIR, 'vocab.json'), JSON.stringify(vocab.file));
} else if (existsSync(DEV_VOCAB)) {
  await copyFile(DEV_VOCAB, join(OUT_DIR, 'vocab.json'));
} else {
  log('no dev vocab sample → empty vocab.json');
  await writeFile(join(OUT_DIR, 'vocab.json'), JSON.stringify({ version: 1, words: [] }));
}

// Module P: curated phrases, validated (online also against the Wiktionary vosotros/voseo sets)
const phrases = await loadPhrases();
const phraseErrors = validatePhrases(
  phrases,
  corpus ? mergeLexicon(corpus.wikt, FALLBACK_LEXICON) : FALLBACK_LEXICON,
);
if (phraseErrors.length) {
  console.error(phraseErrors.slice(0, 50).join('\n'));
  throw new Error(`phrases.json: ${phraseErrors.length} errors`);
}
log(`phrases: ${phrases.phrases.length}`);
await writeFile(
  join(OUT_DIR, 'phrases.json'),
  JSON.stringify({ version: phrases.version, phrases: phrases.phrases }),
);

// Module S: sentence chunks per level, hashed file names (lazy loaded, immutable cache).
const DEV_SENTENCES = join(ROOT, 'data', 'dev', 'sentences.sample.json');
let sentenceChunks: Record<Level, SentenceChunk>;
if (corpus) {
  const built = buildSentences(corpus);
  const sentenceErrors = validateSentences(built.chunks, corpus.wikt);
  if (sentenceErrors.length) {
    console.error(sentenceErrors.slice(0, 50).join('\n'));
    throw new Error(`sentences: ${sentenceErrors.length} errors`);
  }
  log(`sentences: ${JSON.stringify(built.stats)}`);
  sentenceChunks = built.chunks;
} else if (existsSync(DEV_SENTENCES)) {
  sentenceChunks = JSON.parse(await readFile(DEV_SENTENCES, 'utf8')) as Record<
    Level,
    SentenceChunk
  >;
} else {
  log('no dev sentence sample → empty sentence chunks');
  const empty = (level: Level): SentenceChunk => ({ version: 1, level, rows: [] });
  sentenceChunks = { A2: empty('A2'), B1: empty('B1'), B2: empty('B2') };
}
for (const f of await readdir(OUT_DIR)) if (f.startsWith('sentences-')) await rm(join(OUT_DIR, f));

const chunks: Record<string, string> = {
  'verbs.json': await readFile(join(OUT_DIR, 'verbs.json'), 'utf8'),
  'mode.json': await readFile(join(OUT_DIR, 'mode.json'), 'utf8'),
  'vocab.json': await readFile(join(OUT_DIR, 'vocab.json'), 'utf8'),
  'phrases.json': await readFile(join(OUT_DIR, 'phrases.json'), 'utf8'),
};
for (const level of LEVELS) {
  const content = JSON.stringify(sentenceChunks[level]);
  const name = `sentences-${level}.${hashContent(content).slice(0, 10)}.json`;
  await writeFile(join(OUT_DIR, name), content);
  chunks[name] = content;
  log(
    `${name}: ${sentenceChunks[level].rows.length} rows, ${(content.length / 1e6).toFixed(1)} MB`,
  );
}
const manifest = buildManifest(chunks);
await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
log(
  `${Object.keys(chunks).length} chunk(s) → ${OUT_DIR} in ${((performance.now() - t0) / 1000).toFixed(0)} s`,
);
