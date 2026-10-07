/**
 * Asks the browser to keep IndexedDB data (SPEC §4: protection against Safari eviction).
 * Returns whether storage is persistent; failures are not fatal.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
