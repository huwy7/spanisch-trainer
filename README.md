# Spanisch-Trainer

Persönliche Lern-App für Spanisch (Konjugation, Subjuntivo, Sätze, Vokabeln, Phrasen).
Offline-PWA für das iPhone, gehostet auf GitHub Pages.

- Umfang und Entscheide: [`SPEC.md`](SPEC.md)
- Arbeitsregeln: [`CLAUDE.md`](CLAUDE.md)

## Entwicklung

Voraussetzung: Node ≥ 22.18 (siehe `.nvmrc`).

```sh
npm ci
npm run dev        # Entwicklungsserver
npm run test       # Vitest
npm run data       # Datenpipeline → public/data/ (lädt ~1,4 GB Quellen, gecacht in .cache/)
DATA_OFFLINE=1 npm run data   # ohne Netz: Dev-Sample aus data/dev/ (49 Verben)
npm run build      # Produktionsbuild → dist/
npm run preview    # Build lokal ausliefern (inkl. Service Worker)
npm run lint && npm run typecheck && npm run format:check
```

## Deploy

Jeder Push auf `main` testet, baut und deployt via GitHub Actions auf GitHub Pages.
Einmalig in den Repo-Settings: **Pages → Source = GitHub Actions**.

## Struktur

- `src/modules/conjugation/` – Konjugations-Engine (Zeitformen, Zusammensetzung, Karten-IDs, Antwortprüfung) und UI
- `src/srs/` – FSRS-Scheduler und Lern-Queue
- `src/db/` – IndexedDB (Dexie), Review-Log, Einstellungen, Backup
- `scripts/` – Datenpipeline (Wiktionary, Tatoeba, FrequencyWords) und Fixtures
- `data/curated/` – kuratierte Korrekturen · `data/dev/` – Dev-Sample
- `docs/` – Spike-Bericht und Pläne
