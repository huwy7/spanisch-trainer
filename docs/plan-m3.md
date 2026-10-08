# Plan M3 – Satzkarten

Ziel (SPEC §8): Pipeline in der Action, Filter nach Zeitform/Niveau, vosotros entfernt, Attribution sichtbar.

## Karte

- Standard **DE → ES** (Produktion), umschaltbar auf ES → DE.
- Aufdecken + selbst bewerten (Nochmal / Gut / Leicht). Ganze Sätze zu tippen wäre nicht sinnvoll prüfbar.
- Nach dem Aufdecken: Lösung, erkannte Zeitformen (mit ⓘ-Info aus Modul K), Attribution „Satz #id · Tatoeba (CC BY 2.0 FR)“.

## Stabile Karten-IDs (SPEC §4 präzisiert)

- DE → ES: `s:<tatoeba-id>`
- ES → DE: `s:r:<tatoeba-id>`. Wiedererkennen und Produzieren sind verschiedene Fähigkeiten und bekommen deshalb einen eigenen Lernstand.

## Daten (Pipeline)

- Alle Tatoeba-Paare durch den gemeinsamen Satzfilter (3–20 Wörter, vosotros, voseo) und eine Duplikatprüfung.
- **Zeitformen pro Satz** (die 16 IDs aus M1): einfache Formen über die Verbtabellen, zusammengesetzte Formen (_haber_ + Partizip), _ir a_ + Infinitiv. Homographen werden über die Häufigkeit aufgelöst. Wörter, die als Nomen/Partikel häufiger sind als als Verbform (_casa_, _como_), zählen nicht als Verb. Das bleibt eine Näherung (SPEC §6).
- **Niveau** = Maximum aus drei Signalen. Auch das ist eine Näherung, kein CEFR:
  - Zeitformen: höchstes Niveau der erkannten Zeitformen (Tabelle SPEC §3)
  - Wortschatz: Rang des seltensten Inhaltsworts (≤ 1500 → A2, ≤ 4000 → B1, sonst B2; Eigennamen ausgenommen)
  - Länge: ≤ 8 Wörter → A2, ≤ 14 → B1, sonst B2
- **Chunks pro Niveau** mit Hash im Dateinamen (`sentences-A2.<hash>.json`). Das Manifest verweist darauf. Kompakte Zeilen: `[id, es, de, zeitform-bitmaske]`. Reihenfolge = Reihenfolge der neuen Karten (häufige Wörter und kurze Sätze zuerst).

## Laden und Offline

- Satz-Chunks liegen **nicht** im Precache, damit die Installation schlank bleibt.
- Service Worker: Chunks mit `CacheFirst` (dank Hash im Namen unveränderlich), `manifest.json` mit `NetworkFirst`.
- Nach dem Start lädt die App online alle Chunks im Hintergrund vor. Danach ist auch M3 voll offline nutzbar.

## Setup

Richtung, Niveau-Chips (A2/B1/B2), optionaler Zeitform-Filter (ohne Auswahl gelten alle Zeitformen). Dazu die ⓘ-Info pro Zeitform aus Modul K.

## Tests

Zeitform-Erkennung (einfach, zusammengesetzt, _ir a_, Homographen, Nomen-Ausschluss), Niveau-Berechnung, Bitmaske, Chunk-Aufbau, Duplikate, Filter in der App.

## Ergebnis (Abschluss M3)

- 85'408 Satzkarten (A2 28'787 · B1 30'545 · B2 26'076). 94 % davon mit mindestens einer erkannten Zeitform.
- Chunks 2,2 / 3,0 / 2,9 MB, zusammen mit dem Precache (1,4 MB) unter dem Budget von 15 MB.
- Die Stichproben-Prüfung hat drei Fehler der Zeitform-Erkennung gefunden, alle behoben: Eigennamen (Irán ≠ ir, Futur), Kollision mit dem Imperativ (está), seltene Verben (fuimos ≠ fuir).
- Bewusste Kompromisse: Reine Imperativsätze („Habla más despacio“) werden als Präsens markiert. Formen, die als anderes Wort häufiger sind („como“), werden gar nicht markiert.
- Offline: Beim ersten Besuch übernimmt der Service Worker sofort (`clientsClaim`) und lädt alle Chunks vor. Getestet: Neuladen im Flugmodus, Wechsel auf ein anderes Niveau.
