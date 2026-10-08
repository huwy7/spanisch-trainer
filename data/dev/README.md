# Dev-Sample

`verbs.sample.json`: rund 60 echte Verben aus der Pipeline (Format wie `public/data/verbs.json`), für die
Entwicklung ohne Zugriff auf die Quellen: `DATA_OFFLINE=1 npm run data`. Nicht für Produktion.

Erzeugt mit dem Workflow „Data fixtures“ (`scripts/make-fixtures.ts`), danach mit
`data/curated/verb-meanings.json` korrigiert.

Quellen: Wiktionary (en, de) via kaikki.org, CC BY-SA 4.0; FrequencyWords (OpenSubtitles 2018),
CC BY-SA 4.0; Tatoeba, CC BY 2.0 FR. Diese Datei steht unter CC BY-SA 4.0.
