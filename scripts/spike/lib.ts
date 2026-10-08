import { spawn } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

export const CACHE_DIR = join(import.meta.dirname, '..', '..', '.cache', 'spike');

export interface Download {
  file: string;
  bytes: number;
  seconds: number;
  cached: boolean;
}

export async function download(url: string, name: string): Promise<Download> {
  await mkdir(CACHE_DIR, { recursive: true });
  const file = join(CACHE_DIR, name);
  const t0 = performance.now();
  if (existsSync(file)) {
    return { file, bytes: (await stat(file)).size, seconds: 0, cached: true };
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed ${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
  const bytes = (await stat(file)).size;
  return { file, bytes, seconds: (performance.now() - t0) / 1000, cached: false };
}

/** Streams lines of a plain, .gz or .bz2 file. */
export async function* lines(file: string): AsyncGenerator<string> {
  let input: NodeJS.ReadableStream;
  if (file.endsWith('.bz2')) {
    const proc = spawn('bzip2', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] });
    input = proc.stdout;
  } else if (file.endsWith('.gz')) {
    input = createReadStream(file).pipe(createGunzip());
  } else {
    input = createReadStream(file);
  }
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) yield line;
}

export function tokens(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
}

export function mb(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`;
}

export function pct(part: number, total: number): string {
  return total === 0 ? '–' : `${((100 * part) / total).toFixed(1)} %`;
}

/** Deterministic sample (stable across runs). */
export function sample<T>(items: readonly T[], n: number): T[] {
  if (items.length <= n) return [...items];
  const step = items.length / n;
  return Array.from({ length: n }, (_, i) => items[Math.floor(i * step)]!);
}
