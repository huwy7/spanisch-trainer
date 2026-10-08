import { startOfDay } from '../db/progress.ts';
import type { ModuleId } from '../modules/registry.ts';
import type { SrsState } from './scheduler.ts';

export interface ModuleStat {
  module: ModuleId;
  /** Cards with at least one successful learning step (incl. placement). */
  learned: number;
  /** Learned cards due by the end of today. */
  dueToday: number;
  reviews: number;
  /** Answers other than "Nochmal" (SPEC §4 hit rate). */
  correct: number;
}

interface CardLike {
  module: ModuleId;
  srs: SrsState;
}
interface ReviewLike {
  module: ModuleId;
  answer: string;
  ts: number;
}

/** Local day index: midnight of day `i` days after `from` (DST-safe via Date). */
function dayStart(from: number, i: number): number {
  const d = new Date(from);
  d.setDate(d.getDate() + i);
  return startOfDay(d.getTime());
}

export function moduleStats(
  modules: readonly ModuleId[],
  cards: readonly CardLike[],
  reviews: readonly ReviewLike[],
  now: number,
): ModuleStat[] {
  const endOfToday = dayStart(now, 1);
  const stats = new Map<ModuleId, ModuleStat>(
    modules.map((m) => [m, { module: m, learned: 0, dueToday: 0, reviews: 0, correct: 0 }]),
  );
  for (const c of cards) {
    const s = stats.get(c.module);
    if (!s || c.srs.reps === 0) continue;
    s.learned++;
    if (c.srs.due < endOfToday) s.dueToday++;
  }
  for (const r of reviews) {
    const s = stats.get(r.module);
    if (!s) continue;
    s.reviews++;
    if (r.answer !== 'again') s.correct++;
  }
  return [...stats.values()];
}

/** Answers per local day for the last `days` days, oldest first (last entry = today). */
export function activity(reviews: readonly ReviewLike[], now: number, days: number): number[] {
  const starts = Array.from({ length: days + 1 }, (_, i) => dayStart(now, i - days + 1));
  const counts = new Array<number>(days).fill(0);
  for (const r of reviews) {
    if (r.ts < starts[0]! || r.ts >= starts[days]!) continue;
    let i = days - 1;
    while (r.ts < starts[i]!) i--;
    counts[i]!++;
  }
  return counts;
}

/** Learned cards due per local day for the next `days` days; today includes overdue cards. */
export function forecast(cards: readonly CardLike[], now: number, days: number): number[] {
  const ends = Array.from({ length: days }, (_, i) => dayStart(now, i + 1));
  const counts = new Array<number>(days).fill(0);
  for (const c of cards) {
    if (c.srs.reps === 0) continue;
    const i = ends.findIndex((end) => c.srs.due < end);
    if (i >= 0) counts[i]!++;
  }
  return counts;
}
