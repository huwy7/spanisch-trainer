import { useEffect, useMemo, useState } from 'react';
import { loadMode } from '../../../data/mode.ts';
import { loadPhrases } from '../../../data/phrases.ts';
import { loadSentenceChunk } from '../../../data/sentences.ts';
import { loadVerbs, type VerbData } from '../../../data/verbs.ts';
import { loadVocab } from '../../../data/vocab.ts';
import type { Settings } from '../../../db/settings.ts';
import type { Answer } from '../../../srs/scheduler.ts';
import { useSession } from '../../../srs/useSession.ts';
import { SessionFrame } from '../../../ui/SessionFrame.tsx';
import { updateSetting, useSettings } from '../../../ui/useSettings.ts';
import { cardId, generateCards, interleave } from '../../conjugation/engine.ts';
import { LEVELS, TENSE_IDS, type Level, type TenseId } from '../../conjugation/tenses.ts';
import { CardView } from '../../conjugation/ui/CardView.tsx';
import type { ModeCard, ModeFile } from '../../mode/types.ts';
import { ModeCardView } from '../../mode/ui/ModeCardView.tsx';
import { phraseCardId, selectPhrases } from '../../phrases/filter.ts';
import {
  PHRASE_CATEGORIES,
  type Phrase,
  type PhraseCategory,
  type PhraseFile,
  type Region,
} from '../../phrases/types.ts';
import { PhraseCard } from '../../phrases/ui/PhraseModule.tsx';
import { MODULES, type ModuleId } from '../../registry.ts';
import { selectRows, sentenceCardId, type Direction } from '../../sentences/filter.ts';
import type { SentenceChunk, SentenceRow } from '../../sentences/types.ts';
import { SentenceCard } from '../../sentences/ui/SentenceModule.tsx';
import { vocabCardId, type VocabEntry, type VocabFile } from '../../vocab/types.ts';
import { VocabCard } from '../../vocab/ui/VocabModule.tsx';
import { mixCandidates, moduleOf } from '../candidates.ts';

interface Props {
  onExit: () => void;
}

const MIX_MODULES: readonly ModuleId[] = ['K', 'M', 'S', 'V', 'P'];
const isModule = (m: string): m is ModuleId => (MIX_MODULES as readonly string[]).includes(m);
const titleOf = (id: ModuleId) => MODULES.find((m) => m.id === id)!.title;

interface Data {
  verbs?: VerbData;
  mode?: ModeFile;
  vocab?: VocabFile;
  phrases?: PhraseFile;
  chunks: Partial<Record<Level, SentenceChunk>>;
}

/** Card lookups and candidate lists per module, built with each module's own filters. */
interface Pool {
  lists: Partial<Record<ModuleId, string[]>>;
  mode: Map<string, ModeCard>;
  sentences: Map<string, [SentenceRow, Direction]>;
  vocab: Map<string, VocabEntry>;
  phrases: Map<string, [Phrase, Direction]>;
}

function buildPool(data: Data, s: Settings): Pool {
  const pool: Pool = {
    lists: {},
    mode: new Map(),
    sentences: new Map(),
    vocab: new Map(),
    phrases: new Map(),
  };
  if (data.verbs) {
    const tenses = s.conjugationTenses.filter((t): t is TenseId =>
      (TENSE_IDS as readonly string[]).includes(t),
    );
    const cards = generateCards(
      data.verbs.verbs,
      { tenses, onlyIrregular: s.conjugationOnlyIrregular },
      data.verbs.lookup,
    );
    pool.lists.K = interleave(cards).map(cardId);
  }
  if (data.mode) {
    for (const c of data.mode.cards) pool.mode.set(c.id, c);
    pool.lists.M = data.mode.cards.map((c) => c.id);
  }
  const levels = s.sentenceLevels.filter((l): l is Level =>
    (LEVELS as readonly string[]).includes(l),
  );
  if (levels.every((l) => data.chunks[l])) {
    const tenses = s.sentenceTenses.filter((t): t is TenseId =>
      (TENSE_IDS as readonly string[]).includes(t),
    );
    const dir = s.sentenceDirection;
    pool.lists.S = selectRows(data.chunks, levels, tenses).map((r) => {
      const id = sentenceCardId(r[0], dir);
      pool.sentences.set(id, [r, dir]);
      return id;
    });
  }
  if (data.vocab) {
    pool.lists.V = data.vocab.words.map((w) => {
      const id = vocabCardId(w.lemma);
      pool.vocab.set(id, w);
      return id;
    });
  }
  if (data.phrases) {
    const cats = s.phraseCategories.filter((c): c is PhraseCategory =>
      (PHRASE_CATEGORIES as readonly string[]).includes(c),
    );
    const regions = s.phraseRegions.filter((r): r is Region => r === 'es' || r === 'latam');
    const dir = s.phraseDirection;
    pool.lists.P = selectPhrases(data.phrases.phrases, cats, regions).map((p) => {
      const id = phraseCardId(p.id, dir);
      pool.phrases.set(id, [p, dir]);
      return id;
    });
  }
  return pool;
}

export function MixModule({ onExit }: Props) {
  const settings = useSettings();
  const [data, setData] = useState<Data>({ chunks: {} });
  const [errors, setErrors] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const fail = (what: string) => (e: unknown) =>
      setErrors((prev) => [...prev, `${what}: ${String(e)}`]);
    loadVerbs().then((verbs) => setData((d) => ({ ...d, verbs })), fail('Verben'));
    loadMode().then((mode) => setData((d) => ({ ...d, mode })), fail('Modus'));
    loadVocab().then((vocab) => setData((d) => ({ ...d, vocab })), fail('Vokabeln'));
    loadPhrases().then((phrases) => setData((d) => ({ ...d, phrases })), fail('Phrasen'));
  }, []);

  // sentence chunks: only the levels selected in module S
  const levelKey = (settings?.sentenceLevels ?? []).join(',');
  useEffect(() => {
    for (const level of levelKey
      .split(',')
      .filter((l): l is Level => (LEVELS as readonly string[]).includes(l))) {
      loadSentenceChunk(level).then(
        (c) => setData((d) => ({ ...d, chunks: { ...d.chunks, [level]: c } })),
        (e: unknown) => setErrors((prev) => [...prev, `Sätze ${level}: ${String(e)}`]),
      );
    }
  }, [levelKey]);

  const pool = useMemo(() => (settings ? buildPool(data, settings) : null), [data, settings]);
  if (!settings || !pool) return <p className="page muted">Lädt …</p>;

  const selected = settings.mixModules.filter(isModule);
  const ready = selected.every((m) => pool.lists[m]);

  if (running && ready) {
    return (
      <Session
        pool={pool}
        modules={selected}
        data={data}
        settings={settings}
        onExit={() => setRunning(false)}
      />
    );
  }
  return (
    <Setup
      pool={pool}
      selected={selected}
      ready={ready}
      errors={errors}
      placementDone={settings.vocabPlacementDone}
      onStart={() => setRunning(true)}
      onExit={onExit}
    />
  );
}

// ------------------------------------------------------------------- setup

interface SetupProps {
  pool: Pool;
  selected: ModuleId[];
  ready: boolean;
  errors: string[];
  placementDone: boolean;
  onStart: () => void;
  onExit: () => void;
}

function Setup({ pool, selected, ready, errors, placementDone, onStart, onExit }: SetupProps) {
  const toggle = (id: ModuleId) =>
    void updateSetting(
      'mixModules',
      MIX_MODULES.filter((m) => (m === id ? !selected.includes(m) : selected.includes(m))),
    );
  const total = selected.reduce((n, m) => n + (pool.lists[m]?.length ?? 0), 0);

  return (
    <section className="page">
      <div className="page-header">
        <button type="button" className="btn-back" onClick={onExit} aria-label="Zurück">
          ‹
        </button>
        <h1 className="page-title">Alles mischen</h1>
      </div>
      <p className="muted">
        Fällige Karten aus allen gewählten Modulen zuerst, danach neue Karten abwechselnd aus den
        Modulen. Jedes Modul nutzt die Filter, die du dort eingestellt hast.
      </p>

      <h2 className="section-title">Module</h2>
      <div className="chips">
        {MIX_MODULES.map((m) => (
          <button
            key={m}
            type="button"
            className="chip"
            aria-pressed={selected.includes(m)}
            onClick={() => toggle(m)}
          >
            {titleOf(m)}
          </button>
        ))}
      </div>
      {selected.includes('V') && !placementDone && (
        <p className="status muted">
          Die Vokabel-Einstufung ist noch offen. Ohne sie kommen zuerst die häufigsten Wörter (de,
          que, no …) als neue Karten. Die Einstufung startest du im Modul Vokabeln.
        </p>
      )}
      {errors.map((e) => (
        <p key={e} className="status status-error">
          Konnte nicht geladen werden: {e}
        </p>
      ))}

      <div className="action-bar action-bar-fixed">
        <button
          type="button"
          className="btn btn-primary btn-wide"
          disabled={!selected.length || !ready || !total}
          onClick={onStart}
        >
          {!selected.length
            ? 'Mindestens ein Modul wählen'
            : !ready
              ? 'Lädt …'
              : total
                ? 'Lernen starten'
                : 'Keine passenden Karten'}
        </button>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- session

interface SessionProps {
  pool: Pool;
  modules: ModuleId[];
  data: Data;
  settings: Settings;
  onExit: () => void;
}

function Session({ pool, modules, data, settings, onExit }: SessionProps) {
  // fixed for the session: the pool changes when settings change mid-session
  const [candidates] = useState(() => mixCandidates(modules.map((m) => pool.lists[m] ?? [])));
  const { view, counts, answer, moreNew } = useSession('mix', candidates, settings.newPerDay);

  return (
    <SessionFrame
      view={view}
      counts={counts}
      onExit={onExit}
      moreNew={moreNew}
      doneText="In den gewählten Modulen ist gerade nichts fällig."
    >
      {view.kind === 'card' && (
        <MixCard
          key={`${view.id}-${counts.reviewed}`}
          id={view.id}
          isNew={view.isNew}
          pool={pool}
          data={data}
          settings={settings}
          onAnswer={(a, correct) => void answer(view.id, a, { correct })}
        />
      )}
    </SessionFrame>
  );
}

interface MixCardProps {
  id: string;
  isNew: boolean;
  pool: Pool;
  data: Data;
  settings: Settings;
  onAnswer: (a: Answer, correct?: boolean) => void;
}

/** Renders the card with the view of its own module. */
function MixCard({ id, isNew, pool, data, settings, onAnswer }: MixCardProps) {
  switch (moduleOf(id)) {
    case 'K':
      return data.verbs ? (
        <CardView
          id={id}
          isNew={isNew}
          mode={settings.answerMode}
          lookup={data.verbs.lookup}
          onAnswer={(a) => onAnswer(a)}
        />
      ) : null;
    case 'M': {
      const card = pool.mode.get(id);
      return card && data.mode ? (
        <ModeCardView card={card} file={data.mode} isNew={isNew} onAnswer={onAnswer} />
      ) : null;
    }
    case 'S': {
      const entry = pool.sentences.get(id);
      return entry ? (
        <SentenceCard
          row={entry[0]}
          direction={entry[1]}
          isNew={isNew}
          verbs={data.verbs ?? null}
          onAnswer={(a) => onAnswer(a)}
        />
      ) : null;
    }
    case 'V': {
      const word = pool.vocab.get(id);
      return word ? <VocabCard word={word} isNew={isNew} onAnswer={(a) => onAnswer(a)} /> : null;
    }
    case 'P': {
      const entry = pool.phrases.get(id);
      return entry ? (
        <PhraseCard
          phrase={entry[0]}
          direction={entry[1]}
          isNew={isNew}
          onAnswer={(a) => onAnswer(a)}
        />
      ) : null;
    }
  }
}
