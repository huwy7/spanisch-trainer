import type { Answer } from '../../../srs/scheduler.ts';

interface Props {
  onRate: (a: Answer) => void;
  /** Ratings offered; default all three (SPEC §4: Nochmal / Gut / Leicht). */
  options?: readonly Exclude<Answer, 'hard'>[];
  disabled?: boolean;
}

const LABEL = { again: 'Nochmal', good: 'Gut', easy: 'Leicht' } as const;

export function RatingBar({ onRate, options = ['again', 'good', 'easy'], disabled }: Props) {
  return (
    <div className="action-bar">
      {options.map((a) => (
        <button
          key={a}
          type="button"
          className={`btn btn-rate btn-${a}`}
          disabled={disabled}
          onClick={() => onRate(a)}
        >
          {LABEL[a]}
        </button>
      ))}
    </div>
  );
}
