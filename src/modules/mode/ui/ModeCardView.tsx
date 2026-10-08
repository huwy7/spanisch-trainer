import { useState } from 'react';
import type { Answer } from '../../../srs/scheduler.ts';
import { RatingBar } from '../../conjugation/ui/RatingBar.tsx';
import { answerOf, MOOD_LABEL, segments } from '../card.ts';
import type { ModeCard, ModeFile, Mood } from '../types.ts';

interface Props {
  card: ModeCard;
  file: ModeFile;
  isNew: boolean;
  onAnswer: (a: Answer, correct: boolean) => void;
}

/**
 * SPEC §3 M: sentence with gap + infinitive → choose the mood → form, explanation and
 * translation → wrong mood counts as Nochmal; right mood: self-rating for the form.
 */
export function ModeCardView({ card, file, isNew, onAnswer }: Props) {
  const [choice, setChoice] = useState<Mood | null>(null);
  const [busy, setBusy] = useState(false);
  const correct = choice === card.mood;
  const parts = segments(card);

  const rate = (a: Answer) => {
    if (busy) return;
    setBusy(true);
    onAnswer(a, correct);
  };

  return (
    <div className="card-stage">
      <div className="prompt prompt-sentence">
        <div className="prompt-meta">
          <span>{file.categories[card.category].label}</span>
          {isNew && <span className="badge-new">neu</span>}
        </div>
        <p className="sentence" lang="es">
          {parts.map((p, i) =>
            p.kind === 'gap' ? (
              choice ? (
                <mark key={i} className={`gap-filled gap-${correct ? 'ok' : 'wrong'}`}>
                  {p.text}
                </mark>
              ) : (
                <span key={i} className="gap-blank">
                  ___ <span className="gap-inf">({card.inf})</span>
                </span>
              )
            ) : p.kind === 'trigger' && choice ? (
              <strong key={i} className="trigger">
                {p.text}
              </strong>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </p>
        {choice && <p className="sentence-de">{card.de}</p>}
      </div>

      {choice && (
        <div className={`solution solution-${correct ? 'correct' : 'wrong'}`} aria-live="polite">
          <div className="solution-grade">
            {correct
              ? `Richtig: ${MOOD_LABEL[card.mood]}`
              : `Falsch – richtig ist ${MOOD_LABEL[card.mood]}`}
          </div>
          <div className="solution-answer" lang="es">
            {answerOf(card)}
          </div>
          {card.alternatives.length > 0 && (
            <div className="solution-alt" lang="es">
              auch: {card.alternatives.join(', ')}
            </div>
          )}
          <p className="explanation">{file.explanations[card.explanation]}</p>
          {card.tatoebaId !== undefined && (
            <a
              className="attribution"
              href={`https://tatoeba.org/de/sentences/show/${card.tatoebaId}`}
              target="_blank"
              rel="noreferrer"
            >
              Satz #{card.tatoebaId} · Tatoeba (CC BY 2.0 FR)
            </a>
          )}
        </div>
      )}

      {!choice && (
        <div className="action-bar">
          {(['ind', 'subj'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="btn btn-secondary btn-mood"
              onClick={() => setChoice(m)}
            >
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      )}
      {choice && !correct && (
        <div className="action-bar">
          <button
            type="button"
            className="btn btn-primary btn-wide"
            disabled={busy}
            onClick={() => rate('again')}
          >
            Weiter
          </button>
        </div>
      )}
      {choice && correct && <RatingBar onRate={rate} disabled={busy} />}
    </div>
  );
}
