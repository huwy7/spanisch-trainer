import { useEffect, useMemo, useState } from 'react';
import { InfoButton } from '../../../ui/Sheet.tsx';
import { loadVerbs, type VerbData } from '../../../data/verbs.ts';
import type { AnswerMode } from '../../../db/settings.ts';
import { updateSetting, useSettings } from '../../../ui/useSettings.ts';
import { cardId, generateCards, interleave } from '../engine.ts';
import { LEVELS, TENSE_IDS, TENSES, tensesOfLevel, type TenseId } from '../tenses.ts';
import { useSession } from '../useSession.ts';
import { CardView } from './CardView.tsx';
import { TenseInfoSheet } from './TenseInfoSheet.tsx';

interface Props {
  onExit: () => void;
}

export function ConjugationModule({ onExit }: Props) {
  const settings = useSettings();
  const [data, setData] = useState<VerbData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadVerbs().then(setData, (e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <section className="page">
        <h1 className="page-title">Konjugation</h1>
        <p className="muted">Die Verbdaten konnten nicht geladen werden ({error}).</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Zurück
        </button>
      </section>
    );
  }
  if (!data || !settings) return <p className="page muted">Lädt …</p>;

  const tenses = settings.conjugationTenses.filter((t): t is TenseId =>
    (TENSE_IDS as readonly string[]).includes(t),
  );

  return running ? (
    <Session
      data={data}
      tenses={tenses}
      onlyIrregular={settings.conjugationOnlyIrregular}
      mode={settings.answerMode}
      newPerDay={settings.newPerDay}
      onExit={() => setRunning(false)}
    />
  ) : (
    <Setup
      tenses={tenses}
      onlyIrregular={settings.conjugationOnlyIrregular}
      mode={settings.answerMode}
      verbCount={data.verbs.length}
      lookup={data.lookup}
      onStart={() => setRunning(true)}
      onExit={onExit}
    />
  );
}

// ------------------------------------------------------------------- setup

interface SetupProps {
  tenses: TenseId[];
  onlyIrregular: boolean;
  mode: AnswerMode;
  verbCount: number;
  lookup: VerbData['lookup'];
  onStart: () => void;
  onExit: () => void;
}

function Setup({ tenses, onlyIrregular, mode, verbCount, lookup, onStart, onExit }: SetupProps) {
  const selected = new Set(tenses);
  const [info, setInfo] = useState<TenseId | null>(null);
  const toggle = (id: TenseId) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    void updateSetting(
      'conjugationTenses',
      TENSE_IDS.filter((t) => next.has(t)),
    );
  };
  const toggleLevel = (ids: TenseId[]) => {
    const all = ids.every((t) => selected.has(t));
    const next = new Set(selected);
    for (const t of ids) {
      if (all) next.delete(t);
      else next.add(t);
    }
    void updateSetting(
      'conjugationTenses',
      TENSE_IDS.filter((t) => next.has(t)),
    );
  };

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Konjugation</h1>
      </div>
      <p className="muted">{verbCount} Verben · Zeitformen wählen und loslegen.</p>

      {LEVELS.map((level) => {
        const ids = tensesOfLevel(level);
        const all = ids.every((t) => selected.has(t));
        return (
          <div key={level} className="tense-group">
            <div className="tense-group-header">
              <h2 className="section-title">{level}</h2>
              <button type="button" className="btn-link" onClick={() => toggleLevel(ids)}>
                {all ? 'keine' : 'alle'}
              </button>
            </div>
            <div className="chips">
              {ids.map((id) => (
                <span key={id} className="chip-group">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={selected.has(id)}
                    onClick={() => toggle(id)}
                  >
                    {TENSES[id].label}
                  </button>
                  <InfoButton label={`Info: ${TENSES[id].label}`} onClick={() => setInfo(id)} />
                </span>
              ))}
            </div>
          </div>
        );
      })}

      <h2 className="section-title">Optionen</h2>
      <label className="toggle-row">
        <span>Nur unregelmässige Verben</span>
        <input
          type="checkbox"
          className="switch"
          checked={onlyIrregular}
          onChange={(e) => void updateSetting('conjugationOnlyIrregular', e.target.checked)}
        />
      </label>
      <div className="segmented" role="radiogroup" aria-label="Antwortmodus">
        {(
          [
            ['reveal', 'Aufdecken'],
            ['type', 'Tippen'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className="segment"
            onClick={() => void updateSetting('answerMode', value)}
          >
            {label}
          </button>
        ))}
      </div>

      {info && <TenseInfoSheet tense={info} lookup={lookup} onClose={() => setInfo(null)} />}

      <div className="action-bar action-bar-fixed">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          disabled={!selected.size}
          onClick={onStart}
        >
          {selected.size ? 'Lernen starten' : 'Mindestens eine Zeitform wählen'}
        </button>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- session

interface SessionProps {
  data: VerbData;
  tenses: TenseId[];
  onlyIrregular: boolean;
  mode: AnswerMode;
  newPerDay: number;
  onExit: () => void;
}

function Session({ data, tenses, onlyIrregular, mode, newPerDay, onExit }: SessionProps) {
  const candidates = useMemo(
    () => interleave(generateCards(data.verbs, { tenses, onlyIrregular }, data.lookup)).map(cardId),
    [data, tenses, onlyIrregular],
  );
  const { view, counts, answer, moreNew } = useSession('K', candidates, newPerDay);

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
      {view.kind === 'card' && (
        <CardView
          key={`${view.id}-${counts.reviewed}`}
          id={view.id}
          isNew={view.isNew}
          mode={mode}
          lookup={data.lookup}
          onAnswer={(a) => void answer(view.id, a)}
        />
      )}
      {view.kind === 'new-limit' && (
        <div className="card-stage">
          <div className="empty-state">
            <h2>Tagesziel erreicht</h2>
            <p className="muted">
              Keine fälligen Karten mehr und {counts.newLimit} neue Karten heute gelernt. Du kannst
              trotzdem weitermachen.
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
            <p className="muted">
              Für diese Auswahl gibt es gerade keine Karten. Wähle weitere Zeitformen.
            </p>
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
