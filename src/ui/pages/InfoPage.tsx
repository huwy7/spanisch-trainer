import { useRef, useState, type ChangeEvent } from 'react';
import {
  backupFileName,
  BackupError,
  exportBackup,
  importBackup,
  parseBackup,
} from '../../db/backup.ts';
import { db } from '../../db/db.ts';
import { reloadSettings, updateSetting, useSettings } from '../useSettings.ts';

/** SPEC §2: mandatory attributions of all data sources. */
const SOURCES = [
  {
    name: 'Tatoeba',
    url: 'https://tatoeba.org',
    license: 'CC BY 2.0 FR',
    use: 'Beispielsätze, Bedeutungs-Ranking',
  },
  {
    name: 'Wiktionary (Englisch, Deutsch) via kaikki.org',
    url: 'https://kaikki.org',
    license: 'CC BY-SA 4.0 / GFDL',
    use: 'Verbformen, Übersetzungen',
  },
  {
    name: 'FrequencyWords (Hermit Dave, OpenSubtitles 2018)',
    url: 'https://github.com/hermitdave/FrequencyWords',
    license: 'CC BY-SA 4.0',
    use: 'Worthäufigkeiten',
  },
];

type Status = { kind: 'ok' | 'error'; text: string } | null;

export function InfoPage() {
  const settings = useSettings();
  const [status, setStatus] = useState<Status>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const doExport = async () => {
    setStatus(null);
    try {
      const backup = await exportBackup(db());
      const name = backupFileName();
      const file = new File([JSON.stringify(backup)], name, { type: 'application/json' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: name });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      await updateSetting('lastBackupAt', Date.now());
      setStatus({ kind: 'ok', text: `Backup erstellt (${backup.cards.length} Karten).` });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return; // share sheet cancelled
      setStatus({ kind: 'error', text: `Export fehlgeschlagen: ${String(e)}` });
    }
  };

  const doImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setStatus(null);
    try {
      const backup = parseBackup(await file.text());
      const when = new Date(backup.exportedAt).toLocaleString('de-CH');
      const ok = window.confirm(
        `Backup vom ${when} mit ${backup.cards.length} Karten importieren? Der aktuelle Fortschritt wird ersetzt.`,
      );
      if (!ok) return;
      await importBackup(db(), backup);
      await reloadSettings();
      // the imported file itself is a backup of that date
      await updateSetting('lastBackupAt', backup.exportedAt);
      setStatus({ kind: 'ok', text: 'Backup importiert.' });
    } catch (err) {
      const text =
        err instanceof BackupError ? err.message : `Import fehlgeschlagen: ${String(err)}`;
      setStatus({ kind: 'error', text });
    }
  };

  return (
    <section className="page">
      <h1 className="page-title">Info</h1>

      <h2 className="section-title">Einstellungen</h2>
      {settings && (
        <div className="setting-row">
          <span>Neue Karten pro Tag</span>
          <div className="stepper">
            <button
              type="button"
              aria-label="Weniger"
              onClick={() => void updateSetting('newPerDay', Math.max(0, settings.newPerDay - 5))}
            >
              −
            </button>
            <output aria-live="polite">{settings.newPerDay}</output>
            <button
              type="button"
              aria-label="Mehr"
              onClick={() => void updateSetting('newPerDay', settings.newPerDay + 5)}
            >
              +
            </button>
          </div>
        </div>
      )}

      <h2 className="section-title">Backup</h2>
      <p className="muted">
        Der Fortschritt liegt nur auf diesem Gerät. Exportiere regelmässig ein Backup (z.&nbsp;B. in
        die Dateien-App).
        {settings?.lastBackupAt
          ? ` Letztes Backup: ${new Date(settings.lastBackupAt).toLocaleDateString('de-CH')}.`
          : ' Noch kein Backup erstellt.'}
      </p>
      <div className="button-row">
        <button type="button" className="btn btn-primary" onClick={() => void doExport()}>
          Exportieren
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => fileInput.current?.click()}
        >
          Importieren
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void doImport(e)}
        />
      </div>
      {status && (
        <p className={`status status-${status.kind}`} role="status">
          {status.text}
        </p>
      )}

      <h2 className="section-title">Datenquellen</h2>
      <ul className="source-list">
        {SOURCES.map((s) => (
          <li key={s.name}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.name}
            </a>
            <span className="muted">
              {' '}
              · {s.license} · {s.use}
            </span>
          </li>
        ))}
      </ul>
      <p className="muted small">
        Die aus diesen Quellen erzeugten Lerndaten stehen unter CC BY-SA 4.0.
      </p>

      <h2 className="section-title">Version</h2>
      <p className="muted">
        Build <code>{__APP_VERSION__}</code> · {__BUILD_DATE__}
      </p>
    </section>
  );
}
