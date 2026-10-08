import type { Person, SimpleTense } from '../../src/modules/conjugation/types.ts';
import type { ModeCategory, Mood } from '../../src/modules/mode/types.ts';
import { moodOf, type Analyzer } from './analyzer.ts';

/** One trigger rule from data/curated/mode-triggers.json. */
export interface TriggerRule {
  id: string;
  category: ModeCategory;
  /** Expected mood after the trigger; `both` = decided by the sentence (cuando, si, aunque). */
  mood: Mood | 'both';
  /** Regular expressions (case-insensitive, matched on word boundaries). */
  patterns: string[];
  /** Simple tenses that are never accepted after this trigger (e.g. si + subj. presente). */
  forbidTenses?: SimpleTense[];
  /** German explanation per resulting mood. */
  explain: Partial<Record<Mood, string>>;
}

export interface CompiledRule extends TriggerRule {
  regexes: RegExp[];
}

export function compileRules(rules: readonly TriggerRule[]): CompiledRule[] {
  return rules.map((r) => ({
    ...r,
    regexes: r.patterns.map((p) => new RegExp(`(?<![\\p{L}])(?:${p})(?![\\p{L}])`, 'iu')),
  }));
}

export interface TriggerMatch {
  rule: CompiledRule;
  start: number;
  end: number;
}

/** First rule (in file order) that matches; earliest position within that rule. */
export function findTrigger(es: string, rules: readonly CompiledRule[]): TriggerMatch | null {
  for (const rule of rules) {
    let best: RegExpExecArray | null = null;
    for (const re of rule.regexes) {
      const m = re.exec(es);
      if (m && (!best || m.index < best.index)) best = m;
    }
    if (best) return { rule, start: best.index, end: best.index + best[0].length };
  }
  return null;
}

/** Words that may stand between trigger and verb: negation, clitics, subject pronouns. */
const SKIPPABLE = new Set([
  'no',
  'me',
  'te',
  'se',
  'lo',
  'la',
  'le',
  'los',
  'las',
  'les',
  'nos',
  'yo',
  'tú',
  'él',
  'ella',
  'usted',
  'nosotros',
  'nosotras',
  'ellos',
  'ellas',
  'ustedes',
  'ya',
  'también',
  'nunca',
  'siempre',
  'todavía',
]);
const MAX_SKIPPED = 3;

const HABER_TENSE: Partial<Record<SimpleTense, true>> = {
  pres: true,
  imperf: true,
  fut: true,
  cond: true,
  subj_pres: true,
  subj_imperf: true,
};

export interface Gap {
  start: number;
  end: number;
  inf: string;
  mood: Mood;
  tense: SimpleTense;
  alternatives: string[];
}

export type GapResult = Gap | { reject: 'no-verb' | 'ambiguous' | 'imperative' };

interface Token {
  text: string;
  lower: string;
  start: number;
  end: number;
}

function tokenize(s: string, offset: number): Token[] {
  return [...s.matchAll(/[\p{L}\p{M}]+/gu)].map((m) => ({
    text: m[0],
    lower: m[0].toLowerCase(),
    start: offset + m.index,
    end: offset + m.index + m[0].length,
  }));
}

/**
 * The verb governed by the trigger: the first finite verb after it, allowing only negation,
 * clitics and subject pronouns in between. haber + participle forms one gap.
 * Any other word in between rejects the sentence (precision over recall).
 */
export function findGap(es: string, triggerEnd: number, an: Analyzer): GapResult {
  const toks = tokenize(es.slice(triggerEnd), triggerEnd);
  let i = 0;
  while (
    i < toks.length &&
    i < MAX_SKIPPED &&
    SKIPPABLE.has(toks[i]!.lower) &&
    !an.finite(toks[i]!.lower).length
  )
    i++;
  const tok = toks[i];
  if (!tok) return { reject: 'no-verb' };
  const analyses = an.finite(tok.lower);
  if (!analyses.length) return { reject: 'no-verb' };

  // haber + participle (he/había/haya/hubiera … + -ado/-ido)
  const next = toks[i + 1];
  const haber = analyses.filter((a) => a.inf === 'haber' && HABER_TENSE[a.tense]);
  if (haber.length && next && an.participle(next.lower).length) {
    const infs = an.participle(next.lower);
    const moods = new Set(haber.map((a) => moodOf(a.tense)));
    if (infs.length !== 1 || moods.size !== 1 || moods.has(null)) return { reject: 'ambiguous' };
    const h = haber[0]!;
    const alternatives =
      h.tense === 'subj_imperf' && !h.se
        ? unique(
            haber
              .map((a) => an.seForm('haber', a.person))
              .filter(isString)
              .map((f) => `${f} ${next.lower}`),
          )
        : [];
    return {
      start: tok.start,
      end: next.end,
      inf: infs[0]!,
      mood: [...moods][0]!,
      tense: h.tense,
      alternatives,
    };
  }

  const infs = new Set(analyses.map((a) => a.inf));
  const moods = new Set(analyses.map((a) => moodOf(a.tense)));
  if (moods.has(null) && moods.size === 1) return { reject: 'imperative' };
  moods.delete(null);
  if (infs.size !== 1 || moods.size !== 1) return { reject: 'ambiguous' };
  const tenses = new Set(analyses.filter((a) => moodOf(a.tense)).map((a) => a.tense));
  const tense = [...tenses][0]!;
  const raPersons: Person[] = analyses
    .filter((a) => a.tense === 'subj_imperf' && !a.se)
    .map((a) => a.person);
  const inf = [...infs][0]!;
  return {
    start: tok.start,
    end: tok.end,
    inf,
    mood: [...moods][0]!,
    tense,
    alternatives: unique(raPersons.map((p) => an.seForm(inf, p)).filter(isString)),
  };
}

const isString = (s: string | undefined): s is string => !!s;
const unique = (xs: string[]) => [...new Set(xs)];

export type MatchResult =
  | { trigger: TriggerMatch; gap: Gap; explanation: string }
  | { reject: 'no-trigger' | 'no-verb' | 'ambiguous' | 'imperative' | 'mood' };

/** Trigger + governed verb + mood check against the rule. */
export function analyzeSentence(
  es: string,
  rules: readonly CompiledRule[],
  an: Analyzer,
): MatchResult {
  const trigger = findTrigger(es, rules);
  if (!trigger) return { reject: 'no-trigger' };
  const gap = findGap(es, trigger.end, an);
  if ('reject' in gap) return gap;
  const { rule } = trigger;
  if (rule.mood !== 'both' && rule.mood !== gap.mood) return { reject: 'mood' };
  if (rule.forbidTenses?.includes(gap.tense)) return { reject: 'mood' };
  if (!rule.explain[gap.mood]) return { reject: 'mood' };
  return { trigger, gap, explanation: `${rule.id}:${gap.mood}` };
}
