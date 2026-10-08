# Plan M6 – Feinschliff

Ziel (SPEC §8): Modus „Alles mischen“, Statistik-Ansicht, UI-Politur.

## Alles mischen (SPEC §4)

- Eigener Eintrag zuoberst im Tab Lernen. Im Setup sind die Module per Chip wählbar, Standard ist alles.
- **Kartenauswahl:** Jedes Modul liefert seine Kandidaten mit den **Filtern, die im Modul eingestellt sind** (Zeitformen, Niveaus, Richtung, Kategorien …). So bleibt vorhersagbar, was kommt, und es braucht keine zweite Filterwelt.
- **Reihenfolge:** wie überall erst fällige Karten (älteste zuerst, über alle Module), dann neue. Die neuen Karten kommen abwechselnd aus den Modulen.
- **Neue Karten pro Tag:** Im Mischmodus zählt die Summe über alle Module gegen das Tageslimit. In den einzelnen Modulen gilt das Limit wie bisher pro Modul.
- Bewertet wird im jeweiligen Modul: Review-Log und Statistik bleiben pro Modul korrekt. Das Modul wird aus dem Präfix der Karten-ID abgeleitet (`m:`, `s:`, `v:`, `p:`, sonst Konjugation). Dazu gibt es einen Test.
- Vokabeln ohne abgeschlossene Einstufung: Das Setup weist darauf hin, sonst kämen zuerst _de_, _que_, _no_ als neue Karten.
- Satzkarten: Es werden nur die Niveaus geladen, die im Modul gewählt sind.

## Statistik-Ansicht

- **Pro Modul:** gelernte Karten, heute fällig, Trefferquote (wie bisher: „Nochmal“ zählt als falsch).
- **Aktivität:** Antworten pro Tag über die letzten 14 Tage, als Balken.
- **Vorschau:** fällige Karten in den nächsten 7 Tagen.
- Die Trefferquoten pro Zeitform und pro Modus-Kategorie bleiben.

## UI-Politur

- **Gemeinsamer Session-Rahmen** (Kopfzeile mit Zählern, Tagesziel, „Alles gelernt“) statt fünf Kopien: weniger Code, überall gleiches Verhalten.
- Im Tab Lernen zeigt jedes Modul seine fälligen Karten als Zahl.
- Kleinere Unstimmigkeiten aus den bisherigen Screenshots bereinigen.

## Tests

Modul aus Karten-ID, Mischen der Kandidaten, Zählen über alle Module, Statistik-Berechnung (Tagesbuckets, Vorschau).
