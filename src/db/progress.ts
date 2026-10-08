import type { ModuleId } from '../modules/registry.ts';
import { isNew, review, type Answer, type SrsState } from '../srs/scheduler.ts';
import type { AppDB } from './db.ts';

/** Start of the local day (new-card counting resets at local midnight). */
export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export async function loadStates(db: AppDB, module: ModuleId): Promise<Map<string, SrsState>> {
  const rows = await db.cards.where('module').equals(module).toArray();
  return new Map(rows.map((r) => [r.id, r.srs]));
}

export async function countNewToday(db: AppDB, module: ModuleId, now: number): Promise<number> {
  return db.reviews
    .where('ts')
    .aboveOrEqual(startOfDay(now))
    .filter((r) => r.module === module && r.wasNew)
    .count();
}

/** Applies an answer: updates the card state and appends to the review log atomically. */
export async function recordAnswer(
  db: AppDB,
  args: {
    cardId: string;
    module: ModuleId;
    answer: Answer;
    prev: SrsState | undefined;
    now: number;
    durationMs: number;
    correct?: boolean;
  },
): Promise<SrsState> {
  const next = review(args.prev, args.answer, args.now);
  await db.transaction('rw', db.cards, db.reviews, async () => {
    await db.cards.put({ id: args.cardId, module: args.module, srs: next });
    await db.reviews.add({
      cardId: args.cardId,
      module: args.module,
      answer: args.answer,
      ts: args.now,
      durationMs: Math.max(0, Math.round(args.durationMs)),
      wasNew: isNew(args.prev),
      ...(args.correct === undefined ? {} : { correct: args.correct }),
    });
  });
  return next;
}

/**
 * Placement test (SPEC §3 V): marks cards as learned with an FSRS state like after "Leicht",
 * without a review-log entry (statistics and gamification count real answers only).
 * Cards that already have progress are left untouched.
 */
export async function markKnown(
  db: AppDB,
  cardIds: readonly string[],
  module: ModuleId,
  now: number,
): Promise<number> {
  return db.transaction('rw', db.cards, async () => {
    const existing = new Set(
      (await db.cards.bulkGet([...cardIds])).filter(Boolean).map((c) => c!.id),
    );
    const fresh = cardIds.filter((id) => !existing.has(id));
    await db.cards.bulkPut(
      fresh.map((id) => ({ id, module, srs: review(undefined, 'easy', now) })),
    );
    return fresh.length;
  });
}
