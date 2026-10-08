# SPEC – Spanisch-Trainer

Single Source of Truth. Änderungen am Umfang werden hier nachgeführt, nicht im Chat.

## 1. Ziel

Persönliche Lern-App für Spanisch. Niveau des Nutzers: B2, mit regelmässiger Wiederholung von A2/B1.

Ziele:
- Sicherheit in Konjugation und Zeitformen
- Subjuntivo korrekt **anwenden** (nicht nur bilden)
- Wortschatz erweitern, um schneller Sätze zu bilden
- Gängige Phrasen, Smalltalk, höflicher Slang

Nicht-Ziele: Hören, Sprechen, KI zur Laufzeit, Limits (Leben, Werbung, Sperren), Mehrbenutzer, Sync zwischen Geräten.

Gamification ist kein Nicht-Ziel. Sie ist optional für später vorgesehen (M7), darf aber nie das Lernen einschränken.

## 2. Rahmenbedingungen

- 0 CHF Betriebskosten, kein eigener Server. Hosting: GitHub Pages (öffentliches Repo). Einmaliger manueller Schritt durch den Nutzer: Settings → Pages → Source = "GitHub Actions".
- Zielgerät: iPhone, Safari, als PWA auf dem Homescreen installiert. Muss offline funktionieren.
- Sprachpaar Deutsch–Spanisch.
- Variante: Sätze gemischt (Spanien + Lateinamerika). Konjugation **ohne vosotros**, Plural 2. Person = ustedes. Kein voseo.
- Nur frei nutzbare Datenquellen (keine NC-Lizenzen). Pflicht-Attributionen in der App unter "Info":
  - Tatoeba (tatoeba.org), CC BY 2.0 FR
  - Wiktionary (en + de) via kaikki.org, CC BY-SA 4.0 / GFDL
  - FrequencyWords (Hermit Dave, OpenSubtitles 2018), CC BY-SA 4.0
- Die generierten Daten (`public/data/`) stehen wegen Share-Alike unter CC BY-SA 4.0. Das wird unter "Info" ausgewiesen.

## 3. Module

### K – Konjugation
- Aufgabe: Infinitiv (mit deutscher Bedeutung) + Person + Zeitform → konjugierte Form.
- Personen: yo, tú, él/ella/usted, nosotros, ellos/ellas/ustedes.
- Antwortmodi: **Aufdecken + selbst bewerten** (Standard) oder **Tippen**.
- Tippen: Akzentfehler werden als "fast richtig" angezeigt und als Hard gewertet. Eine Ñ/Akzent-Hilfsleiste über der Tastatur.
- Imperativo (afirmativo + negativo) nur für tú, usted, nosotros, ustedes. Für yo gibt es keine Imperativ-Karten. Die Personen-Liste ist pro Zeitform definiert, damit keine ungültigen Karten-IDs entstehen.
- Filter: Zeitformen, Niveau, nur unregelmässige Verben.
- **Zeitform-Info** (ⓘ-Taste, nicht dauerhaft sichtbar): pro Zeitform Verwendung, Bildungsregel, 2–3 Beispielsätze (ES/DE) und die volle Konjugation aller Personen an Modellverben (hablar, comer, vivir + ein unregelmässiges Verb). Aufrufbar im Setup neben jeder Zeitform und während der Übung neben der Zeitform. Vor dem Aufdecken nur Modellverben (sonst stünde die Lösung da), nach dem Aufdecken zusätzlich die Tabelle des abgefragten Verbs.
- Inhalte werden generiert, also unbegrenzt.
- Quelle der einfachen Formen: en.wiktionary (Pipeline). Die Engine in `src/` bildet daraus zusammengesetzte Zeiten, *ir a* + Infinitiv und den verneinten Imperativ. Deutsche Bedeutung des Infinitivs aus de.wiktionary.
- "Unregelmässig" = Abweichung von der regelmässigen Bildung (Stammwechsel oder irregulär). Reine Schreibanpassungen (buscar → busqué) gelten nicht als unregelmässig.

Zeitformen und Niveau:

| Niveau | Zeitformen |
|---|---|
| A2 | Presente, Pretérito indefinido, Pretérito perfecto, ir a + Infinitiv |
| B1 | Imperfecto, Futuro simple, Condicional simple, Subjuntivo presente, Imperativo (afirmativo + negativo) |
| B2 | Subjuntivo imperfecto (-ra), Pluscuamperfecto, Futuro perfecto, Condicional compuesto, Subjuntivo perfecto, Subjuntivo pluscuamperfecto |

Die Form Subjuntivo imperfecto auf -se wird nur als Alternative angezeigt, nicht abgefragt.

### M – Modus wählen (Indikativ vs. Subjuntivo)
- Satz mit Lücke + Infinitiv in Klammern.
- Schritt 1: Modus wählen (Indikativ / Subjuntivo).
- Schritt 2: Form aufdecken + selbst bewerten.
- Nach der Antwort: kurze Erklärung mit Auslöser-Kategorie.
- Kategorien: Wunsch/Willen, Gefühl, Zweifel/Verneinung, unpersönliche Ausdrücke, Konjunktionen (para que, antes de que …), zeitliche Nebensätze mit Zukunftsbezug (cuando, en cuanto …), si-Sätze, Relativsätze mit unbestimmtem Bezug, ojalá.
- Pflicht: **Kontrastpaare**, bei denen Indikativ richtig ist (creo que / no creo que; cuando + Gewohnheit / cuando + Zukunft).
- Quelle: kuratierte Auslöser-Liste (Repo) + passende Tatoeba-Sätze. Fallback: kuratierte Beispielsätze.

### S – Satzkarten
- Standardrichtung DE → ES (Produktion). Umschaltbar.
- Filter: Zeitform, Niveau.
- Sätze mit vosotros-Formen und mit voseo (vos, tenés, sos …) werden beim Import entfernt.
- Antwort: Aufdecken + selbst bewerten. Pro Satz werden die erkannten Zeitformen angezeigt (mit ⓘ-Info).
- Daten: Chunks pro Niveau, nicht im Precache; werden online im Hintergrund vorgeladen und danach offline genutzt.
- Qualitätsfilter: 3–20 Wörter, keine Duplikate.

### V – Vokabeln
- Häufigkeitsliste (FrequencyWords, lemmatisiert über en.wiktionary), Top ~8000 Lemmata mit deutscher Übersetzung. Lemmata ohne Übersetzung entfallen.
- Deutsche Übersetzungen aus de.wiktionary (Übersetzungen spanischer Einträge + Übersetzungstabellen deutscher Einträge). Kandidaten werden nach Häufigkeit in Tatoeba-Übersetzungen gerankt, 1–3 Wörter pro Karte. Kuratierte Overrides in `data/curated/`.
- **Einstufung** beim ersten Start: Blöcke à 50 Wörter, Wischen "kenne ich" / "kenne ich nicht". Bekannte Wörter werden als gelernt markiert.
- Karte DE → ES, wenn vorhanden mit Beispielsatz aus Tatoeba.

### P – Phrasen
- Einmalig kuratierte Liste mit 300–500 Einträgen, als JSON im Repo.
- Kategorien: Smalltalk, Höflichkeit, Reaktionen/Füllwörter, Alltagssituationen, umgangssprachlich.
- Jeder Eintrag mit Region-Tag: `general` / `es` / `latam`.
- Erstellung einmalig durch Claude Code, Stichprobe durch den Nutzer geprüft.

## 4. Lernsystem

- Spaced Repetition mit FSRS.
- Bewertung mit 3 Buttons: Nochmal / Gut / Leicht. Hard nur intern: entsteht ausschliesslich im Tipp-Modus bei Akzentfehlern. Im Modus "Aufdecken + selbst bewerten" gibt es kein Hard (gewollt).
- Keine Limits. Eine Session endet nie automatisch.
- Reihenfolge: zuerst fällige Karten, dann neue.
- Neue Karten pro Tag: Einstellung, Standard 30, ohne harte Obergrenze.
- Modus "Alles mischen" zieht aus allen Modulen.
- Stabile Karten-IDs:
  - Konjugation: `verb:tense:person`
  - Modus wählen: `m:t:<Tatoeba-ID>` bzw. `m:c:<eigene ID>` (kuratiert)
  - Sätze: `s:<Tatoeba-ID>` (DE → ES) bzw. `s:r:<Tatoeba-ID>` (ES → DE, eigener Lernstand)
  - Vokabeln: Lemma
  - Phrasen: eigene ID
- Statistik minimal: heute fällig, Trefferquote pro Zeitform und Modus-Kategorie (zeigt Schwachstellen).
- Backup: Export/Import des Fortschritts als JSON-Datei.
- Datenschutz gegen Speicher-Räumung (Safari): beim Start `navigator.storage.persist()` anfordern. Liegt der letzte Export mehr als 7 Tage zurück, erscheint ein nicht blockierender Hinweis "Backup erstellen".
- Review-Log ab M1: Jede Bewertung wird als Ereignis gespeichert (Karten-ID, Modul, Bewertung, Zeitstempel, Antwortzeit). Damit lassen sich Gamification-Elemente (Streaks, Punkte, Ziele) später auch rückwirkend berechnen.

## 5. Technik

| Bereich | Entscheid | Grund |
|---|---|---|
| Build | Vite + TypeScript | schnell, Standard |
| UI | React | am robustesten mit Claude Code |
| Styling | Plain CSS mit CSS-Variablen, Dark Mode | keine zusätzliche Toolchain |
| PWA/Offline | vite-plugin-pwa (Workbox) | Service Worker ohne Handarbeit |
| Speicher | IndexedDB via Dexie | Versionierung und Migrationen eingebaut |
| SRS | ts-fsrs | aktueller Standard-Algorithmus, MIT |
| Tests | Vitest | Pflicht für Konjugations-Engine und Filter |
| Lint/Format | ESLint + Prettier (nur Dev) | Fehler früh finden, einheitlicher Code. TypeScript auf 6.0 gepinnt, bis typescript-eslint TS 7 unterstützt |
| Deploy | GitHub Actions → GitHub Pages | gratis, automatisch bei Push |
| Laufzeit-Requests | nur eigene Pages-Domain | Akku, Stabilität, Offline |

UI: mobile-first, Touch-Ziele ≥ 44 px, Bedienelemente im Daumenbereich unten.

Navigation: untere Tab-Leiste mit 3 Tabs (Lernen / Statistik / Info). Module und "Alles mischen" werden im Tab Lernen gewählt. Einstellungen und Backup liegen unter Info.

Updates: Der Service Worker aktualisiert nie automatisch während einer Session. Ein Hinweis bietet "Aktualisieren" / "Später" an.

Branches: `main` ist der Release-Branch (Deploy auf Pages). Jeder Meilenstein kommt als PR.

## 6. Datenpipeline

- `scripts/` (Node/TS): Download → Filter → Niveau-Tagging → JSON in `public/data/`.
  - `public/data/` ist gitignored.
  - Die Pipeline läuft in der GitHub Action vor dem Build. Downloads werden gecacht.
- Quellen: Tatoeba (Sätze), en.wiktionary via kaikki (Verbformen, Lemmatisierung), de.wiktionary via kaikki (Übersetzungen), FrequencyWords (Häufigkeit). Details und Zahlen: `docs/spike-report.md`.
- `data/curated/` ist committed: Subjuntivo-Auslöser, Phrasen, Übersetzungs-Overrides.
- JSON in Chunks pro Modul/Niveau, lazy geladen. Budget gesamt < 15 MB.
- `public/data/manifest.json` enthält einen Hash pro Chunk, damit der Service Worker gezielt aktualisiert.
- Niveau-Heuristik für Sätze: erkannte Zeitform + Häufigkeitsrang des seltensten Worts + Satzlänge. Das ist eine Näherung, kein echtes CEFR-Niveau.

## 7. Entscheide aus dem Daten-Spike (M0b)

Alle offenen Punkte sind geklärt. Zahlen und Begründung: `docs/spike-report.md`.

1. Tatoeba DE–ES: 85'421 Satzpaare nach allen Filtern (Ziel ≥ 10'000 erfüllt).
2. Verbformen: en.wiktionary (CC BY-SA), 12'579 Verben, 99,7 % Übereinstimmung mit Fred Jehle. Jehle selbst ist CC BY-NC-SA und wird nicht verwendet.
3. Deutsche Übersetzungen: de.wiktionary, 78,8 % der Top 8000 abgedeckt. 8000 übersetzbare Lemmata bis Rang ~10'700.
4. Häufigkeitsliste: FrequencyWords 2018, CC BY-SA 4.0.
5. Pipeline: ~1,4 GB Downloads (gecacht, en.wiktionary gzip-komprimiert), ~1 min in Actions.

## 8. Roadmap

Status pro Meilenstein: ☐ offen · ◐ in Arbeit · ☑ fertig

| # | Meilenstein | Definition of Done | Status |
|---|---|---|---|
| M0 | Setup | Repo, Stack, PWA, Deploy via Action. Leere App auf dem iPhone-Homescreen installiert, startet im Flugmodus. | ◐ |
| M0b | Daten-Spike | `docs/spike-report.md` mit Zahlen und Entscheid zu jedem offenen Punkt aus §7. SPEC nachgeführt. | ☑ |
| M1 | Konjugation | Pipeline-Teil Verben (Wiktionary) in der Action, Engine mit Tests (inkl. ≥ 200 Stichproben gegen Referenz-Fixture), alle Zeitformen aus §3, beide Antwortmodi, FSRS, IndexedDB, Backup Export/Import. | ☑ |
| M2 | Modus wählen | Alle Kategorien inkl. Kontrastpaare, Erklärung nach der Antwort, Statistik pro Kategorie. | ☑ |
| M3 | Satzkarten | Pipeline in der Action, Filter nach Zeitform/Niveau, vosotros entfernt, Attribution sichtbar. | ☑ |
| M4 | Vokabeln | Häufigkeitsliste, Einstufung, Beispielsätze. | ☐ |
| M5 | Phrasen | Kuratierte Liste mit Region-Tags, vom Nutzer stichprobenhaft geprüft. | ☐ |
| M6 | Feinschliff | Modus "Alles mischen", Statistik-Ansicht, UI-Politur. | ☐ |
| M7 | Gamification (optional) | Nur bei Bedarf. Belohnende Elemente (z.B. Streaks, Tagesziel, Meilensteine) auf Basis des Review-Logs, ohne Limits oder Sperren. Umfang wird vor dem Start in der SPEC definiert. | ☐ |
