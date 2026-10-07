import { MODULES, type ModuleId } from '../../modules/registry.ts';
import { BackupReminder } from '../BackupReminder.tsx';

interface Props {
  onOpen: (id: ModuleId) => void;
}

export function LearnPage({ onOpen }: Props) {
  return (
    <section className="page">
      <h1 className="page-title">Lernen</h1>
      <BackupReminder />
      <ul className="card-list">
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
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
