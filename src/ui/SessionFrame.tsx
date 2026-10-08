import type { ReactNode } from 'react';
import type { SessionCounts, SessionView } from '../srs/useSession.ts';

interface Props {
  view: SessionView;
  counts: SessionCounts;
  onExit: () => void;
  moreNew: (n?: number) => void;
  /** Shown when nothing is left for the current selection. */
  doneText: string;
  /** The card, rendered while `view.kind === 'card'`. */
  children: ReactNode;
}

/** Shared session screen: counters, card, daily-limit and done states (SPEC §4). */
export function SessionFrame({ view, counts, onExit, moreNew, doneText, children }: Props) {
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
      {view.kind === 'card' && children}
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
            <p className="muted">{doneText}</p>
          </div>
          <div className="action-bar">
            <button type="button" className="btn btn-primary btn-wide" onClick={onExit}>
              Zurück zur Auswahl
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
