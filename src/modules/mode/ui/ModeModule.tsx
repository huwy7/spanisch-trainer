import { useEffect, useMemo, useState } from 'react';
import { loadMode } from '../../../data/mode.ts';
import { useSession } from '../../../srs/useSession.ts';
import { InfoButton, Sheet } from '../../../ui/Sheet.tsx';
import { useSettings } from '../../../ui/useSettings.ts';
import { MODE_CATEGORIES, type ModeCategory, type ModeFile } from '../types.ts';
import { ModeCardView } from './ModeCardView.tsx';

interface Props {
  onExit: () => void;
}

export function ModeModule({ onExit }: Props) {
  const settings = useSettings();
  const [file, setFile] = useState<ModeFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadMode().then(setFile, (e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <section className="page">
        <h1 className="page-title">Modus wählen</h1>
        <p className="muted">Die Daten konnten nicht geladen werden ({error}).</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Zurück
        </button>
      </section>
    );
  }
  if (!file || !settings) return <p className="page muted">Lädt …</p>;

  return running ? (
    <Session file={file} newPerDay={settings.newPerDay} onExit={() => setRunning(false)} />
  ) : (
    <Start file={file} onStart={() => setRunning(true)} onExit={onExit} />
  );
}

function Start({
  file,
  onStart,
  onExit,
}: {
  file: ModeFile;
  onStart: () => void;
  onExit: () => void;
}) {
  const [info, setInfo] = useState<ModeCategory | null>(null);
  const counts = useMemo(() => {
    const c = new Map<ModeCategory, number>();
    for (const card of file.cards) c.set(card.category, (c.get(card.category) ?? 0) + 1);
    return c;
  }, [file]);
  // explanations per category, e.g. subjunctive rule + indicative contrast
  const explanationsOf = (cat: ModeCategory) => [
    ...new Set(file.cards.filter((c) => c.category === cat).map((c) => c.explanation)),
  ];

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Modus wählen</h1>
      </div>
      <p className="muted">
        Indikativ oder Subjuntivo? {file.cards.length} Sätze in {MODE_CATEGORIES.length} Kategorien,
        inklusive Kontrastfällen mit Indikativ.
      </p>

      <ul className="category-list">
        {MODE_CATEGORIES.map((cat) => (
          <li key={cat} className="category-row">
            <span className="category-label">{file.categories[cat].label}</span>
            <span className="muted">{counts.get(cat) ?? 0}</span>
            <InfoButton
              label={`Regel: ${file.categories[cat].label}`}
              onClick={() => setInfo(cat)}
            />
          </li>
        ))}
      </ul>

      {info && (
        <Sheet title={file.categories[info].label} onClose={() => setInfo(null)}>
          {explanationsOf(info).map((key) => (
            <p key={key}>{file.explanations[key]}</p>
          ))}
        </Sheet>
      )}

      <div className="action-bar action-bar-fixed">
        <button type="button" className="btn btn-primary btn-wide" onClick={onStart}>
          Lernen starten
        </button>
      </div>
    </section>
  );
}

function Session({
  file,
  newPerDay,
  onExit,
}: {
  file: ModeFile;
  newPerDay: number;
  onExit: () => void;
}) {
  const byId = useMemo(() => new Map(file.cards.map((c) => [c.id, c])), [file]);
  const candidates = useMemo(() => file.cards.map((c) => c.id), [file]);
  const { view, counts, answer, moreNew } = useSession('M', candidates, newPerDay);
  const card = view.kind === 'card' ? byId.get(view.id) : undefined;

  return (
    <section className="session">
      <header className="session-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Session beenden">
          ✕
        </button>
        <div className="session-counts" aria-label="Fortschritt">
          <span>
            <strong>{counts.due}</strong> fällig
          </span>
          <span>
            <strong>
              {counts.newToday}/{counts.newLimit}
            </strong>{' '}
            neu
          </span>
          <span>
            <strong>{counts.reviewed}</strong> erledigt
          </span>
        </div>
      </header>

      {view.kind === 'loading' && <p className="muted">Lädt …</p>}
      {view.kind === 'card' && card && (
        <ModeCardView
          key={`${card.id}-${counts.reviewed}`}
          card={card}
          file={file}
          isNew={view.isNew}
          onAnswer={(a, correct) => void answer(card.id, a, { correct })}
        />
      )}
      {view.kind === 'new-limit' && (
        <div className="card-stage">
          <div className="empty-state">
            <h2>Tagesziel erreicht</h2>
            <p className="muted">
              Keine fälligen Karten mehr und {counts.newLimit} neue Karten heute. Du kannst trotzdem
              weitermachen.
            </p>
          </div>
          <div className="action-bar">
            <button type="button" className="btn btn-secondary" onClick={onExit}>
              Beenden
            </button>
            <button type="button" className="btn btn-primary" onClick={() => moreNew(10)}>
              10 weitere neue
            </button>
          </div>
        </div>
      )}
      {view.kind === 'done' && (
        <div className="card-stage">
          <div className="empty-state">
            <h2>Alles gelernt</h2>
            <p className="muted">Gerade sind keine Karten fällig.</p>
          </div>
          <div className="action-bar">
            <button type="button" className="btn btn-primary btn-wide" onClick={onExit}>
              Zurück
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
