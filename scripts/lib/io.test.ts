import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { download, lines, tokens } from './io.ts';

let base = '';
const server = createServer((req, res) => {
  if (req.url === '/missing') {
    res.statusCode = 404;
    res.end();
    return;
  }
  res.end('a\nb\n\nc\n');
});
beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));

const collect = async (file: string) => {
  const out: string[] = [];
  for await (const l of lines(file)) out.push(l);
  return out;
};

describe('download and lines', () => {
  it('downloads, compresses on the fly and reads lines back', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'io-'));
    const plain = join(dir, 'x.txt');
    const gz = join(dir, 'x.txt.gz');
    expect(await download(`${base}/x`, plain)).toEqual({ cached: false });
    expect(await download(`${base}/x`, gz)).toEqual({ cached: false });
    expect(await download(`${base}/x`, gz)).toEqual({ cached: true });
    expect(await collect(plain)).toEqual(['a', 'b', 'c']);
    expect(await collect(gz)).toEqual(['a', 'b', 'c']);
    expect((await readFile(gz)).subarray(0, 2)).toEqual(Buffer.from([0x1f, 0x8b]));
  });

  it('fails loudly on HTTP errors', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'io-'));
    await expect(download(`${base}/missing`, join(dir, 'm'))).rejects.toThrow('404');
  });

  it('reads gzip files written elsewhere', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'io-'));
    const f = join(dir, 'y.gz');
    await writeFile(f, gzipSync('x\ny'));
    expect(await collect(f)).toEqual(['x', 'y']);
  });
});

describe('tokens', () => {
  it('splits into lower-case words incl. accents', () => {
    expect(tokens('¿Tú hablas ESPAÑOL? Sí.')).toEqual(['tú', 'hablas', 'español', 'sí']);
  });
});
