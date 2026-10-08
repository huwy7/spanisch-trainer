import type { AppDB } from './db.ts';

export type AnswerMode = 'reveal' | 'type';

/** All settings with defaults (SPEC §3/§4). */
export interface Settings {
  newPerDay: number;
  answerMode: AnswerMode;
  /** Epoch ms of the last backup export, null if never. */
  lastBackupAt: number | null;
  /** Epoch ms of the first app start (backup reminder without any export yet). */
  firstUseAt: number | null;
  /** Conjugation filter: selected tense IDs and irregular-only flag. */
  conjugationTenses: string[];
  conjugationOnlyIrregular: boolean;
  /** Sentence cards: direction, levels and tense filter (empty = all tenses). */
  sentenceDirection: 'de-es' | 'es-de';
  sentenceLevels: string[];
  sentenceTenses: string[];
  /** Vocabulary placement: index of the next word, and whether it is finished. */
  vocabPlacementIndex: number;
  vocabPlacementDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 30,
  answerMode: 'reveal',
  lastBackupAt: null,
  firstUseAt: null,
  conjugationTenses: ['pres', 'indef', 'perf', 'ir_a'],
  conjugationOnlyIrregular: false,
  sentenceDirection: 'de-es',
  sentenceLevels: ['A2', 'B1'],
  sentenceTenses: [],
  vocabPlacementIndex: 0,
  vocabPlacementDone: false,
};

export async function loadSettings(db: AppDB): Promise<Settings> {
  const rows = await db.settings.toArray();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...stored } as Settings;
}

export async function saveSetting<K extends keyof Settings>(
  db: AppDB,
  key: K,
  value: Settings[K],
): Promise<void> {
  await db.settings.put({ key, value });
}
