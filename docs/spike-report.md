# M0b – Daten-Spike: Bericht und Entscheide

Stand: 2026-10-07. Messungen aus GitHub Actions (`scripts/spike/analyze.ts`, Workflow „Data spike“).
Der Dev-Container erreicht Tatoeba und kaikki.org nicht (Netzwerk-Policy). Die Analyse lief deshalb dort, wo auch die echte Pipeline laufen wird.

## Kurzfassung

| #   | Offener Punkt (SPEC §7)                         | Ergebnis                                                                                                 | Entscheid                                                |
| --- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | DE–ES-Satzpaare nach Filtern (Ziel ≥ 10'000)    | **85'421**                                                                                               | Tatoeba, Ziel deutlich erfüllt                           |
| 2   | Quelle der Verbformen                           | Jehle ist **CC BY-NC-SA** (nicht frei). Wiktionary stimmt zu **99,7 %** mit Jehle überein, 12'579 Verben | **Wiktionary (kaikki, CC BY-SA)**. Jehle nicht verwendet |
| 3   | Deutsche Übersetzungen für die Häufigkeitsliste | de.wiktionary deckt **78,8 %** der Top 8000 ab. 8000 übersetzbare Lemmata bis Rang 10'659                | **de.wiktionary** (Übersetzungen + Übersetzungstabellen) |
| 4   | Lizenz der Häufigkeitsliste                     | FrequencyWords 2018 (OpenSubtitles): **CC BY-SA 4.0**                                                    | **FrequencyWords**, lemmatisiert über en.wiktionary      |
| 5   | Download-Grösse und Laufzeit in Actions         | ~430 MB Downloads, Analyse **61–83 s** inkl. Download                                                    | Unkritisch. Downloads per `actions/cache`                |

## 1. Tatoeba ES–DE

- 442'407 spanische und 782'626 deutsche Sätze. **91'245** spanische Sätze haben mindestens eine direkte deutsche Übersetzung.
- Filter: Länge 3–20 Wörter (−4'320), vosotros (−695 = 0,8 %), voseo (−526), Duplikate (−283). **Ergebnis: 85'421 Paare.**
- Die vosotros-Erkennung nutzt 145'412 eindeutige vosotros-Formen aus Wiktionary sowie die Pronomen (vosotros/as, vuestro/a/s, os). Stichproben sind korrekt, z. B. „Apagad la televisión.“ und „Os llamo cuando oiga algo.“
- Ein bekannter Fehlgriff: „Thomas está estudiando en Manaos“ (Ortsname = vosotros-Form von _manar_). Solche Fehler entfernen nur zu viel, nie zu wenig. Das ist unkritisch, wird in M3 aber über eine Namensliste nachgeschärft.
- **Voseo** (z. B. „¿Tenés…?“, „Sos…“) wird ebenfalls entfernt. Grund: Die Konjugation verzichtet auf voseo, Sätze damit würden widersprüchliche Formen zeigen. _Neu in der SPEC festgehalten._

**Zeitformen** (Mehrfachzählung, heuristisch): presente 47'407, indefinido 17'372, imperfecto 6'433, perfecto ~3'200, futuro 2'713, condicional 1'910, imperativo 1'834, subj. imperfecto 1'489, ir a + Inf. 869.
Grenze der Heuristik: Homographen verfälschen die Zuordnung (z. B. _meses_ ↔ _mesar_ → falsches „subj_presente“). In M3 löst die Pipeline Mehrdeutigkeiten über den Häufigkeitsrang des Lemmas auf. Die Zeitform-Filter bleiben eine Näherung (wie in SPEC §6 bereits festgehalten).

**Modus-Kandidaten** (Auslöser · davon mit Subjuntivo-Form): ojalá 98·98, para que 83·83, quiero que 126·126, espero que 114·113, no creo que 68·65, antes de que 70·69, aunque 87·55, cuando 1'173·393, creo que 499·174.
→ Für Modul M sind genug echte Sätze vorhanden, auch für **Kontrastpaare** (_creo que_ + Indikativ, _cuando_ + Gewohnheit). Seltene Auslöser (_es importante que_, _sin que_, _a menos que_: je 8–11 Sätze) werden mit kuratierten Sätzen ergänzt (wie in der SPEC vorgesehen).

**Niveau-Heuristik** (seltenstes Wort pro Satz, Rang in der Lemma-Liste): ≤ 1000: 29'768 · ≤ 3000: 26'150 · ≤ 8000: 15'570 · > 8000: 5'559 · unbekannt: 8'374. Die Verteilung ist gut für eine Stufung nutzbar.

**Grösse:** alle Paare als JSON 11,3 MB (gzip 3,6 MB). Mit nur einer DE-Übersetzung pro Satz und kompakten Feldern schätze ich ≤ 9 MB. Aufgeteilt in Chunks pro Niveau und lazy geladen bleibt das im Budget von 15 MB. Falls nötig, lässt sich in M3 eine Obergrenze pro Niveau setzen.

## 2. Verbformen

| Quelle                   | Lizenz              | Umfang                                                            | Bewertung                                                                       |
| ------------------------ | ------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Fred Jehle (ghidinelli)  | **CC BY-NC-SA 3.0** | 637 Verben, alle Zeiten, nur -ra                                  | Nicht kommerziell → widerspricht SPEC §2 („frei nutzbar“). **Nicht verwendet.** |
| en.wiktionary via kaikki | CC BY-SA 4.0 / GFDL | 12'579 Verben mit vollständigen Tabellen inkl. -ra/-se, Imperativ | **Gewählt**                                                                     |

- **Vollständigkeit:** 97 % der Top-300- bis Top-2000-Verben (nach Häufigkeit) haben alle 8 einfachen Zeitformen × Personen. Die „unvollständigen“ sind fast nur Lemmatisierungs-Artefakte der Häufigkeitsliste (_a, se, hecho, había, persona …_), keine echten Verben.
- **Genauigkeit (Abgleich mit Jehle als unabhängige Referenz):** 24'455 Formen verglichen, **99,7 % identisch**. Die Abweichungen:
  - _crie/crié, hui/huí, frio/frió_: Wiktionary folgt der RAE-Orthographie von 2010 (ohne Akzent) und ist korrekt. Jehle zeigt die alte Schreibung.
  - _invirtéramos_ (Jehle) ist ein Tippfehler in Jehle, Wiktionary hat korrekt _invirtiéramos_.
  - _arrepentirse_: Artefakt meines Abgleichs (reflexives Lemma), kein Datenfehler.
- **Konsequenz für M1:** Die einfachen Formen kommen aus Wiktionary (Pipeline → `public/data/`). Die Engine in `src/` setzt daraus zusammengesetzte Zeiten (haber + Partizip), _ir a_ + Infinitiv und den verneinten Imperativ (_no_ + Subj. presente) zusammen, filtert Personen pro Zeitform (kein Imperativ für yo) und erzeugt die Karten-IDs.
- **„Nur unregelmässige Verben“:** Das Flag entsteht in der Pipeline durch Vergleich mit einer kleinen Regel-Engine für regelmässige Verben (‑ar/‑er/‑ir). Reine Schreibanpassungen (_buscar → busqué_) werden separat markiert und gelten nicht als unregelmässig.
- **Referenztest (DoD M1: ≥ 200 Stichproben):** Ein committetes Fixture mit ≥ 200 Formen, bei denen Wiktionary und Jehle übereinstimmen. Einzelne konjugierte Formen sind Sprachfakten, keine geschützte Datenbank. Das Fixture enthält deshalb keine Jehle-Daten im lizenzrechtlichen Sinn.

## 3. Deutsche Übersetzungen (Vokabeln)

| Top N | (A) Übersetzungen span. Einträge | (B) Übersetzungstabellen dt. Einträge | A ∪ B  |
| ----- | -------------------------------- | ------------------------------------- | ------ |
| 1000  | 25,0 %                           | 87,6 %                                | 87,9 % |
| 3000  | 16,0 %                           | 85,7 %                                | 86,1 % |
| 8000  | 9,8 %                            | 78,4 %                                | 78,8 % |

- 11'084 übersetzbare Lemmata insgesamt. **8000 übersetzbare Lemmata** sind bei Rang 10'659 der Häufigkeitsliste erreicht.
- Qualität: Die Stichprobe ist überwiegend gut (_empezar → beginnen, anfangen_; _oscuridad → Dunkelheit_; _papeleo → Papierkram_). Bei (B) ist die Reihenfolge der Kandidaten aber zufällig, teils mit Ausreissern (_consuelo → Schnuller_, _hez → Hefe_).
- **Massnahmen in M4:**
  1. Kandidaten nach Häufigkeit in Tatoeba-Übersetzungen ranken: Das deutsche Wort, das am häufigsten in Übersetzungen von Sätzen mit dem spanischen Lemma vorkommt, kommt nach vorn.
  2. Auf der Karte 1–3 deutsche Wörter anzeigen statt nur eines.
  3. Eine kleine kuratierte Override-Liste in `data/curated/` für häufige Funktionswörter ohne Treffer (z. B. _y → und_).
- Lemmata ohne deutsche Übersetzung entfallen. Das filtert nebenbei Eigennamen und Anglizismen aus Film-Untertiteln (_show, tv, look_).

## 4. Häufigkeitsliste

- **FrequencyWords 2018** (Hermit Dave, aus OpenSubtitles 2018), Inhalt unter **CC BY-SA 4.0** (README geprüft).
- Die Liste enthält Wortformen, keine Lemmata. Über die Formtabellen von en.wiktionary sind **88,7 %** der Top-10'000-Formen einem Lemma zugeordnet (mehrdeutig 7,6 %, Zählung anteilig verteilt). Nicht zugeordnet sind fast nur Eigennamen und Englisch (_john, the, you_).
- Die Untertitel-Herkunft bevorzugt gesprochene Sprache. Das passt zum Ziel „Smalltalk, schneller Sätze bilden“. Eigennamen und Anglizismen fallen durch den Übersetzungsfilter (§3) weg.

## 5. Grösse und Laufzeit

| Download                          | Grösse              |
| --------------------------------- | ------------------- |
| Tatoeba spa / deu / spa-deu Links | 6,4 / 12,1 / 0,6 MB |
| en.wiktionary Spanisch (kaikki)   | 95,2 MB             |
| de.wiktionary roh (kaikki)        | 308,6 MB            |
| FrequencyWords es_50k             | 0,7 MB              |
| **Total**                         | **~424 MB**         |

- Erster Lauf ohne Cache: **83 s** inkl. Download. Mit Cache: **61 s**. Der Actions-Cache (407 MB) liegt weit unter dem Limit von 10 GB.
- In der echten Pipeline wird das de.wiktionary-Rohfile nur für die Übersetzungstabellen gebraucht. Der Speicherbedarf ist unkritisch (Runner mit 16 GB).

## Lizenzen und Attribution

| Quelle                              | Lizenz (an der Quelle geprüft) | Pflicht                                                        |
| ----------------------------------- | ------------------------------ | -------------------------------------------------------------- |
| Tatoeba                             | CC BY 2.0 FR                   | Attribution „Tatoeba (tatoeba.org)“, Satz-IDs bleiben erhalten |
| Wiktionary via kaikki.org (en + de) | CC BY-SA 4.0 + GFDL            | Attribution, **Share-Alike**                                   |
| FrequencyWords (OpenSubtitles 2018) | CC BY-SA 4.0                   | Attribution, **Share-Alike**                                   |

**Konsequenz Share-Alike:** Die generierten Daten in `public/data/` (Vokabeln, Verbformen) sind abgeleitete Werke und stehen damit unter CC BY-SA 4.0. Das wird unter „Info“ in der App ausgewiesen. Den App-Code betrifft das nicht.

## Folgepunkte

- **Spike-Workflow:** bleibt nur manuell auslösbar (`workflow_dispatch`), damit die Zahlen reproduzierbar sind. `scripts/spike/` dient als Vorlage für die Pipeline in M3/M4.
- **Node-20-Warnung:** `actions/cache@v4` und `actions/upload-artifact@v4` laufen bereits erzwungen auf Node 24. Ein Upgrade auf die nächste Major-Version folgt gezielt, nicht spekulativ.
