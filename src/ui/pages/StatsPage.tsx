import { useEffect, useState } from 'react';
import { db } from '../../db/db.ts';
import { parseCardId } from '../../modules/conjugation/engine.ts';
import { TENSE_IDS, TENSES, type TenseId } from '../../modules/conjugation/tenses.ts';

interface TenseStat {
  tense: TenseId;
  total: number;
  correct: number;
}

interface Stats {
  dueNow: number;
  reviewsToday: number;
  byTense: TenseStat[];
}

/** SPEC §4 minimal statistics: due today and hit rate per tense (weak spots first). */
async function computeStats(now: number): Promise<Stats> {
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const [cards, reviews] = await Promise.all([db().cards.toArray(), db().reviews.toArray()]);
  const counts = new Map<TenseId, TenseStat>();
  for (const r of reviews) {
    if (r.module !== 'K') continue;
    const ref = parseCardId(r.cardId);
    if (!ref) continue;
    const s = counts.get(ref.tense) ?? { tense: ref.tense, total: 0, correct: 0 };
    s.total++;
    if (r.answer !== 'again') s.correct++;
    counts.set(ref.tense, s);
  }
  return {
    dueNow: cards.filter((c) => c.srs.reps > 0 && c.srs.due <= endOfDay.getTime()).length,
    reviewsToday: reviews.filter((r) => r.ts >= startOfDay.getTime()).length,
    byTense: TENSE_IDS.map((t) => counts.get(t))
      .filter((s): s is TenseStat => !!s)
      .sort((a, b) => a.correct / a.total - b.correct / b.total),
  };
}

export function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    void computeStats(Date.now()).then(setStats);
  }, []);

  return (
    <section className="page">
      <h1 className="page-title">Statistik</h1>
      {!stats ? (
        <p className="muted">Lädt …</p>
      ) : (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-value">{stats.dueNow}</span>
              <span className="stat-label">heute fällig</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats.reviewsToday}</span>
              <span className="stat-label">heute beantwortet</span>
            </div>
          </div>

          <h2 className="section-title">Trefferquote pro Zeitform</h2>
          {stats.byTense.length === 0 ? (
            <p className="muted">Noch keine Antworten in der Konjugation.</p>
          ) : (
            <ul className="rate-list">
              {stats.byTense.map((s) => {
                const pct = Math.round((100 * s.correct) / s.total);
                return (
                  <li key={s.tense} className="rate-row">
                    <span className="rate-label">{TENSES[s.tense].label}</span>
                    <span className="rate-bar" aria-hidden="true">
                      <span style={{ width: `${pct}%` }} />
                    </span>
                    <span className="rate-value">
                      {pct} % <span className="muted">({s.total})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="muted small">
            „Nochmal“ zählt als falsch, alles andere als richtig. Schwächste Zeitformen zuerst.
          </p>
        </>
      )}
    </section>
  );
}
