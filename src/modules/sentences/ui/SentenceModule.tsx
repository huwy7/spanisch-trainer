import { SessionFrame } from '../../../ui/SessionFrame.tsx';
import { useEffect, useMemo, useState } from 'react';
import { loadSentenceChunk } from '../../../data/sentences.ts';
import { loadVerbs, type VerbData } from '../../../data/verbs.ts';
import { useSession } from '../../../srs/useSession.ts';
import { InfoButton } from '../../../ui/Sheet.tsx';
import { updateSetting, useSettings } from '../../../ui/useSettings.ts';
import { TenseInfoSheet } from '../../conjugation/ui/TenseInfoSheet.tsx';
import { RatingBar } from '../../conjugation/ui/RatingBar.tsx';
import { LEVELS, TENSE_IDS, TENSES, type Level, type TenseId } from '../../conjugation/tenses.ts';
import { selectRows, sentenceCardId, type Direction } from '../filter.ts';
import { tensesOf, type SentenceChunk, type SentenceRow } from '../types.ts';

interface Props {
  onExit: () => void;
}

const isLevel = (l: string): l is Level => (LEVELS as readonly string[]).includes(l);
const isTense = (t: string): t is TenseId => (TENSE_IDS as readonly string[]).includes(t);

export function SentenceModule({ onExit }: Props) {
  const settings = useSettings();
  const [chunks, setChunks] = useState<Partial<Record<Level, SentenceChunk>>>({});
  const [verbs, setVerbs] = useState<VerbData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const levels = (settings?.sentenceLevels ?? []).filter(isLevel);
  const tenses = (settings?.sentenceTenses ?? []).filter(isTense);
  const direction: Direction = settings?.sentenceDirection ?? 'de-es';

  useEffect(() => {
    void loadVerbs().then(setVerbs, () => undefined);
  }, []);

  // load the chunks of the selected levels (lazy)
  const levelKey = levels.join(',');
  useEffect(() => {
    for (const level of levelKey.split(',').filter(isLevel)) {
      loadSentenceChunk(level).then(
        (c) => setChunks((prev) => ({ ...prev, [level]: c })),
        (e: unknown) => setError(String(e)),
      );
    }
  }, [levelKey]);

  const rows = useMemo(() => selectRows(chunks, levels, tenses), [chunks, levels, tenses]);
  const loaded = levels.every((l) => chunks[l]);

  if (!settings) return <p className="page muted">Lädt …</p>;
  if (running && loaded) {
    return (
      <Session
        rows={rows}
        direction={direction}
        verbs={verbs}
        newPerDay={settings.newPerDay}
        onExit={() => setRunning(false)}
      />
    );
  }

  return (
    <Setup
      levels={levels}
      tenses={tenses}
      direction={direction}
      count={loaded ? rows.length : null}
      error={error}
      verbs={verbs}
      onStart={() => setRunning(true)}
      onExit={onExit}
    />
  );
}

// ------------------------------------------------------------------- setup

interface SetupProps {
  levels: Level[];
  tenses: TenseId[];
  direction: Direction;
  count: number | null;
  error: string | null;
  verbs: VerbData | null;
  onStart: () => void;
  onExit: () => void;
}

function Setup({ levels, tenses, direction, count, error, verbs, onStart, onExit }: SetupProps) {
  const [info, setInfo] = useState<TenseId | null>(null);
  const toggle = <T extends string>(list: readonly T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Satzkarten</h1>
      </div>

      <div className="segmented" role="radiogroup" aria-label="Richtung">
        {(
          [
            ['de-es', 'Deutsch → Spanisch'],
            ['es-de', 'Spanisch → Deutsch'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={direction === value}
            className="segment"
            onClick={() => void updateSetting('sentenceDirection', value)}
          >
            {label}
          </button>
        ))}
      </div>

      <h2 className="section-title">Niveau</h2>
      <div className="chips">
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            className="chip"
            aria-pressed={levels.includes(l)}
            onClick={() => void updateSetting('sentenceLevels', toggle(levels, l))}
          >
            {l}
          </button>
        ))}
      </div>
      <p className="muted small">
        Das Niveau ist eine Schätzung aus Zeitformen, Wortschatz und Satzlänge.
      </p>

      <div className="tense-group-header">
        <h2 className="section-title">Zeitformen</h2>
        {tenses.length > 0 && (
          <button
            type="button"
            className="btn-link"
            onClick={() => void updateSetting('sentenceTenses', [])}
          >
            alle
          </button>
        )}
      </div>
      <p className="muted small">
        Ohne Auswahl kommen alle Sätze. Mit Auswahl nur Sätze, die eine der Zeitformen enthalten.
      </p>
      <div className="chips">
        {TENSE_IDS.map((id) => (
          <span key={id} className="chip-group">
            <button
              type="button"
              className="chip"
              aria-pressed={tenses.includes(id)}
              onClick={() => void updateSetting('sentenceTenses', toggle(tenses, id))}
            >
              {TENSES[id].label}
            </button>
            {verbs && (
              <InfoButton label={`Info: ${TENSES[id].label}`} onClick={() => setInfo(id)} />
            )}
          </span>
        ))}
      </div>
      {info && verbs && (
        <TenseInfoSheet tense={info} lookup={verbs.lookup} onClose={() => setInfo(null)} />
      )}

      {error && (
        <p className="status status-error">Sätze konnten nicht geladen werden ({error}).</p>
      )}

      <div className="action-bar action-bar-fixed">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          disabled={!levels.length || !count}
          onClick={onStart}
        >
          {!levels.length
            ? 'Mindestens ein Niveau wählen'
            : count === null
              ? 'Lädt …'
              : count === 0
                ? 'Keine passenden Sätze'
                : `Lernen starten · ${count.toLocaleString('de-CH')} Sätze`}
        </button>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- session

interface SessionProps {
  rows: SentenceRow[];
  direction: Direction;
  verbs: VerbData | null;
  newPerDay: number;
  onExit: () => void;
}

function Session({ rows, direction, verbs, newPerDay, onExit }: SessionProps) {
  const byId = useMemo(
    () => new Map(rows.map((r) => [sentenceCardId(r[0], direction), r])),
    [rows, direction],
  );
  const candidates = useMemo(() => [...byId.keys()], [byId]);
  const { view, counts, answer, moreNew } = useSession('S', candidates, newPerDay);
  const row = view.kind === 'card' ? byId.get(view.id) : undefined;

  return (
    <SessionFrame
      view={view}
      counts={counts}
      onExit={onExit}
      moreNew={moreNew}
      doneText="Für diese Auswahl gibt es gerade keine Karten."
    >
      {view.kind === 'card' && row && (
        <SentenceCard
          key={`${view.id}-${counts.reviewed}`}
          row={row}
          direction={direction}
          isNew={view.isNew}
          verbs={verbs}
          onAnswer={(a) => void answer(view.id, a)}
        />
      )}
    </SessionFrame>
  );
}

interface CardProps {
  row: SentenceRow;
  direction: Direction;
  isNew: boolean;
  verbs: VerbData | null;
  onAnswer: (a: 'again' | 'good' | 'easy') => void;
}

export function SentenceCard({ row, direction, isNew, verbs, onAnswer }: CardProps) {
  const [id, es, de, mask] = row;
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<TenseId | null>(null);
  const [front, back] = direction === 'de-es' ? [de, es] : [es, de];
  const frontLang = direction === 'de-es' ? 'de' : 'es';
  const tenses = tensesOf(mask);

  return (
    <div className="card-stage">
      <div className="prompt prompt-sentence">
        <div className="prompt-meta">
          <span>{direction === 'de-es' ? 'Auf Spanisch sagen' : 'Auf Deutsch verstehen'}</span>
          {isNew && <span className="badge-new">neu</span>}
        </div>
        <p className="sentence" lang={frontLang}>
          {front}
        </p>
      </div>

      {revealed && (
        <div className="solution solution-sentence" aria-live="polite">
          <p className="sentence" lang={frontLang === 'de' ? 'es' : 'de'}>
            {back}
          </p>
          {tenses.length > 0 && (
            <div className="tense-tags">
              {tenses.map((t) => (
                <span key={t} className="chip-group">
                  <span className="tag">{TENSES[t].label}</span>
                  {verbs && (
                    <InfoButton label={`Info: ${TENSES[t].label}`} onClick={() => setInfo(t)} />
                  )}
                </span>
              ))}
            </div>
          )}
          <a
            className="attribution"
            href={`https://tatoeba.org/de/sentences/show/${id}`}
            target="_blank"
            rel="noreferrer"
          >
            Satz #{id} · Tatoeba (CC BY 2.0 FR)
          </a>
        </div>
      )}
      {info && verbs && (
        <TenseInfoSheet tense={info} lookup={verbs.lookup} onClose={() => setInfo(null)} />
      )}

      {revealed ? (
        <RatingBar
          disabled={busy}
          onRate={(a) => {
            if (busy) return;
            setBusy(true);
            onAnswer(a as 'again' | 'good' | 'easy');
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
