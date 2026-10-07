export function InfoPage() {
  return (
    <section className="page">
      <h1 className="page-title">Info</h1>

      <h2 className="section-title">Datenquellen</h2>
      <p className="muted">
        Die Quellen und ihre Lizenzen werden hier aufgeführt, sobald Inhalte importiert sind.
      </p>

      <h2 className="section-title">Version</h2>
      <p className="muted">
        Build <code>{__APP_VERSION__}</code> · {__BUILD_DATE__}
      </p>
    </section>
  );
}
