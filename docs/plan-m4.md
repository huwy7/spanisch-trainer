# Plan M4 – Vokabeln

Ziel (SPEC §8): Häufigkeitsliste, Einstufung, Beispielsätze.

## Daten (Pipeline)

- **Liste:** Lemmata nach Häufigkeit (FrequencyWords, lemmatisiert). Die Top ~8000 **mit** deutscher Übersetzung kommen in die Liste, Eigennamen sind ausgeschlossen.
- **Wortart und Genus** aus en.wiktionary. Das Genus wird als Tag (m/f/mf) gezeigt, nicht als Artikel (siehe Ergebnis).
- **Deutsch:** de.wiktionary, direkte Übersetzung und Übersetzungstabellen. Ranking wie bei den Verben über Tatoeba-Kookkurrenz mit IDF, passend zur Wortart gefiltert (Nomen gross, Verben auf -en). 1–3 Wörter pro Karte. Kuratierte Overrides in `data/curated/vocab-meanings.json` (z. B. _y → und_).
- **Beispielsatz:** Kürzester geeigneter Tatoeba-Satz (4–12 Wörter, gemeinsamer Satzfilter), der eine Form des Lemmas enthält. Mit Attribution.
- **de.wiktionary** wird nur einmal gelesen, gemeinsam für Verben und Vokabeln (Refactor).
- **Ausgabe:** `vocab.json` (~1 MB, im Precache, also sofort offline).

## Karte

- **DE → ES:** vorne die deutschen Bedeutungen und die Wortart, hinten das spanische Wort (mit Genus-Tag), Beispielsatz ES/DE und Quelle.
- Aufdecken + selbst bewerten.
- **Karten-ID:** `v:<lemma>` (SPEC §4 präzisiert).

## Einstufung (SPEC §3)

- Beim ersten Öffnen: Blöcke à 50 Wörter in Häufigkeitsreihenfolge. **Wischen** nach rechts heisst „kenne ich“, nach links „kenne ich nicht“. Alternativ zwei Knöpfe im Daumenbereich.
- **„Kenne ich“** markiert die Karte als gelernt: Sie bekommt einen FSRS-Zustand wie nach „Leicht“, erzeugt aber **keinen** Eintrag im Review-Log. Sonst wären Statistik und spätere Gamification verfälscht.
- **„Kenne ich nicht“:** Das Wort bleibt neu und kommt normal dran.
- **Abbruch:** jederzeit, die Position wird gespeichert und die Einstufung lässt sich später fortsetzen. Sobald ein Block unter 30 % „kenne ich“ fällt, schlägt die App das Beenden vor, weil die weiteren Wörter seltener sind.

## Tests

Pipeline (Genus/Wortart-Erkennung, Bedeutungs-Filter je Wortart, Beispielsatz-Auswahl, Validierung), Einstufung (Markieren ohne Review-Log, Fortsetzen, Abbruch-Vorschlag), Swipe-Schwelle.
