import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AnswerMode } from '../../../db/settings.ts';
import { InfoButton } from '../../../ui/Sheet.tsx';
import type { Answer } from '../../../srs/scheduler.ts';
import { conjugate, gradeAnswer, parseCardId, type Grade, type VerbLookup } from '../engine.ts';
import { personLabel, TENSES } from '../tenses.ts';
import { AccentBar } from './AccentBar.tsx';
import { RatingBar } from './RatingBar.tsx';
import { TenseInfoSheet } from './TenseInfoSheet.tsx';

interface Props {
  id: string;
  isNew: boolean;
  mode: AnswerMode;
  lookup: VerbLookup;
  onAnswer: (a: Answer) => void;
}

const GRADE_TEXT: Record<Grade, string> = {
  correct: 'Richtig',
  accent: 'Fast richtig – Akzent oder ñ fehlt',
  wrong: 'Leider falsch',
};

/** One conjugation card: question, then reveal (self-rating) or typed answer (graded). */
export function CardView({ id, isNew, mode, lookup, onAnswer }: Props) {
  const ref = parseCardId(id);
  const verb = ref ? lookup(ref.inf) : undefined;
  const solution = ref && verb ? conjugate(verb, ref.tense, ref.person, lookup) : null;

  const [revealed, setRevealed] = useState(false);
  const [input, setInput] = useState('');
  const [grade, setGrade] = useState<Grade | null>(null);
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'type') inputRef.current?.focus();
  }, [id, mode]);

  if (!ref || !verb || !solution) {
    // Card from an older data version: skip it as "good" would distort stats → treat as again.
    return (
      <div className="card-stage">
        <p className="muted">Diese Karte ist in den aktuellen Daten nicht mehr vorhanden.</p>
        <div className="action-bar">
          <button type="button" className="btn btn-primary" onClick={() => onAnswer('again')}>
            Weiter
          </button>
        </div>
      </div>
    );
  }

  const rate = (a: Answer) => {
    if (busy) return;
    setBusy(true);
    onAnswer(a);
  };

  const check = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setGrade(gradeAnswer(input, solution));
    setRevealed(true);
  };

  const insert = (char: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart ?? input.length;
    const end = el.selectionEnd ?? input.length;
    const next = input.slice(0, start) + char + input.slice(end);
    setInput(next);
    requestAnimationFrame(() => el.setSelectionRange(start + 1, start + 1));
  };

  const tense = TENSES[ref.tense];

  return (
    <div className="card-stage">
      <div className="prompt">
        <div className="prompt-meta">
          <span className={`level level-${tense.level}`}>{tense.level}</span>
          <span>{tense.label}</span>
          <InfoButton label={`Info: ${tense.label}`} onClick={() => setInfoOpen(true)} />
          {isNew && <span className="badge-new">neu</span>}
          {verb.irregular && <span className="badge-irr">unregelmässig</span>}
        </div>
        <div className="prompt-verb" lang="es">
          {verb.inf}
        </div>
        <div className="prompt-meaning">{verb.de.join(', ')}</div>
        <div className="prompt-person" lang="es">
          {personLabel(ref.person, ref.tense)}
        </div>
      </div>

      {infoOpen && (
        <TenseInfoSheet
          tense={ref.tense}
          lookup={lookup}
          currentVerb={revealed ? verb : undefined}
          onClose={() => setInfoOpen(false)}
        />
      )}

      {revealed && (
        <div className={`solution ${grade ? `solution-${grade}` : ''}`} aria-live="polite">
          {grade && <div className="solution-grade">{GRADE_TEXT[grade]}</div>}
          {grade && grade !== 'correct' && (
            <div className="solution-given" lang="es">
              Deine Antwort: <s>{input.trim()}</s>
            </div>
          )}
          <div className="solution-answer" lang="es">
            {solution.answer}
          </div>
          {solution.alternatives.length > 0 && (
            <div className="solution-alt" lang="es">
              auch: {solution.alternatives.join(', ')}
            </div>
          )}
        </div>
      )}

      {mode === 'reveal' &&
        (revealed ? (
          <RatingBar onRate={rate} disabled={busy} />
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
        ))}

      {mode === 'type' && !revealed && (
        <form className="answer-form" onSubmit={check}>
          <input
            ref={inputRef}
            className="answer-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            lang="es"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder="Form eingeben"
            aria-label="Antwort"
          />
          <AccentBar onInsert={insert} />
          <div className="action-bar">
            <button type="submit" className="btn btn-primary btn-wide" disabled={!input.trim()}>
              Prüfen
            </button>
          </div>
        </form>
      )}

      {mode === 'type' && revealed && grade === 'correct' && (
        <RatingBar onRate={rate} options={['good', 'easy']} disabled={busy} />
      )}
      {mode === 'type' && revealed && grade && grade !== 'correct' && (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={busy}
            onClick={() => rate(grade === 'accent' ? 'hard' : 'again')}
          >
            Weiter
          </button>
        </div>
      )}
    </div>
  );
}
