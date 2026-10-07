import { useCallback, useSyncExternalStore } from 'react';

/** Tab state in location.hash, so a reload keeps the current tab. */
export function useHashTab<T extends string>(
  tabs: readonly T[],
  fallback: T,
): [T, (tab: T) => void] {
  const hash = useSyncExternalStore(subscribe, readHash, () => '');
  const current = (tabs as readonly string[]).includes(hash) ? (hash as T) : fallback;
  const setTab = useCallback((tab: T) => {
    window.location.hash = tab;
  }, []);
  return [current, setTab];
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readHash() {
  return window.location.hash.slice(1);
}
