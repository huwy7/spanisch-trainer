import type { VocabFile } from '../modules/vocab/types.ts';

let cache: Promise<VocabFile> | null = null;

/** Loads public/data/vocab.json (same origin, precached). */
export function loadVocab(): Promise<VocabFile> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/vocab.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`vocab.json: HTTP ${res.status}`);
      return res.json() as Promise<VocabFile>;
    })
    .catch((e: unknown) => {
      cache = null;
      throw e;
    });
  return cache;
}
