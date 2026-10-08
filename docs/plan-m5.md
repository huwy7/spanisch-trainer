# Plan M5 – Phrasen

Ziel (SPEC §8): kuratierte Liste mit Region-Tags, vom Nutzer stichprobenhaft geprüft.

## Daten

- **Quelle:** `data/curated/phrases.json`, einmalig von Claude Code erstellt, 300–500 Einträge (Ziel ~400). Keine externe Quelle, also keine Attribution nötig.
- **Eintrag:** `{ id, cat, region, es, de, alt?, note? }`
  - `id`: stabil, Präfix der Kategorie plus laufende Nummer (`st-001`). Wird nie neu vergeben, auch nicht nach einer Korrektur am Text.
  - `cat`: `smalltalk` · `hoeflichkeit` · `reaktionen` · `alltag` · `umgangssprachlich` (SPEC §3 P)
  - `region`: `general` · `es` · `latam`
  - `alt`: gleichwertige Varianten (z. B. _¿Qué tal?_ / _¿Cómo estás?_), auf der Rückseite als „auch:“ gezeigt.
  - `note`: kurzer Hinweis zu Register oder Situation (z. B. „locker, unter Freunden“).
- **Harte Regeln:** kein vosotros und kein voseo. Das gilt auch für Spanien-Phrasen, die im Alltag vosotros nutzen; dort wird ustedes formuliert oder die Phrase entfällt.
- **Pipeline:** `npm run data` validiert und kopiert nach `public/data/phrases.json` (im Precache, ~50 KB):
  - Schema, eindeutige IDs, ID-Präfix passend zur Kategorie, keine doppelten spanischen Texte
  - vosotros/voseo: offline über eine feste Formenliste, online zusätzlich über die Wiktionary-Sets wie bei den Sätzen
  - Ein Unit-Test prüft die echte Datei, damit ein Fehler im kuratierten JSON schon in `npm run test` auffällt.

## Karte

- Standard **DE → ES**, umschaltbar auf ES → DE (wie Satzkarten).
- **Karten-IDs** (SPEC §4 präzisiert): `p:<id>` und `p:r:<id>`, mit eigenem Lernstand pro Richtung.
- Vorderseite: Text und Kategorie. Rückseite: Lösung, Varianten, Region-Tag (Allgemein / Spanien / Lateinamerika) und Hinweis.
- Aufdecken + selbst bewerten.

## Setup

- Richtung
- Kategorie-Chips (ohne Auswahl gelten alle)
- Region-Chips: `general` ist immer dabei, Spanien und Lateinamerika sind einzeln abwählbar.
- Reihenfolge der neuen Karten: Die Kategorien sind abwechselnd gemischt, innerhalb einer Kategorie gilt die Reihenfolge der Datei (häufige Phrasen zuerst).

## Tests

Validierung (Schema, IDs, Duplikate, vosotros/voseo), die echte Datei, Filter und Reihenfolge, Karten-IDs.

## Nutzer-Prüfung

Eine Stichprobe von ~40 Einträgen über alle Kategorien und Regionen in `docs/phrases-review.md`. M5 bleibt ◐, bis der Nutzer sie geprüft hat.

## Ergebnis

- 432 Phrasen: Smalltalk 88 · Höflichkeit 74 · Reaktionen 89 · Alltag 109 · Umgangssprachlich 72. Davon allgemein 325, Spanien 57, Lateinamerika 50.
- Bei Unterschieden je Region gibt es Paare (_coger el metro_ / _tomar el camión_, _me he perdido_ / _me perdí_), damit beide Varianten lernbar sind.
- Vulgäres ist als solches markiert (_¡Hostia!_, _Ni de coña_). Sonst bleibt der Slang höflich-umgangssprachlich.
- Die Validierung läuft in `npm run test` gegen die echte Datei und in der Pipeline zusätzlich mit den Wiktionary-Sets.
- **Offen:** die Stichprobe durch den Nutzer (`docs/phrases-review.md`).
