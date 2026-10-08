import {
  SCHEMA_VERSION,
  type AppDB,
  type CardRecord,
  type ReviewRecord,
  type SettingRecord,
} from './db.ts';

export const BACKUP_APP = 'spanisch-trainer';

export interface Backup {
  app: typeof BACKUP_APP;
  schema: number;
  exportedAt: number;
  cards: CardRecord[];
  reviews: ReviewRecord[];
  settings: SettingRecord[];
}

export async function exportBackup(db: AppDB, now = Date.now()): Promise<Backup> {
  return db.transaction('r', db.cards, db.reviews, db.settings, async () => ({
    app: BACKUP_APP,
    schema: SCHEMA_VERSION,
    exportedAt: now,
    cards: await db.cards.toArray(),
    reviews: await db.reviews.toArray(),
    settings: await db.settings.toArray(),
  }));
}

export class BackupError extends Error {}

/** Checks structure and version; throws BackupError with a German message for the UI. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Die Datei ist kein gültiges JSON.');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== BACKUP_APP) throw new BackupError('Die Datei ist kein Backup dieser App.');
  if (typeof b.schema !== 'number' || b.schema > SCHEMA_VERSION) {
    throw new BackupError(
      'Das Backup stammt aus einer neueren App-Version. Bitte App aktualisieren.',
    );
  }
  if (!Array.isArray(b.cards) || !Array.isArray(b.reviews) || !Array.isArray(b.settings)) {
    throw new BackupError('Das Backup ist unvollständig.');
  }
  for (const c of b.cards) {
    if (
      typeof c?.id !== 'string' ||
      typeof c.module !== 'string' ||
      typeof c.srs?.due !== 'number'
    ) {
      throw new BackupError('Das Backup enthält ungültige Karten.');
    }
  }
  for (const r of b.reviews) {
    if (typeof r?.cardId !== 'string' || typeof r.ts !== 'number' || typeof r.answer !== 'string') {
      throw new BackupError('Das Backup enthält ungültige Bewertungen.');
    }
  }
  return b as Backup;
}

/** Replaces all progress with the backup (one transaction: all or nothing). */
export async function importBackup(db: AppDB, backup: Backup): Promise<void> {
  await db.transaction('rw', db.cards, db.reviews, db.settings, async () => {
    await Promise.all([db.cards.clear(), db.reviews.clear(), db.settings.clear()]);
    await db.cards.bulkAdd(backup.cards);
    await db.reviews.bulkAdd(backup.reviews.map(({ id, ...r }) => r));
    await db.settings.bulkAdd(backup.settings);
  });
}

export function backupFileName(now = new Date()): string {
  const d = now.toISOString().slice(0, 10);
  return `spanisch-trainer-backup-${d}.json`;
}

/** SPEC §4: reminder when the last export is older than 7 days. */
export const BACKUP_REMINDER_MS = 7 * 86_400_000;
export function backupDue(
  lastBackupAt: number | null,
  firstUseAt: number | null,
  now: number,
): boolean {
  const since = lastBackupAt ?? firstUseAt;
  return since !== null && now - since > BACKUP_REMINDER_MS;
}
