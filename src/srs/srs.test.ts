import { describe, expect, it } from 'vitest';
import { countDue, nextCard } from './queue.ts';
import { isNew, newState, review, type SrsState } from './scheduler.ts';

const NOW = Date.UTC(2026, 9, 7, 12);
const MIN = 60_000;
const DAY = 86_400_000;

describe('scheduler', () => {
  it('starts new cards as new', () => {
    expect(isNew(undefined)).toBe(true);
    expect(isNew(newState(NOW))).toBe(true);
  });

  it('schedules again soon and easy far out', () => {
    const again = review(undefined, 'again', NOW);
    const good = review(undefined, 'good', NOW);
    const easy = review(undefined, 'easy', NOW);
    expect(again.due - NOW).toBeLessThan(15 * MIN);
    expect(easy.due).toBeGreaterThan(good.due);
    expect(easy.due - NOW).toBeGreaterThanOrEqual(DAY);
    expect(isNew(good)).toBe(false);
    expect(good.reps).toBe(1);
  });

  it('places hard between again and good for a reviewed card', () => {
    let s = review(undefined, 'good', NOW);
    s = review(s, 'good', s.due);
    const t = s.due;
    const hard = review(s, 'hard', t);
    const good = review(s, 'good', t);
    const again = review(s, 'again', t);
    expect(hard.due).toBeLessThanOrEqual(good.due);
    expect(hard.due).toBeGreaterThan(again.due);
    expect(again.lapses).toBe(1);
  });

  it('round-trips through JSON (backup format)', () => {
    const s = review(undefined, 'good', NOW);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('queue', () => {
  const st = (due: number): SrsState => ({ ...review(undefined, 'good', NOW - DAY), due });
  const candidates = ['a', 'b', 'c', 'n1', 'n2'];
  const states = new Map([
    ['a', st(NOW - 2 * DAY)],
    ['b', st(NOW - DAY)],
    ['c', st(NOW + DAY)],
  ]);
  const base = { now: NOW, candidates, states, newToday: 0, newLimit: 30 };

  it('serves due cards first, oldest first', () => {
    expect(nextCard(base)).toEqual({ id: 'a', kind: 'due' });
  });

  it('serves new cards in candidate order when nothing is due', () => {
    const q = { ...base, now: NOW - 3 * DAY };
    expect(nextCard(q)).toEqual({ id: 'n1', kind: 'new' });
    expect(nextCard({ ...q, previous: 'n1' })).toEqual({ id: 'n2', kind: 'new' });
  });

  it('stops at the daily new-card allowance without ending the session', () => {
    const q = { ...base, now: NOW - 3 * DAY, newToday: 30 };
    expect(nextCard(q)).toEqual({ id: null, reason: 'new-limit' });
    expect(nextCard({ ...q, newLimit: 31 })).toEqual({ id: 'n1', kind: 'new' });
  });

  it('avoids repeating the previous card but allows it as last resort', () => {
    const only = { ...base, candidates: ['a'], newToday: 30 };
    expect(nextCard({ ...only, previous: 'a' })).toEqual({ id: 'a', kind: 'due' });
    expect(nextCard({ ...base, previous: 'a' })).toEqual({ id: 'b', kind: 'due' });
  });

  it('learns ahead up to 20 minutes when nothing else is left', () => {
    const soon = new Map([['x', st(NOW + 5 * MIN)]]);
    const q = { ...base, candidates: ['x'], states: soon };
    expect(nextCard(q)).toEqual({ id: 'x', kind: 'due' });
    const later = new Map([['x', st(NOW + 30 * MIN)]]);
    expect(nextCard({ ...q, states: later })).toEqual({ id: null, reason: 'done' });
  });

  it('reports done when no cards are left at all', () => {
    expect(nextCard({ ...base, candidates: ['c'] })).toEqual({ id: null, reason: 'done' });
  });

  it('counts due cards', () => {
    expect(countDue(candidates, states, NOW)).toBe(2);
  });
});
