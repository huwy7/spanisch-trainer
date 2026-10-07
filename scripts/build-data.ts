/**
 * Data pipeline entry point (`npm run data`), SPEC §6:
 * download → filter → level tagging → JSON chunks in public/data/.
 *
 * M0: no sources yet; writes an empty manifest so the app and the
 * service worker can rely on its presence.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildManifest } from './manifest.ts';

const OUT_DIR = join(import.meta.dirname, '..', 'public', 'data');

const chunks: Record<string, string> = {};

await mkdir(OUT_DIR, { recursive: true });
for (const [path, content] of Object.entries(chunks)) {
  await writeFile(join(OUT_DIR, path), content);
}
const manifest = buildManifest(chunks);
await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`data: ${Object.keys(chunks).length} chunks → ${OUT_DIR}`);
