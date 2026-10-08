import type { SimpleTense } from '../../src/modules/conjugation/types.ts';
import type { TenseId } from '../../src/modules/conjugation/tenses.ts';
import { preferFrequent, type Analyzer, type FormAnalysis } from '../mode/analyzer.ts';

const COMPOUND: Partial<Record<SimpleTense, TenseId>> = {
  pres: 'perf',
  imperf: 'plusc',
  fut: 'fut_perf',
  cond: 'cond_comp',
  subj_pres: 'subj_perf',
  subj_imperf: 'subj_plusc',
};

const SIMPLE: Record<SimpleTense, TenseId | null> = {
  pres: 'pres',
  indef: 'indef',
  imperf: 'imperf',
  fut: 'fut',
  cond: 'cond',
  subj_pres: 'subj_pres',
  subj_imperf: 'subj_imperf',
  // affirmative imperative forms coincide with present / subjunctive forms: not tagged
  imp_aff: null,
};

export interface TenseContext {
  an: Analyzer;
  /** True if the word is more likely a noun/particle than a verb form (casa, como). */
  nonVerb: (word: string, analyses: FormAnalysis[]) => boolean;
  /** Known infinitives (for ir a + infinitive). */
  isInfinitive: (word: string) => boolean;
}

/**
 * Tenses (SPEC §3 IDs) found in a Spanish sentence. A token counts only if its reading is
 * unambiguous after frequency preference; composed forms (haber + participle, ir a + inf.)
 * count as their composed tense. An approximation (SPEC §6).
 */
export function detectTenses(es: string, ctx: TenseContext): Set<TenseId> {
  const toks = es
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
  const found = new Set<TenseId>();
  for (let i = 0; i < toks.length; i++) {
    const tok = toks[i]!;
    const raw = ctx.an.finite(tok);
    if (!raw.length || ctx.nonVerb(tok, raw)) continue;
    const analyses = preferFrequent(raw, ctx.an);
    const next = toks[i + 1];

    const haber = analyses.filter((a) => a.inf === 'haber' && COMPOUND[a.tense]);
    if (haber.length && next && ctx.an.participle(next).length) {
      const composed = new Set(haber.map((a) => COMPOUND[a.tense]!));
      if (composed.size === 1) found.add([...composed][0]!);
      i++;
      continue;
    }
    const isIr = analyses.some((a) => a.inf === 'ir' && a.tense === 'pres');
    if (isIr && next === 'a' && toks[i + 2] && ctx.isInfinitive(toks[i + 2]!)) {
      found.add('ir_a');
      i += 2;
      continue;
    }
    const tenses = new Set(analyses.map((a) => SIMPLE[a.tense]));
    if (tenses.size === 1 && !tenses.has(null)) found.add([...tenses][0]!);
  }
  return found;
}
