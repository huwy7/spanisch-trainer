import type { SrsState } from './scheduler.ts';

export interface QueueInput {
  now: number;
  /** All cards of the session in the order new cards should be introduced. */
  candidates: readonly string[];
  states: ReadonlyMap<string, SrsState>;
  /** New cards already introduced today (from the review log). */
  newToday: number;
  /** Daily allowance for new cards (setting, plus any extra granted in the session). */
  newLimit: number;
  /** Card shown right before; not repeated immediately if anything else is available. */
  previous?: string;
}

/** Cards due within this window may be shown early when nothing else is left (like Anki). */
export const LEARN_AHEAD_MS = 20 * 60_000;

export type Next = { id: string; kind: 'due' | 'new' } | { id: null; reason: 'new-limit' | 'done' };

/**
 * SPEC §4: due cards first (oldest due first), then new cards up to the daily allowance.
 * Never ends the session by itself: the caller offers more new cards on 'new-limit'.
 */
export function nextCard(q: QueueInput): Next {
  let best: { id: string; due: number } | null = null;
  let fallback: { id: string; due: number } | null = null;
  let firstNew: string | null = null;
  let ahead: { id: string; due: number } | null = null;

  for (const id of q.candidates) {
    const s = q.states.get(id);
    if (!s || s.reps === 0) {
      firstNew ??= id === q.previous ? firstNew : id;
      continue;
    }
    if (s.due > q.now) {
      if (s.due <= q.now + LEARN_AHEAD_MS && id !== q.previous && (!ahead || s.due < ahead.due)) {
        ahead = { id, due: s.due };
      }
      continue;
    }
    const pick = { id, due: s.due };
    if (id === q.previous) fallback = pick;
    else if (!best || s.due < best.due) best = pick;
  }

  if (best) return { id: best.id, kind: 'due' };
  if (firstNew && q.newToday < q.newLimit) return { id: firstNew, kind: 'new' };
  if (ahead) return { id: ahead.id, kind: 'due' };
  if (fallback) return { id: fallback.id, kind: 'due' };
  return { id: null, reason: firstNew ? 'new-limit' : 'done' };
}

/** Number of cards due now among the candidates. */
export function countDue(
  candidates: readonly string[],
  states: ReadonlyMap<string, SrsState>,
  now: number,
) {
  let n = 0;
  for (const id of candidates) {
    const s = states.get(id);
    if (s && s.reps > 0 && s.due <= now) n++;
  }
  return n;
}
