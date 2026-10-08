/**
 * Shared data format of public/data/mode.json (module M, SPEC §3).
 * Erasable TypeScript only: also imported by the Node pipeline.
 */

export type Mood = 'ind' | 'subj';

/** Categories from SPEC §3 M. IDs are stable (statistics). */
export const MODE_CATEGORIES = [
  'wunsch',
  'gefuehl',
  'zweifel',
  'unpersoenlich',
  'konjunktion',
  'zeitlich',
  'si',
  'relativ',
  'ojala',
] as const;
export type ModeCategory = (typeof MODE_CATEGORIES)[number];

export interface ModeCard {
  /** Stable card ID: `m:t:<tatoeba-id>` or `m:c:<curated-id>` (SPEC §4). */
  id: string;
  /** Full Spanish sentence; the gap is es.slice(gap[0], gap[1]). */
  es: string;
  gap: [number, number];
  /** Trigger expression in `es` (highlighted in the explanation). */
  trigger: [number, number];
  /** Infinitive shown in brackets. */
  inf: string;
  /** Accepted variants besides the original form (e.g. -se for -ra). */
  alternatives: string[];
  mood: Mood;
  category: ModeCategory;
  /** Key into ModeFile.explanations. */
  explanation: string;
  /** German translation. */
  de: string;
  /** Tatoeba ID for attribution, absent for curated sentences. */
  tatoebaId?: number;
}

export interface ModeFile {
  version: 1;
  categories: Record<ModeCategory, { label: string }>;
  explanations: Record<string, string>;
  /** In the order new cards are introduced. */
  cards: ModeCard[];
}
