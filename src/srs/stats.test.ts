import { describe, expect, it } from 'vitest';
import type { SrsState } from './scheduler.ts';
import { activity, forecast, moduleStats } from './stats.ts';

// Local noon, so day boundaries are unambiguous in any time zone.
const NOW = new Date(2026, 9, 8, 12, 0, 0).getTime();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const card = (module: 'K' | 'V', due: number, reps = 1) => ({
  module,
  srs: { due, reps } as SrsState,
});
const rev = (module: 'K' | 'V', ts: number, answer = 'good') => ({ module, ts, answer });

describe('statistics', () => {
  it('summarises each module: learned, due today, hit rate', () => {
    const cards = [card('K', NOW - DAY), card('K', NOW + 6 * HOUR), card('K', NOW + 2 * DAY)];
    cards.push(card('K', NOW, 0), card('V', NOW + 3 * DAY));
    const reviews = [rev('K', NOW), rev('K', NOW, 'again'), rev('V', NOW - DAY, 'easy')];
    expect(moduleStats(['K', 'V'], cards, reviews, NOW)).toEqual([
      { module: 'K', learned: 3, dueToday: 2, reviews: 2, correct: 1 },
      { module: 'V', learned: 1, dueToday: 0, reviews: 1, correct: 1 },
    ]);
  });

  it('counts answers per day, last entry is today', () => {
    const reviews = [
      rev('K', NOW),
      rev('K', NOW - 11 * HOUR),
      rev('K', NOW - DAY),
      rev('K', NOW - 2 * DAY),
      rev('K', NOW - 3 * DAY), // outside the 3-day window
      rev('K', NOW + DAY), // future (clock change): ignored
    ];
    expect(activity(reviews, NOW, 3)).toEqual([1, 1, 2]);
  });

  it('forecasts due cards per day, overdue cards count today', () => {
    const cards = [
      card('K', NOW - 5 * DAY),
      card('K', NOW + 6 * HOUR),
      card('K', NOW + DAY),
      card('K', NOW + 2 * DAY),
      card('K', NOW + 10 * DAY), // beyond the window
      card('K', NOW, 0), // new card: not scheduled
    ];
    expect(forecast(cards, NOW, 3)).toEqual([2, 1, 1]);
  });
});
