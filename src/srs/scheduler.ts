import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs';

/**
 * Answer buttons (SPEC §4): Nochmal / Gut / Leicht. `hard` is internal only
 * (typing mode, accent mistakes).
 */
export type Answer = 'again' | 'hard' | 'good' | 'easy';

/** Persisted FSRS state of one card; dates as epoch milliseconds (IndexedDB + JSON backup). */
export interface SrsState {
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview: number | null;
}

const RATING: Record<Answer, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const scheduler = fsrs({ enable_fuzz: true });

function toCard(s: SrsState): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: 0,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview === null ? undefined : new Date(s.lastReview),
  };
}

function fromCard(c: Card): SrsState {
  return {
    due: c.due.getTime(),
    stability: c.stability,
    difficulty: c.difficulty,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    lastReview: c.last_review ? c.last_review.getTime() : null,
  };
}

export function newState(now: number): SrsState {
  return fromCard(createEmptyCard(new Date(now)));
}

/** Next state after answering; `prev` undefined means the card is new. */
export function review(prev: SrsState | undefined, answer: Answer, now: number): SrsState {
  const card = toCard(prev ?? newState(now));
  return fromCard(scheduler.next(card, new Date(now), RATING[answer]).card);
}

export const isNew = (s: SrsState | undefined) => !s || s.state === State.New;
