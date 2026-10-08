import type { Level } from '../modules/conjugation/tenses.ts';
import { SENTENCE_CHUNK, type SentenceChunk } from '../modules/sentences/types.ts';

interface Manifest {
  chunks: Record<string, string>;
}

const base = () => `${import.meta.env.BASE_URL}data/`;
let manifest: Promise<Manifest> | null = null;
const chunks = new Map<Level, Promise<SentenceChunk>>();

/** data/manifest.json (service worker: network first, cached fallback). */
function loadManifest(): Promise<Manifest> {
  manifest ??= fetch(`${base()}manifest.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`manifest.json: HTTP ${r.status}`);
      return r.json() as Promise<Manifest>;
    })
    .catch((e: unknown) => {
      manifest = null;
      throw e;
    });
  return manifest;
}

/** File name of a level's chunk, e.g. sentences-A2.3fa9c1d2e4.json. */
export function chunkFile(m: Manifest, level: Level): string | undefined {
  return Object.keys(m.chunks).find((f) => SENTENCE_CHUNK.exec(f)?.[1] === level);
}

/** Loads one level (hashed file name → cached by the service worker, CacheFirst). */
export function loadSentenceChunk(level: Level): Promise<SentenceChunk> {
  let p = chunks.get(level);
  if (!p) {
    p = loadManifest()
      .then((m) => {
        const file = chunkFile(m, level);
        if (!file) throw new Error(`Kein Satz-Chunk für ${level}`);
        return fetch(base() + file);
      })
      .then((r) => {
        if (!r.ok) throw new Error(`Satz-Chunk: HTTP ${r.status}`);
        return r.json() as Promise<SentenceChunk>;
      })
      .catch((e: unknown) => {
        chunks.delete(level);
        throw e;
      });
    chunks.set(level, p);
  }
  return p;
}

/**
 * Downloads all sentence chunks in the background while online, so module S also works
 * offline later (they are not in the precache to keep the install small).
 */
export function prefetchSentences(): void {
  if (!navigator.onLine || !('serviceWorker' in navigator)) return;
  const fetchAll = () => {
    void loadManifest()
      .then((m) =>
        Promise.all(
          Object.keys(m.chunks)
            .filter((f) => SENTENCE_CHUNK.test(f))
            .map((f) => fetch(base() + f)),
        ),
      )
      .catch(() => undefined); // best effort
  };
  const idle = () => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fetchAll, { timeout: 10_000 });
    else setTimeout(fetchAll, 3000);
  };
  // only fetch once the service worker controls the page, otherwise nothing gets cached
  if (navigator.serviceWorker.controller) idle();
  else navigator.serviceWorker.addEventListener('controllerchange', idle, { once: true });
}
