import type { PhraseFile } from '../modules/phrases/types.ts';

let cache: Promise<PhraseFile> | null = null;

/** Loads public/data/phrases.json (same origin, precached). */
export function loadPhrases(): Promise<PhraseFile> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/phrases.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`phrases.json: HTTP ${res.status}`);
      return res.json() as Promise<PhraseFile>;
    })
    .catch((e: unknown) => {
      cache = null;
      throw e;
    });
  return cache;
}
