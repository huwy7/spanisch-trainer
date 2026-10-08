/**
 * Shared data format of public/data/verbs.json (written by scripts/, read by the app).
 * Erasable TypeScript only: also imported by the Node pipeline.
 */

/** Grammatical persons without vosotros (SPEC §2). Order is fixed: index in form arrays. */
export const PERSONS = ['1s', '2s', '3s', '1p', '3p'] as const;
export type Person = (typeof PERSONS)[number];

/** Tenses whose forms come from the data source; all others are composed. */
export const SIMPLE_TENSES = [
  'pres',
  'indef',
  'imperf',
  'fut',
  'cond',
  'subj_pres',
  'subj_imperf',
  'imp_aff',
] as const;
export type SimpleTense = (typeof SIMPLE_TENSES)[number];

/** Five forms in PERSONS order; '' where a form does not exist (e.g. imperative 1s). */
export type FormRow = [string, string, string, string, string];

export interface VerbEntry {
  /** Infinitive, also the stable verb key in card IDs. */
  inf: string;
  /** German meanings, best first (1–3). */
  de: string[];
  /** Frequency rank among the exported verbs (1 = most frequent). */
  rank: number;
  /** Deviates from the regular pattern (stem change or irregular). */
  irregular: boolean;
  /** Only orthographic changes (buscar → busqué); not counted as irregular. */
  spelling: boolean;
  participle: string;
  gerund: string;
  forms: Record<SimpleTense, FormRow>;
  /** Subjuntivo imperfecto on -se: shown as alternative, never asked (SPEC §3). */
  subjImperfSe: FormRow;
}

export interface VerbsFile {
  version: 1;
  verbs: VerbEntry[];
}
