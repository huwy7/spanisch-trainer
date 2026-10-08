import { useEffect, useState } from 'react';
import { db } from '../../db/db.ts';
import { parseCardId } from '../../modules/conjugation/engine.ts';
import { TENSE_IDS, TENSES, type TenseId } from '../../modules/conjugation/tenses.ts';
import { loadMode } from '../../data/mode.ts';
import { MODE_CATEGORIES, type ModeCategory } from '../../modules/mode/types.ts';

interface TenseStat {
  tense: TenseId;
  total: number;
  correct: number;
}

interface RateStat {
  key: string;
  label: string;
  total: number;
  correct: number;
}

interface Stats {
  dueNow: number;
  reviewsToday: number;
  byTense: TenseStat[];
  byCategory: RateStat[];
}

/** Module M: mood correctness per category (review log field `correct`). */
async function categoryStats(reviews: { module: string; cardId: string; correct?: boolean }[]) {
  const mReviews = reviews.filter((r) => r.module === 'M' && r.correct !== undefined);
  if (!mReviews.length) return [];
  const file = await loadMode().catch(() => null);
  if (!file) return [];
  const categoryOf = new Map(file.cards.map((c) => [c.id, c.category]));
  const counts = new Map<ModeCategory, RateStat>();
  for (const r of mReviews) {
    const cat = categoryOf.get(r.cardId);
    if (!cat) continue;
    const s = counts.get(cat) ?? {
      key: cat,
      label: file.categories[cat].label,
      total: 0,
      correct: 0,
    };
    s.total++;
    if (r.correct) s.correct++;
    counts.set(cat, s);
  }
  return MODE_CATEGORIES.map((c) => counts.get(c))
    .filter((s): s is RateStat => !!s)
    .sort((a, b) => a.correct / a.total - b.correct / b.total);
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
    byCategory: await categoryStats(reviews),
  };
}

function RateList({ rows }: { rows: RateStat[] }) {
  return (
    <ul className="rate-list">
      {rows.map((s) => {
        const pct = Math.round((100 * s.correct) / s.total);
        return (
          <li key={s.key} className="rate-row">
            <span className="rate-label">{s.label}</span>
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
  );
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
            <RateList
              rows={stats.byTense.map((t) => ({
                ...t,
                key: t.tense,
                label: TENSES[t.tense].label,
              }))}
            />
          )}
          <p className="muted small">
            „Nochmal“ zählt als falsch, alles andere als richtig. Schwächste Zeitformen zuerst.
          </p>

          <h2 className="section-title">Modus wählen: Trefferquote pro Kategorie</h2>
          {stats.byCategory.length === 0 ? (
            <p className="muted">Noch keine Antworten im Modul „Modus wählen“.</p>
          ) : (
            <RateList rows={stats.byCategory} />
          )}
          <p className="muted small">
            Gezählt wird, ob der Modus (Indikativ/Subjuntivo) richtig gewählt wurde.
          </p>
        </>
      )}
    </section>
  );
}
