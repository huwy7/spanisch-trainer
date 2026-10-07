import { MODULES } from '../../modules/registry.ts';

export function LearnPage() {
  return (
    <section className="page">
      <h1 className="page-title">Lernen</h1>
      <ul className="card-list">
        {MODULES.map((m) => (
          <li key={m.id}>
            <button type="button" className="card" disabled={!m.available}>
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
