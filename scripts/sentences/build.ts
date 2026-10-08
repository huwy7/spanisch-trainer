import { LEVELS, type Level } from '../../src/modules/conjugation/tenses.ts';
import {
  tenseMask,
  type SentenceChunk,
  type SentenceRow,
} from '../../src/modules/sentences/types.ts';
import type { Corpus } from '../corpus.ts';
import { tokens } from '../lib/io.ts';
import { buildAnalyzer } from '../mode/analyzer.ts';
import { rejectSentence, words } from './filter.ts';
import { sentenceLevel } from './level.ts';
import { detectTenses } from './tenses.ts';

export interface SentenceBuildStats {
  pairs: number;
  kept: number;
  rejected: Record<string, number>;
  perLevel: Record<string, number>;
  withTense: number;
}

/** Lemma → frequency rank (1 = most frequent). */
export function lemmaRanks(freq: ReadonlyMap<string, number>): Map<string, number> {
  return new Map([...freq].sort((a, b) => b[1] - a[1]).map(([l], i) => [l, i + 1]));
}

export function buildSentences(corpus: Corpus): {
  chunks: Record<Level, SentenceChunk>;
  stats: SentenceBuildStats;
} {
  const { wikt, lemmaFreq } = corpus;
  const an = buildAnalyzer(wikt.verbs.values(), (inf) => lemmaFreq.get(inf) ?? 0);
  const ranks = lemmaRanks(lemmaFreq);
  const ctx = {
    an,
    nonVerb: (word: string, analyses: { inf: string }[]) => {
      if (!wikt.lemmas.has(word) || analyses.some((a) => a.inf === word)) return false;
      const verbFreq = Math.max(...analyses.map((a) => lemmaFreq.get(a.inf) ?? 0));
      return (lemmaFreq.get(word) ?? 0) >= verbFreq;
    },
    isInfinitive: (word: string) => wikt.verbs.has(word),
  };
  const rankOf = (tok: string) => {
    const ls = wikt.lemmas.has(tok) ? [tok] : (wikt.formLemmas.get(tok) ?? []);
    const rs = ls.map((l) => ranks.get(l)).filter((r): r is number => r !== undefined);
    return rs.length ? Math.min(...rs) : Infinity;
  };

  const rejected: Record<string, number> = {};
  const seen = new Set<string>();
  const byLevel: Record<Level, { row: SentenceRow; rarest: number; len: number }[]> = {
    A2: [],
    B1: [],
    B2: [],
  };
  let withTense = 0;
  for (const p of corpus.pairs) {
    const reason = rejectSentence(p.es, wikt);
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    const key = tokens(p.es).join(' ');
    if (seen.has(key)) {
      rejected.duplicate = (rejected.duplicate ?? 0) + 1;
      continue;
    }
    seen.add(key);
    const ws = words(p.es);
    // rarest content word; capitalised words after the first are names
    const content = ws.filter(
      (w, i) => !(i > 0 && /^\p{Lu}/u.test(w)) && !wikt.names.has(w.toLowerCase()),
    );
    const rarest = Math.max(0, ...content.map((w) => rankOf(w.toLowerCase())));
    const tenses = detectTenses(p.es, ctx);
    if (tenses.size) withTense++;
    const level = sentenceLevel(tenses, rarest, ws.length);
    byLevel[level].push({ row: [p.id, p.es, p.de, tenseMask(tenses)], rarest, len: ws.length });
  }

  const chunks = {} as Record<Level, SentenceChunk>;
  const perLevel: Record<string, number> = {};
  for (const level of LEVELS) {
    const rows = byLevel[level]
      .sort((a, b) => a.rarest - b.rarest || a.len - b.len || a.row[0] - b.row[0])
      .map((x) => x.row);
    chunks[level] = { version: 1, level, rows };
    perLevel[level] = rows.length;
  }
  return {
    chunks,
    stats: {
      pairs: corpus.pairs.length,
      kept: Object.values(perLevel).reduce((a, b) => a + b, 0),
      rejected,
      perLevel,
      withTense,
    },
  };
}

/** Build fails on violations (CLAUDE.md: no vosotros, data filters tested). */
export function validateSentences(
  chunks: Record<Level, SentenceChunk>,
  lex: Parameters<typeof rejectSentence>[1],
): string[] {
  const errors: string[] = [];
  const ids = new Set<number>();
  for (const level of LEVELS) {
    for (const [id, es, de] of chunks[level].rows) {
      if (ids.has(id)) errors.push(`duplicate id ${id}`);
      ids.add(id);
      if (!de.trim()) errors.push(`${id}: no translation`);
      const r = rejectSentence(es, lex);
      if (r) errors.push(`${id}: ${r}`);
    }
  }
  return errors;
}
