import { useEffect, useState } from 'react';
import { db } from '../../db/db.ts';
import { MODULES, type ModuleId } from '../../modules/registry.ts';
import { BackupReminder } from '../BackupReminder.tsx';

interface Props {
  onOpen: (id: ModuleId) => void;
  onMix: () => void;
}

/** Cards due now per module (learned cards only). */
async function dueByModule(now: number): Promise<Map<ModuleId, number>> {
  const counts = new Map<ModuleId, number>();
  await db()
    .cards.where('srs.due')
    .belowOrEqual(now)
    .each((c) => {
      if (c.srs.reps > 0) counts.set(c.module, (counts.get(c.module) ?? 0) + 1);
    });
  return counts;
}

function DueBadge({ n }: { n: number | undefined }) {
  return n ? <span className="card-due">{n} fällig</span> : null;
}

export function LearnPage({ onOpen, onMix }: Props) {
  const [due, setDue] = useState<Map<ModuleId, number>>(new Map());
  useEffect(() => {
    void dueByModule(Date.now()).then(setDue, () => undefined);
  }, []);
  const total = [...due.values()].reduce((a, b) => a + b, 0);

  return (
    <section className="page">
      <h1 className="page-title">Lernen</h1>
      <BackupReminder />
      <ul className="card-list">
        <li>
          <button type="button" className="card card-mix" onClick={onMix}>
            <span className="card-badge" aria-hidden="true">
              ⇄
            </span>
            <span className="card-body">
              <span className="card-title">Alles mischen</span>
              <span className="card-text">Fällige und neue Karten aus allen Modulen</span>
            </span>
            <DueBadge n={total} />
          </button>
        </li>
        {MODULES.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className="card"
              disabled={!m.available}
              onClick={() => onOpen(m.id)}
            >
              <span className="card-badge" aria-hidden="true">
                {m.id}
              </span>
              <span className="card-body">
                <span className="card-title">{m.title}</span>
                <span className="card-text">
                  {m.available ? m.description : `${m.description} · folgt in ${m.milestone}`}
                </span>
              </span>
              <DueBadge n={due.get(m.id)} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
