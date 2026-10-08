import { useEffect, useSyncExternalStore } from 'react';
import { db } from '../db/db.ts';
import { DEFAULT_SETTINGS, loadSettings, saveSetting, type Settings } from '../db/settings.ts';

let current: Settings | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let loading: Promise<void> | null = null;
function ensureLoaded() {
  loading ??= loadSettings(db()).then(async (s) => {
    if (s.firstUseAt === null) {
      s.firstUseAt = Date.now();
      await saveSetting(db(), 'firstUseAt', s.firstUseAt);
    }
    current = s;
    emit();
  });
  return loading;
}

/** Reloads settings from the database (after a backup import). */
export async function reloadSettings() {
  loading = null;
  await ensureLoaded();
}

export async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  current = { ...(current ?? DEFAULT_SETTINGS), [key]: value };
  emit();
  await saveSetting(db(), key, value);
}

/** Settings from IndexedDB; null until loaded. */
export function useSettings(): Settings | null {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
