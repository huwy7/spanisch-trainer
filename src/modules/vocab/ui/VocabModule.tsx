import { SessionFrame } from '../../../ui/SessionFrame.tsx';
import { useEffect, useMemo, useState } from 'react';
import { loadVocab } from '../../../data/vocab.ts';
import { db } from '../../../db/db.ts';
import { loadStates } from '../../../db/progress.ts';
import type { Answer } from '../../../srs/scheduler.ts';
import { useSession } from '../../../srs/useSession.ts';
import { updateSetting, useSettings } from '../../../ui/useSettings.ts';
import { RatingBar } from '../../conjugation/ui/RatingBar.tsx';
import { genderLabel, posLabel } from '../placement.ts';
import { vocabCardId, type VocabEntry, type VocabFile } from '../types.ts';
import { Placement } from './Placement.tsx';

interface Props {
  onExit: () => void;
}

type View = 'start' | 'placement' | 'session';

export function VocabModule({ onExit }: Props) {
  const settings = useSettings();
  const [file, setFile] = useState<VocabFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    loadVocab().then(setFile, (e: unknown) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <section className="page">
        <h1 className="page-title">Vokabeln</h1>
        <p className="muted">Die Vokabeln konnten nicht geladen werden ({error}).</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Zurück
        </button>
      </section>
    );
  }
  if (!file || !settings) return <p className="page muted">Lädt …</p>;

  // first visit: placement test (SPEC §3 V)
  const current = view ?? (settings.vocabPlacementDone ? 'start' : 'placement');
  const header = (
    <header className="session-header">
      <button
        type="button"
        className="btn-back"
        onClick={current === 'start' ? onExit : () => setView('start')}
        aria-label="Zurück"
      >
        {current === 'start' ? '‹' : '✕'}
      </button>
    </header>
  );

  if (current === 'placement') {
    return (
      <section className="session">
        {header}
        <Placement
          words={file.words}
          startIndex={settings.vocabPlacementIndex}
          onFinish={() => setView('start')}
        />
      </section>
    );
  }
  if (current === 'session') {
    return (
      <Session words={file.words} newPerDay={settings.newPerDay} onExit={() => setView('start')} />
    );
  }
  return (
    <Start
      file={file}
      placementIndex={settings.vocabPlacementIndex}
      onPlacement={() => {
        void updateSetting('vocabPlacementDone', false);
        setView('placement');
      }}
      onStart={() => setView('session')}
      onExit={onExit}
    />
  );
}

function Start({
  file,
  placementIndex,
  onPlacement,
  onStart,
  onExit,
}: {
  file: VocabFile;
  placementIndex: number;
  onPlacement: () => void;
  onStart: () => void;
  onExit: () => void;
}) {
  const [learned, setLearned] = useState<number | null>(null);
  useEffect(() => {
    void loadStates(db(), 'V').then((s) =>
      setLearned([...s.values()].filter((x) => x.reps > 0).length),
    );
  }, []);
  const done = placementIndex >= file.words.length;

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Vokabeln</h1>
      </div>
      <p className="muted">
        Die {file.words.length.toLocaleString('de-CH')} häufigsten Wörter, von Deutsch nach
        Spanisch.
        {learned !== null &&
          ` ${learned.toLocaleString('de-CH')} davon gelernt oder als bekannt eingestuft.`}
      </p>
      <div className="setting-row">
        <span>Einstufung: {placementIndex.toLocaleString('de-CH')} Wörter geprüft</span>
        {!done && (
          <button type="button" className="btn-link" onClick={onPlacement}>
            fortsetzen
          </button>
        )}
      </div>
      <div className="action-bar action-bar-fixed">
        <button type="button" className="btn btn-primary btn-wide" onClick={onStart}>
          Lernen starten
        </button>
      </div>
    </section>
  );
}

function Session({
  words,
  newPerDay,
  onExit,
}: {
  words: VocabEntry[];
  newPerDay: number;
  onExit: () => void;
}) {
  const byId = useMemo(() => new Map(words.map((w) => [vocabCardId(w.lemma), w])), [words]);
  const candidates = useMemo(() => [...byId.keys()], [byId]);
  const { view, counts, answer, moreNew } = useSession('V', candidates, newPerDay);
  const word = view.kind === 'card' ? byId.get(view.id) : undefined;

  return (
    <SessionFrame
      view={view}
      counts={counts}
      onExit={onExit}
      moreNew={moreNew}
      doneText="Gerade sind keine Wörter fällig."
    >
      {view.kind === 'card' && word && (
        <VocabCard
          key={`${view.id}-${counts.reviewed}`}
          word={word}
          isNew={view.isNew}
          onAnswer={(a) => void answer(view.id, a)}
        />
      )}
    </SessionFrame>
  );
}

function VocabCard({
  word,
  isNew,
  onAnswer,
}: {
  word: VocabEntry;
  isNew: boolean;
  onAnswer: (a: Answer) => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <div className="card-stage">
      <div className="prompt">
        <div className="prompt-meta">
          <span>{posLabel(word.pos)}</span>
          {isNew && <span className="badge-new">neu</span>}
        </div>
        <div className="prompt-de">{word.de.join(', ')}</div>
      </div>

      {revealed && (
        <div className="solution solution-sentence" aria-live="polite">
          <div className="solution-answer" lang="es">
            {word.lemma}
            {word.gender && <span className="tag gender-tag">{genderLabel(word.gender)}</span>}
          </div>
          {word.ex && (
            <>
              <p className="example" lang="es">
                {word.ex[1]}
              </p>
              <p className="muted">{word.ex[2]}</p>
              <a
                className="attribution"
                href={`https://tatoeba.org/de/sentences/show/${word.ex[0]}`}
                target="_blank"
                rel="noreferrer"
              >
                Satz #{word.ex[0]} · Tatoeba (CC BY 2.0 FR)
              </a>
            </>
          )}
        </div>
      )}

      {revealed ? (
        <RatingBar
          disabled={busy}
          onRate={(a) => {
            if (busy) return;
            setBusy(true);
            onAnswer(a);
          }}
        />
      ) : (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary btn-wide"
            onClick={() => setRevealed(true)}
          >
            Aufdecken
          </button>
        </div>
      )}
    </div>
  );
}
