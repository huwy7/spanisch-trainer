import type { ModeFile } from '../modules/mode/types.ts';

let cache: Promise<ModeFile> | null = null;

/** Loads public/data/mode.json (same origin, precached). */
export function loadMode(): Promise<ModeFile> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/mode.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`mode.json: HTTP ${res.status}`);
      return res.json() as Promise<ModeFile>;
    })
    .catch((e: unknown) => {
      cache = null;
      throw e;
    });
  return cache;
}
