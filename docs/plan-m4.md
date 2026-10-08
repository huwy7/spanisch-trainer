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

## Ergebnis (Abschluss M4)

- 8000 Vokabelkarten aus den 12'629 häufigsten Lemmata. 5360 (67 %) davon haben einen Beispielsatz, 4747 der 4778 Nomen ein Genus.
- **Genus als Tag statt Artikel** (m/f/mf): _el agua_ ist feminin, ein generierter Artikel wäre dort falsch.
- Die Stichproben-Prüfung hat drei systematische Fehler gefunden, alle behoben:
  - **Nomen-Lesart bei Verben** (_poder_ = Macht, _ser_ = Sein): Verben mit Konjugationstabelle gelten jetzt als Verben.
  - **Buchstabennamen** (_de_ = D, _te_ = T, _ese_ = S) machten Funktionswörter zu Nomen. Diese Einträge werden jetzt übersprungen.
  - **Verbformen als eigene Wörter** (_era_ = Zeitalter, _son_ = Son, _vale_ = Gutschein): Ist ein Wort auch Form eines anderen Lemmas, bleibt es nur, wenn ≥ 5 % der deutschen Übersetzungen die Bedeutung bestätigen. Das verwirft 636 Lesarten. Darunter sind auch einzelne echte Nomen mit schwacher Bedeutung (_oferta_ = Vorschlag); die Karte wäre dort ohnehin falsch gewesen.
- Kuratiert: Bedeutungen für die häufigsten Funktionswörter (`vocab-meanings.json`), Wortart, wo Wiktionary eine Nebenlesart zuerst führt (`vocab-pos.json`: _padre_, _mierda_, _no_).
- **Bekannte Grenze:** Ab Rang ~3000 sind die Bedeutungen zwar meist richtig, aber nicht kuratiert. Einzelne Treffer sind schief (_urna_ = Sarg). Korrekturen gehören in `vocab-meanings.json`.
