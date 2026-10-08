import { SessionFrame } from '../../../ui/SessionFrame.tsx';
import { useEffect, useMemo, useState } from 'react';
import { loadPhrases } from '../../../data/phrases.ts';
import { useSession } from '../../../srs/useSession.ts';
import { updateSetting, useSettings } from '../../../ui/useSettings.ts';
import { RatingBar } from '../../conjugation/ui/RatingBar.tsx';
import type { Direction } from '../../sentences/filter.ts';
import { phraseCardId, selectPhrases } from '../filter.ts';
import {
  CATEGORY_LABEL,
  PHRASE_CATEGORIES,
  REGION_LABEL,
  type Phrase,
  type PhraseCategory,
  type PhraseFile,
  type Region,
} from '../types.ts';

interface Props {
  onExit: () => void;
}

const isCategory = (c: string): c is PhraseCategory =>
  (PHRASE_CATEGORIES as readonly string[]).includes(c);
const isRegion = (r: string): r is Region => r === 'es' || r === 'latam';

export function PhraseModule({ onExit }: Props) {
  const settings = useSettings();
  const [file, setFile] = useState<PhraseFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    loadPhrases().then(setFile, (e: unknown) => setError(String(e)));
  }, []);

  const categories = (settings?.phraseCategories ?? []).filter(isCategory);
  const regions = (settings?.phraseRegions ?? []).filter(isRegion);
  const direction: Direction = settings?.phraseDirection ?? 'de-es';
  // the filter arrays are rebuilt each render: memoize on their contents
  const catKey = categories.join(',');
  const regionKey = regions.join(',');
  const phrases = useMemo(
    () =>
      file
        ? selectPhrases(
            file.phrases,
            catKey.split(',').filter(isCategory),
            regionKey.split(',').filter(isRegion),
          )
        : [],
    [file, catKey, regionKey],
  );

  if (error) {
    return (
      <section className="page">
        <h1 className="page-title">Phrasen</h1>
        <p className="muted">Die Phrasen konnten nicht geladen werden ({error}).</p>
        <button type="button" className="btn btn-secondary" onClick={onExit}>
          Zurück
        </button>
      </section>
    );
  }
  if (!file || !settings) return <p className="page muted">Lädt …</p>;
  if (running) {
    return (
      <Session
        phrases={phrases}
        direction={direction}
        newPerDay={settings.newPerDay}
        onExit={() => setRunning(false)}
      />
    );
  }
  return (
    <Setup
      categories={categories}
      regions={regions}
      direction={direction}
      count={phrases.length}
      onStart={() => setRunning(true)}
      onExit={onExit}
    />
  );
}

// ------------------------------------------------------------------- setup

interface SetupProps {
  categories: PhraseCategory[];
  regions: Region[];
  direction: Direction;
  count: number;
  onStart: () => void;
  onExit: () => void;
}

function Setup({ categories, regions, direction, count, onStart, onExit }: SetupProps) {
  const toggle = <T extends string>(list: readonly T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Phrasen</h1>
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
            onClick={() => void updateSetting('phraseDirection', value)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="tense-group-header">
        <h2 className="section-title">Kategorien</h2>
        {categories.length > 0 && (
          <button
            type="button"
            className="btn-link"
            onClick={() => void updateSetting('phraseCategories', [])}
          >
            alle
          </button>
        )}
      </div>
      <p className="muted small">Ohne Auswahl kommen alle Kategorien.</p>
      <div className="chips">
        {PHRASE_CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={categories.includes(c)}
            onClick={() => void updateSetting('phraseCategories', toggle(categories, c))}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <h2 className="section-title">Regionale Varianten</h2>
      <p className="muted small">Allgemein übliche Phrasen sind immer dabei.</p>
      <div className="chips">
        {(['es', 'latam'] as const).map((r) => (
          <button
            key={r}
            type="button"
            className="chip"
            aria-pressed={regions.includes(r)}
            onClick={() => void updateSetting('phraseRegions', toggle(regions, r))}
          >
            {REGION_LABEL[r]}
          </button>
        ))}
      </div>

      <div className="action-bar action-bar-fixed">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          disabled={!count}
          onClick={onStart}
        >
          {count ? `Lernen starten · ${count} Phrasen` : 'Keine passenden Phrasen'}
        </button>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- session

interface SessionProps {
  phrases: Phrase[];
  direction: Direction;
  newPerDay: number;
  onExit: () => void;
}

function Session({ phrases, direction, newPerDay, onExit }: SessionProps) {
  const byId = useMemo(
    () => new Map(phrases.map((p) => [phraseCardId(p.id, direction), p])),
    [phrases, direction],
  );
  const candidates = useMemo(() => [...byId.keys()], [byId]);
  const { view, counts, answer, moreNew } = useSession('P', candidates, newPerDay);
  const phrase = view.kind === 'card' ? byId.get(view.id) : undefined;

  return (
    <SessionFrame
      view={view}
      counts={counts}
      onExit={onExit}
      moreNew={moreNew}
      doneText="Für diese Auswahl gibt es gerade keine Karten."
    >
      {view.kind === 'card' && phrase && (
        <PhraseCard
          key={`${view.id}-${counts.reviewed}`}
          phrase={phrase}
          direction={direction}
          isNew={view.isNew}
          onAnswer={(a) => void answer(view.id, a)}
        />
      )}
    </SessionFrame>
  );
}

interface CardProps {
  phrase: Phrase;
  direction: Direction;
  isNew: boolean;
  onAnswer: (a: 'again' | 'good' | 'easy') => void;
}

function PhraseCard({ phrase, direction, isNew, onAnswer }: CardProps) {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const toEs = direction === 'de-es';

  return (
    <div className="card-stage">
      <div className="prompt prompt-sentence">
        <div className="prompt-meta">
          <span>{CATEGORY_LABEL[phrase.cat]}</span>
          {isNew && <span className="badge-new">neu</span>}
        </div>
        <p className="sentence" lang={toEs ? 'de' : 'es'}>
          {toEs ? phrase.de : phrase.es}
        </p>
      </div>

      {revealed && (
        <div className="solution solution-sentence" aria-live="polite">
          <p className="sentence" lang={toEs ? 'es' : 'de'}>
            {toEs ? phrase.es : phrase.de}
          </p>
          {phrase.alt && (
            <p className="muted" lang="es">
              auch: {phrase.alt.join(' · ')}
            </p>
          )}
          <div className="tense-tags">
            <span className="tag">{REGION_LABEL[phrase.region]}</span>
          </div>
          {phrase.note && <p className="muted small phrase-note">{phrase.note}</p>}
        </div>
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
