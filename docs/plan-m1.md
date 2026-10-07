# Plan M1 – Konjugation

Ziel (SPEC §8): Pipeline-Teil Verben, Engine mit Tests (≥ 200 Referenz-Stichproben), alle Zeitformen aus §3, beide Antwortmodi, FSRS, IndexedDB, Backup Export/Import.

## Stabile IDs (nie ändern)

Karten-ID: `verb:tense:person`, z. B. `tener:subj_pres:2s`.

| Tense-ID | Zeitform | Niveau | Bildung |
|---|---|---|---|
| `pres` | Presente | A2 | Daten |
| `indef` | Pretérito indefinido | A2 | Daten |
| `perf` | Pretérito perfecto | A2 | haber (pres) + Partizip |
| `ir_a` | ir a + Infinitiv | A2 | ir (pres) + a + Infinitiv |
| `imperf` | Imperfecto | B1 | Daten |
| `fut` | Futuro simple | B1 | Daten |
| `cond` | Condicional simple | B1 | Daten |
| `subj_pres` | Subjuntivo presente | B1 | Daten |
| `imp_aff` | Imperativo afirmativo | B1 | Daten (tú, usted, nosotros, ustedes) |
| `imp_neg` | Imperativo negativo | B1 | no + subj_pres (tú, usted, nosotros, ustedes) |
| `subj_imperf` | Subjuntivo imperfecto (-ra) | B2 | Daten, -se als Alternative |
| `plusc` | Pluscuamperfecto | B2 | haber (imperf) + Partizip |
| `fut_perf` | Futuro perfecto | B2 | haber (fut) + Partizip |
| `cond_comp` | Condicional compuesto | B2 | haber (cond) + Partizip |
| `subj_perf` | Subjuntivo perfecto | B2 | haber (subj_pres) + Partizip |
| `subj_plusc` | Subjuntivo pluscuamperfecto | B2 | haber (subj_imperf -ra) + Partizip |

Personen: `1s` yo · `2s` tú · `3s` él/ella/usted · `1p` nosotros · `3p` ellos/ellas/ustedes. Imperativ ohne `1s`.

## Schritte

1. **Engine** (`src/modules/conjugation/`): Typen, Zeitform-Katalog, Zusammensetzung, Personen pro Zeitform, Karten-IDs, Antwortprüfung (exakt / nur Akzentfehler / falsch). Tests mit kleinen Handtabellen.
2. **Pipeline Verben** (`scripts/`): en.wiktionary → einfache Formen. Regel-Engine für regelmässige Verben → Flag „unregelmässig“. Deutsche Bedeutung aus de.wiktionary, Kandidaten gerankt nach Tatoeba-Kookkurrenz. Ausgabe: `public/data/verbs.json` (Top ~1000 nicht-reflexive Verben mit vollständiger Tabelle und Übersetzung).
   - Einmaliger Actions-Lauf erzeugt das **Referenz-Fixture** (≥ 200 Formen, bei denen Wiktionary und Jehle übereinstimmen) und ein **Dev-Sample** (~40 Verben). Beide werden committet, weil der Dev-Container die Quellen nicht erreicht. `DATA_OFFLINE=1 npm run data` nutzt das Sample. CI bricht bei Download-Fehlern hart ab.
3. **SRS** (`src/srs/`): ts-fsrs-Wrapper. Nochmal/Gut/Leicht → Again/Good/Easy, Hard nur bei Akzentfehler. Queue: fällige vor neuen Karten, neue pro Tag als Einstellung (Standard 30).
4. **DB** (`src/db/`): Dexie Schema v1 mit `cards` (FSRS-Zustand), `reviews` (Review-Log), `settings`. Backup-Export/-Import als JSON mit Schema-Version. `navigator.storage.persist()` und Hinweis bei Backup älter als 7 Tage.
5. **UI**: Setup für K (Zeitformen nach Niveau, nur unregelmässige, Antwortmodus), Session (Aufdecken/Tippen, Akzentleiste, Bewertung im Daumenbereich), Info (Backup, Einstellungen, Attributionen), Statistik minimal (heute fällig, Trefferquote pro Zeitform).
6. **CI**: `npm run data` mit Download-Cache, Daten im Precache (verbs.json ~0,6 MB). Lazy-Chunks folgen mit M3.

## Neue Dependencies

- `ts-fsrs`, `dexie`: in SPEC §5 festgelegt.
- `fake-indexeddb` (nur Dev): damit Dexie-Schema, Migrationen und Backup in Vitest ohne Browser testbar sind.

## Bewusst nicht in M1

- Reflexive Verben (Pronomen-Stellung beim Imperativ ist ein eigenes Thema). Folgt bei Bedarf.
- Statistik-Ansicht über das Minimum hinaus (M6).
