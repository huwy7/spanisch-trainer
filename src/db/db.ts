import Dexie, { type Table } from 'dexie';
import type { ModuleId } from '../modules/registry.ts';
import type { Answer, SrsState } from '../srs/scheduler.ts';

/** Progress of one card. `id` is the stable card ID (SPEC §4). */
export interface CardRecord {
  id: string;
  module: ModuleId;
  srs: SrsState;
}

/** One answer (SPEC §4 review log); basis for statistics and later gamification. */
export interface ReviewRecord {
  id?: number;
  cardId: string;
  module: ModuleId;
  answer: Answer;
  /** Epoch ms of the answer. */
  ts: number;
  /** Time from showing the card to answering. */
  durationMs: number;
  /** Card was new before this answer (counts toward new cards per day). */
  wasNew: boolean;
  /** Module M: was the mood chosen correctly? Not indexed, so no schema change. */
  correct?: boolean;
}

export interface SettingRecord {
  key: string;
  value: unknown;
}

/**
 * IndexedDB via Dexie. Schema changes need a new `version(n)` with migration;
 * never edit an existing version (CLAUDE.md).
 */
export class AppDB extends Dexie {
  cards!: Table<CardRecord, string>;
  reviews!: Table<ReviewRecord, number>;
  settings!: Table<SettingRecord, string>;

  constructor(name = 'spanisch-trainer') {
    super(name);
    this.version(1).stores({
      cards: 'id, module, srs.due',
      reviews: '++id, cardId, module, ts',
      settings: 'key',
    });
  }
}

export const SCHEMA_VERSION = 1;

let instance: AppDB | null = null;
export function db(): AppDB {
  instance ??= new AppDB();
  return instance;
}
