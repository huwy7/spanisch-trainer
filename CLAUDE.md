# CLAUDE.md – Projektregeln

## Grundlage
- Lies vor jeder Aufgabe `SPEC.md`. Sie ist die einzige Wahrheit zu Umfang und Entscheiden.
- Weicht etwas von der SPEC ab oder ist unklar: nachfragen, nicht raten. Nach einem Entscheid die SPEC aktualisieren.
- Nach jedem abgeschlossenen Meilenstein den Status in SPEC §8 nachführen.

## Arbeitsweise
- Pro Meilenstein zuerst einen Plan vorlegen und auf Freigabe warten.
- Kleine, thematische Commits im Conventional-Commits-Format (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).
- Neue Dependencies nur mit kurzer Begründung. Der Stack in SPEC §5 ist fix.
- Am Ende jeder Aufgabe kurz zusammenfassen: was gemacht wurde, was getestet ist, was der Nutzer auf dem iPhone prüfen soll.

## Befehle
- `npm run dev` – Entwicklungsserver
- `npm run build` – Produktionsbuild
- `npm run test` – Vitest
- `npm run data` – Datenpipeline (schreibt nach `public/data/`)

## Harte Regeln
- Keine KI- oder API-Aufrufe zur Laufzeit. Keine Requests ausser zur eigenen Pages-Domain.
- Kein vosotros: weder in generierten Formen noch in importierten Sätzen.
- Karten-IDs sind stabil (siehe SPEC §4). Das Fortschritts-Schema nie ohne Dexie-Migration ändern.
- Konjugations-Engine, Modus-Logik und Datenfilter immer mit Tests.
- Pflicht-Attributionen der Datenquellen müssen in der App sichtbar bleiben.

## Konventionen
- Code, Bezeichner und Kommentare auf Englisch. UI-Texte auf Deutsch.
- Mobile-first für iPhone Safari: Touch-Ziele ≥ 44 px, Bedienung im Daumenbereich unten, Dark Mode, Safe Areas beachten.
- Struktur:
  - `src/` – App (`modules/`, `srs/`, `db/`, `ui/`)
  - `scripts/` – Datenpipeline
  - `data/curated/` – kuratierte Daten (committed)
  - `public/data/` – generierte Daten (gitignored)
  - `docs/` – Berichte
