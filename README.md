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
npm run data       # Datenpipeline → public/data/
npm run build      # Produktionsbuild → dist/
npm run preview    # Build lokal ausliefern (inkl. Service Worker)
npm run lint && npm run typecheck && npm run format:check
```

## Deploy

Jeder Push auf `main` testet, baut und deployt via GitHub Actions auf GitHub Pages.
Einmalig in den Repo-Settings: **Pages → Source = GitHub Actions**.
