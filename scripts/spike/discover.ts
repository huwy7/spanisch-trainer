/**
 * M0b spike, step 1: discover download URLs and sizes of candidate sources.
 * Runs in GitHub Actions (the dev container cannot reach these hosts).
 */
const CANDIDATES = [
  'https://downloads.tatoeba.org/exports/per_language/spa/spa_sentences.tsv.bz2',
  'https://downloads.tatoeba.org/exports/per_language/deu/deu_sentences.tsv.bz2',
  'https://downloads.tatoeba.org/exports/per_language/spa/spa-deu_links.tsv.bz2',
  'https://downloads.tatoeba.org/exports/per_language/deu/deu-spa_links.tsv.bz2',
  'https://downloads.tatoeba.org/exports/links.tar.bz2',
  'https://downloads.tatoeba.org/exports/sentences_CC0.tar.bz2',
  'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl',
  'https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl.gz',
  'https://kaikki.org/dewiktionary/Spanisch/kaikki.org-dictionary-Spanisch.jsonl',
  'https://kaikki.org/dewiktionary/raw-wiktextract-data.jsonl.gz',
];

const INDEX_PAGES = [
  'https://downloads.tatoeba.org/exports/per_language/spa/',
  'https://kaikki.org/dewiktionary/',
  'https://kaikki.org/dewiktionary/Spanisch/index.html',
  'https://kaikki.org/dictionary/Spanish/index.html',
];

for (const url of CANDIDATES) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const len = Number(res.headers.get('content-length') ?? 0);
    console.log(`HEAD ${res.status} ${(len / 1e6).toFixed(1)} MB ${url}`);
  } catch (e) {
    console.log(`HEAD ERR ${url} ${String(e)}`);
  }
}

for (const url of INDEX_PAGES) {
  try {
    const res = await fetch(url);
    const html = await res.text();
    const links = [...html.matchAll(/href="([^"]+)"/g)]
      .map((m) => m[1]!)
      .filter((h) => /\.(jsonl|gz|bz2|tsv|json)/.test(h) || /spa|Spanisch|deu/i.test(h));
    console.log(`INDEX ${res.status} ${url}\n  ${[...new Set(links)].slice(0, 60).join('\n  ')}`);
  } catch (e) {
    console.log(`INDEX ERR ${url} ${String(e)}`);
  }
}
