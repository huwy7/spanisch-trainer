import type { ReactNode } from 'react';

export interface Tab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
}

interface Props<T extends string> {
  tabs: readonly Tab<T>[];
  current: T;
  onSelect: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, current, onSelect }: Props<T>) {
  return (
    <nav className="tab-bar" aria-label="Hauptnavigation">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          className="tab-bar-item"
          aria-current={t.id === current ? 'page' : undefined}
          onClick={() => onSelect(t.id)}
        >
          <span className="tab-bar-icon" aria-hidden="true">
            {t.icon}
          </span>
          <span className="tab-bar-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
