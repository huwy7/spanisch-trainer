import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { constants, createGunzip, createGzip } from 'node:zlib';

/**
 * Downloads `url` to `file` unless it already exists (download cache).
 * A `file` ending in .gz for a URL that is not gzipped is compressed on the fly.
 */
export async function download(url: string, file: string): Promise<{ cached: boolean }> {
  if (existsSync(file)) return { cached: true };
  await mkdir(dirname(file), { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}): ${url}`);
  const tmp = `${file}.part`;
  const body = Readable.fromWeb(res.body);
  if (file.endsWith('.gz') && !url.endsWith('.gz')) {
    await pipeline(body, createGzip({ level: constants.Z_BEST_SPEED }), createWriteStream(tmp));
  } else {
    await pipeline(body, createWriteStream(tmp));
  }
  await rename(tmp, file);
  return { cached: false };
}

export async function fileSize(file: string): Promise<number> {
  return (await stat(file)).size;
}

/** Streams the lines of a plain, .gz or .bz2 file. */
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
  for await (const line of rl) if (line) yield line;
}

/** Lower-case word tokens (letters incl. accents). */
export function tokens(text: string): string[] {
  return text
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
}
