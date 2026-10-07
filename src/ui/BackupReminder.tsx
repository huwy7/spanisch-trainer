import { useState } from 'react';
import { backupDue } from '../db/backup.ts';
import { useSettings } from './useSettings.ts';

/** SPEC §4: non-blocking hint when the last export is older than 7 days. */
export function BackupReminder() {
  const s = useSettings();
  const [now] = useState(() => Date.now());
  if (!s || !backupDue(s.lastBackupAt, s.firstUseAt, now)) return null;
  return (
    <a className="notice" href="#info">
      <strong>Backup erstellen</strong>
      <span>
        {s.lastBackupAt ? 'Dein letztes Backup ist älter als 7 Tage.' : 'Du hast noch kein Backup.'}{' '}
        Unter Info → Backup exportieren.
      </span>
    </a>
  );
}
