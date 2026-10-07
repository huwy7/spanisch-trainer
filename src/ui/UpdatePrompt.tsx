import { useRegisterSW } from 'virtual:pwa-register/react';

/** Non-blocking banner: offline readiness and available updates. */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="toast" role="status">
      <span className="toast-text">
        {needRefresh ? 'Neue Version verfügbar.' : 'App ist offline verfügbar.'}
      </span>
      {needRefresh && (
        <button
          type="button"
          className="toast-button"
          onClick={() => void updateServiceWorker(true)}
        >
          Aktualisieren
        </button>
      )}
      <button type="button" className="toast-button toast-button-secondary" onClick={close}>
        {needRefresh ? 'Später' : 'OK'}
      </button>
    </div>
  );
}
