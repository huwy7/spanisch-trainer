import type { VerbEntry, VerbsFile } from '../modules/conjugation/types.ts';

export interface VerbData {
  verbs: VerbEntry[];
  lookup: (inf: string) => VerbEntry | undefined;
}

let cache: Promise<VerbData> | null = null;

/** Loads public/data/verbs.json (same origin, precached by the service worker). */
export function loadVerbs(): Promise<VerbData> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/verbs.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`verbs.json: HTTP ${res.status}`);
      return res.json() as Promise<VerbsFile>;
    })
    .then((file) => {
      const byInf = new Map(file.verbs.map((v) => [v.inf, v]));
      return { verbs: file.verbs, lookup: (inf: string) => byInf.get(inf) };
    })
    .catch((e: unknown) => {
      cache = null; // allow retry
      throw e;
    });
  return cache;
}
