/**
 * Shared data format of data/curated/phrases.json and public/data/phrases.json (module P, SPEC §3).
 * Erasable TypeScript only: also imported by the Node pipeline.
 */

export const PHRASE_CATEGORIES = [
  'smalltalk',
  'hoeflichkeit',
  'reaktionen',
  'alltag',
  'umgangssprachlich',
] as const;
export type PhraseCategory = (typeof PHRASE_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<PhraseCategory, string> = {
  smalltalk: 'Smalltalk',
  hoeflichkeit: 'Höflichkeit',
  reaktionen: 'Reaktionen & Füllwörter',
  alltag: 'Alltagssituationen',
  umgangssprachlich: 'Umgangssprachlich',
};

/** ID prefix per category: IDs look like `st-001` and never change. */
export const CATEGORY_PREFIX: Record<PhraseCategory, string> = {
  smalltalk: 'st',
  hoeflichkeit: 'hf',
  reaktionen: 're',
  alltag: 'al',
  umgangssprachlich: 'ug',
};

export const REGIONS = ['general', 'es', 'latam'] as const;
export type Region = (typeof REGIONS)[number];

export const REGION_LABEL: Record<Region, string> = {
  general: 'Allgemein',
  es: 'Spanien',
  latam: 'Lateinamerika',
};

export interface Phrase {
  /** Stable curated ID, e.g. `st-001` (card IDs `p:<id>` / `p:r:<id>`, SPEC §4). */
  id: string;
  cat: PhraseCategory;
  region: Region;
  es: string;
  de: string;
  /** Equivalent Spanish variants, shown as "auch:". */
  alt?: string[];
  /** Short hint on register or situation. */
  note?: string;
}

export interface PhraseFile {
  version: 1;
  phrases: Phrase[];
}
