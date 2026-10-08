# Plan M2 – Modus wählen (Indikativ vs. Subjuntivo)

Ziel (SPEC §8): Alle Kategorien inkl. Kontrastpaare, Erklärung nach der Antwort, Statistik pro Kategorie.

## Ablauf einer Karte (SPEC §3)

1. Satz mit Lücke und Infinitiv in Klammern: _Espero que ___ (venir) mañana._
2. Schritt 1: **Indikativ** oder **Subjuntivo** wählen (zwei grosse Buttons im Daumenbereich).
3. Danach: richtig/falsch, die Form in der Lücke, Erklärung (Kategorie + Regel, Auslöser hervorgehoben), deutsche Übersetzung.
4. Schritt 2: Modus falsch → nur „Weiter“ (gewertet als Nochmal). Modus richtig → selbst bewerten, ob die Form sass (Nochmal / Gut / Leicht).

## Daten

- `data/curated/mode-triggers.json`: Kategorien (SPEC §3) mit deutscher Erklärung und Auslöser-Mustern. Jedes Muster legt fest, welcher Modus erwartet wird: `subj`, `ind` (Kontrast) oder `both`. Bei `both` entscheidet die gefundene Form, zum Beispiel bei _cuando_ Zukunft vs. Gewohnheit, bei _aunque_ Hypothese vs. Tatsache oder bei _si_ irreal vs. real.
- `data/curated/mode-sentences.json`: kuratierte Sätze, vor allem für Kategorien, die Tatoeba kaum abdeckt (unpersönliche Ausdrücke, Relativsätze mit unbestimmtem Bezug, _sin que_, _a menos que_), und **Kontrastpaare** (_creo que_ / _no creo que_, _cuando_ + Gewohnheit / + Zukunft). Erstellt von Claude Code, Stichprobe durch den Nutzer.
- **Pipeline:** Tatoeba-Satz → Auslöser per Muster → erstes finites Verb nach dem Auslöser (Klitika und _no_ werden übersprungen). Das Verb wird über die Wiktionary-Formtabellen aller 8444 Verben eindeutig analysiert (Infinitiv, Zeitform, Person, Modus). Zusammengesetzte Formen (_haya/hubiera/he/había_ + Partizip) werden als Ganzes zur Lücke.
  - Verworfen: mehrdeutige Formen, Modus passt nicht zur Musterregel, vosotros/voseo (gemeinsamer Satzfilter, wird in M3 wiederverwendet), Länge ausserhalb 3–20 Wörter.
- Ausgabe `public/data/mode.json`, im Precache.

## Stabile Karten-IDs (neu in SPEC §4)

- Tatoeba: `m:t:<tatoeba-id>`
- Kuratiert: `m:c:<eigene-id>`

## Struktur

- Pipeline-Refactor: Wiktionary und Tatoeba werden einmal geladen und von Verben **und** Modus genutzt (später auch Sätze und Vokabeln).
- `src/modules/mode/`: Typen, Kartenlogik (Lücke, Prüfung), UI. Die Session nutzt die bestehende Queue/FSRS (`useSession`, Modul `M`).
- Review-Log: optionales Feld `correct` (Modus richtig?). Es ist kein Index, deshalb braucht es keine Schema-Migration. Statistik: Trefferquote pro Kategorie.
- Neue Karten: deterministisch über Kategorien gemischt, Kontrastpaare direkt nacheinander.

## Tests

Auslöser-Muster, Verb-Erkennung nach dem Auslöser, Modus-Bestimmung inkl. zusammengesetzter Formen, Lückenbildung, Satzfilter (vosotros/voseo), Validierung der kuratierten Dateien (jede Kategorie ≥ 1 Kontrast-/Beispielsatz, Lösung passt zum Infinitiv laut Engine).

## Bewusst nicht in M2

- Niveau-Filter für Modus-Karten (die Kategorien sind B1/B2-Stoff).
- Freies Tippen der Form (SPEC: Aufdecken + selbst bewerten).
