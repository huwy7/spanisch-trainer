import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '../../db/db.ts';
import { countNewToday, loadStates, recordAnswer } from '../../db/progress.ts';
import { countDue, nextCard } from '../../srs/queue.ts';
import type { Answer, SrsState } from '../../srs/scheduler.ts';
import type { ModuleId } from '../registry.ts';

export type SessionView =
  | { kind: 'loading' }
  | { kind: 'card'; id: string; isNew: boolean }
  | { kind: 'new-limit' }
  | { kind: 'done' };

export interface SessionCounts {
  due: number;
  newToday: number;
  newLimit: number;
  reviewed: number;
}

/**
 * Drives one learning session over `candidates` (card IDs in new-card order).
 * SPEC §4: due first, then new; never ends by itself (more new cards on request).
 */
export function useSession(module: ModuleId, candidates: readonly string[], newPerDay: number) {
  const [view, setView] = useState<SessionView>({ kind: 'loading' });
  const [counts, setCounts] = useState<SessionCounts>({
    due: 0,
    newToday: 0,
    newLimit: newPerDay,
    reviewed: 0,
  });
  const states = useRef(new Map<string, SrsState>());
  const shownAt = useRef(0);
  const extraNew = useRef(0);
  const newToday = useRef(0);
  const reviewed = useRef(0);
  const previous = useRef<string | undefined>(undefined);

  const advance = useCallback(() => {
    const now = Date.now();
    const newLimit = newPerDay + extraNew.current;
    const next = nextCard({
      now,
      candidates,
      states: states.current,
      newToday: newToday.current,
      newLimit,
      previous: previous.current,
    });
    setCounts({
      due: countDue(candidates, states.current, now),
      newToday: newToday.current,
      newLimit,
      reviewed: reviewed.current,
    });
    if (next.id === null) {
      setView({ kind: next.reason });
      return;
    }
    previous.current = next.id;
    shownAt.current = now;
    setView({ kind: 'card', id: next.id, isNew: next.kind === 'new' });
  }, [candidates, newPerDay]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [s, n] = await Promise.all([
        loadStates(db(), module),
        countNewToday(db(), module, Date.now()),
      ]);
      if (cancelled) return;
      states.current = s;
      newToday.current = n;
      advance();
    })();
    return () => {
      cancelled = true;
    };
  }, [module, advance]);

  const answer = useCallback(
    async (id: string, a: Answer) => {
      const now = Date.now();
      const prev = states.current.get(id);
      const next = await recordAnswer(db(), {
        cardId: id,
        module,
        answer: a,
        prev,
        now,
        durationMs: now - shownAt.current,
      });
      if (!prev || prev.reps === 0) newToday.current++;
      reviewed.current++;
      states.current.set(id, next);
      advance();
    },
    [module, advance],
  );

  const moreNew = useCallback(
    (n = 10) => {
      extraNew.current += n;
      advance();
    },
    [advance],
  );

  return { view, counts, answer, moreNew, retry: advance };
}
