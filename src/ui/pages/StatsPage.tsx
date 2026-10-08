import { useEffect, useState } from 'react';
import { db } from '../../db/db.ts';
import { parseCardId } from '../../modules/conjugation/engine.ts';
import { TENSE_IDS, TENSES, type TenseId } from '../../modules/conjugation/tenses.ts';
import { loadMode } from '../../data/mode.ts';
import { MODE_CATEGORIES, type ModeCategory } from '../../modules/mode/types.ts';
import { MODULES } from '../../modules/registry.ts';
import { activity, forecast, moduleStats, type ModuleStat } from '../../srs/stats.ts';
import { BarChart } from '../BarChart.tsx';

const ACTIVITY_DAYS = 14;
const FORECAST_DAYS = 7;

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
  now: number;
  dueNow: number;
  reviewsToday: number;
  modules: ModuleStat[];
  activity: number[];
  forecast: number[];
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
    now,
    modules: moduleStats(
      MODULES.map((m) => m.id),
      cards,
      reviews,
      now,
    ),
    activity: activity(reviews, now, ACTIVITY_DAYS),
    forecast: forecast(cards, now, FORECAST_DAYS),
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

const dayAt = (now: number, offset: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d;
};
/** Short weekday, e.g. "Mo". */
const dayLabel = (now: number, offset: number) =>
  dayAt(now, offset).toLocaleDateString('de-CH', { weekday: 'short' }).replace('.', '');
/** Weekday and date, e.g. "Mi, 8.10.". */
const dateLabel = (now: number, offset: number) =>
  dayAt(now, offset).toLocaleDateString('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });
const countLabel = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ModuleTable({ rows }: { rows: ModuleStat[] }) {
  return (
    <table className="module-table">
      <thead>
        <tr>
          <th scope="col">Modul</th>
          <th scope="col">gelernt</th>
          <th scope="col">heute fällig</th>
          <th scope="col">Quote</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.module}>
            <th scope="row">{MODULES.find((m) => m.id === r.module)!.title}</th>
            <td>{r.learned}</td>
            <td>{r.dueToday}</td>
            <td>{r.reviews ? `${Math.round((100 * r.correct) / r.reviews)} %` : '–'}</td>
          </tr>
        ))}
      </tbody>
    </table>
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

          <h2 className="section-title">Module</h2>
          <ModuleTable rows={stats.modules} />

          <h2 className="section-title">Aktivität · letzte {ACTIVITY_DAYS} Tage</h2>
          <BarChart
            title={`Antworten pro Tag, letzte ${ACTIVITY_DAYS} Tage`}
            values={stats.activity}
            axis={stats.activity.map((_, i) =>
              i === stats.activity.length - 1
                ? 'heute'
                : i === 0
                  ? dayLabel(stats.now, i - ACTIVITY_DAYS + 1)
                  : '',
            )}
            describe={(i) =>
              `${dateLabel(stats.now, i - ACTIVITY_DAYS + 1)}: ${countLabel(stats.activity[i]!, 'Antwort', 'Antworten')}`
            }
            labels="peak"
          />

          <h2 className="section-title">Vorschau · fällig in den nächsten {FORECAST_DAYS} Tagen</h2>
          <BarChart
            title={`Fällige Karten pro Tag, nächste ${FORECAST_DAYS} Tage`}
            values={stats.forecast}
            axis={stats.forecast.map((_, i) => (i === 0 ? 'heute' : dayLabel(stats.now, i)))}
            describe={(i) =>
              `${dateLabel(stats.now, i)}: ${countLabel(stats.forecast[i]!, 'Karte', 'Karten')} fällig${i === 0 ? ' (inkl. überfällige)' : ''}`
            }
            labels="all"
          />

          <h2 className="section-title">Trefferquote pro Zeitform</h2>
          {stats.byTense.length === 0 ? (
            <p className="muted small">Noch keine Antworten in der Konjugation.</p>
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
            <p className="muted small">Noch keine Antworten im Modul „Modus wählen“.</p>
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
