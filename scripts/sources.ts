import { join } from 'node:path';
import { download, fileSize } from './lib/io.ts';

export const DOWNLOAD_DIR = join(import.meta.dirname, '..', '.cache', 'downloads');

/** Data sources (SPEC §6, docs/spike-report.md). Attribution is shown in the app. */
export const SOURCES = {
  tatoebaSpa: 'https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2',
  tatoebaDeu: 'https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2',
  tatoebaLinks: 'https://downloads.tatoeba.org/exports/per_language/spa/spa-deu_links.tsv.bz2',
  enWiktionary: 'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl',
  deWiktionary: 'https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz',
  frequency:
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt',
} as const;

export type SourceKey = keyof typeof SOURCES;

/** Large uncompressed sources are stored gzipped in the cache (~1 GB → ~0.15 GB). */
const COMPRESS: ReadonlySet<SourceKey> = new Set(['enWiktionary']);

export function sourceFile(key: SourceKey): string {
  const name = `${key}-${SOURCES[key].split('/').pop()}`;
  return join(DOWNLOAD_DIR, COMPRESS.has(key) ? `${name}.gz` : name);
}

/** Downloads all sources (cached) and logs their sizes. */
export async function ensureSources(log: (s: string) => void): Promise<void> {
  for (const key of Object.keys(SOURCES) as SourceKey[]) {
    const { cached } = await download(SOURCES[key], sourceFile(key));
    const mb = (await fileSize(sourceFile(key))) / 1e6;
    log(`${key}: ${mb.toFixed(1)} MB${cached ? ' (cache)' : ''}`);
  }
}
