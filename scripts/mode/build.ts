import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  MODE_CATEGORIES,
  type ModeCard,
  type ModeCategory,
  type ModeFile,
  type Mood,
} from '../../src/modules/mode/types.ts';
import type { Corpus } from '../corpus.ts';
import { rejectSentence, words } from '../sentences/filter.ts';
import { buildAnalyzer, type Analyzer } from './analyzer.ts';
import { analyzeSentence, compileRules, type CompiledRule, type TriggerRule } from './match.ts';

const CURATED_DIR = join(import.meta.dirname, '..', '..', 'data', 'curated');
/** Max. Tatoeba cards per rule, so frequent triggers (creo que, cuando) do not dominate. */
export const CARDS_PER_RULE = 60;

export interface RulesFile {
  categories: Record<ModeCategory, { label: string }>;
  rules: TriggerRule[];
}

export interface CuratedSentence {
  id: string;
  es: string;
  inf: string;
  mood: Mood;
  de: string;
  pair?: string;
}

export async function loadRules(): Promise<RulesFile> {
  return JSON.parse(await readFile(join(CURATED_DIR, 'mode-triggers.json'), 'utf8')) as RulesFile;
}

export async function loadCurated(): Promise<CuratedSentence[]> {
  const raw = JSON.parse(await readFile(join(CURATED_DIR, 'mode-sentences.json'), 'utf8')) as {
    sentences: CuratedSentence[];
  };
  return raw.sentences;
}

/** "Ojalá {haga} sol." → text without braces and the gap position. */
export function parseGapMarkup(es: string): { text: string; gap: [number, number] } | null {
  const m = /\{([^{}]+)\}/.exec(es);
  if (!m || es.indexOf('{', m.index + 1) !== -1) return null;
  const text = es.slice(0, m.index) + m[1] + es.slice(m.index + m[0].length);
  return { text, gap: [m.index, m.index + m[1]!.length] };
}

/**
 * Curated sentences → cards. Each one must be recognised by the trigger rules exactly as
 * written (gap position, mood, infinitive); otherwise an error is reported. Without an
 * analyzer (offline dev build) only the trigger and gap position are checked.
 */
export function curatedCards(
  sentences: readonly CuratedSentence[],
  rules: readonly CompiledRule[],
  an: Analyzer | null,
): { cards: (ModeCard & { pair?: string })[]; errors: string[] } {
  const cards: (ModeCard & { pair?: string })[] = [];
  const errors: string[] = [];
  for (const s of sentences) {
    const parsed = parseGapMarkup(s.es);
    if (!parsed) {
      errors.push(`${s.id}: gap markup {…} missing or repeated`);
      continue;
    }
    const { text, gap } = parsed;
    const base = {
      id: `m:c:${s.id}`,
      es: text,
      gap,
      inf: s.inf,
      mood: s.mood,
      de: s.de,
      pair: s.pair,
    };
    if (an) {
      const r = analyzeSentence(text, rules, an);
      if ('reject' in r) {
        errors.push(`${s.id}: not recognised (${r.reject})`);
        continue;
      }
      if (r.gap.start !== gap[0] || r.gap.end !== gap[1])
        errors.push(`${s.id}: gap differs from markup`);
      if (r.gap.inf !== s.inf) errors.push(`${s.id}: infinitive ${r.gap.inf} ≠ ${s.inf}`);
      if (r.gap.mood !== s.mood) errors.push(`${s.id}: mood ${r.gap.mood} ≠ ${s.mood}`);
      cards.push({
        ...base,
        trigger: [r.trigger.start, r.trigger.end],
        alternatives: r.gap.alternatives,
        category: r.trigger.rule.category,
        explanation: r.explanation,
      });
    } else {
      const t = rules.map((rule) => ({
        rule,
        m: rule.regexes.map((re) => re.exec(text)).find(Boolean),
      }));
      const hit = t.find((x) => x.m);
      if (!hit?.m) {
        errors.push(`${s.id}: no trigger`);
        continue;
      }
      cards.push({
        ...base,
        trigger: [hit.m.index, hit.m.index + hit.m[0].length],
        alternatives: [],
        category: hit.rule.category,
        explanation: `${hit.rule.id}:${s.mood}`,
      });
    }
  }
  return { cards, errors };
}

export interface ModeBuildStats {
  curated: number;
  tatoebaMatched: number;
  tatoebaKept: number;
  rejected: Record<string, number>;
  perCategory: Record<string, number>;
}

/** FNV-1a for a deterministic order. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Order in which new cards are introduced: categories round-robin; within a category
 * curated cards first (contrast pairs kept together), then Tatoeba cards, shortest first.
 */
export function orderCards(cards: readonly (ModeCard & { pair?: string })[]): ModeCard[] {
  const byCat = new Map<ModeCategory, (ModeCard & { pair?: string })[][]>();
  for (const cat of MODE_CATEGORIES) {
    const own = cards.filter((c) => c.category === cat);
    const groups = new Map<string, (ModeCard & { pair?: string })[]>();
    for (const c of own) {
      const key = c.pair ? `pair:${c.pair}` : c.id;
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const list = [...groups.values()].sort((a, b) => {
      const ca = a[0]!.tatoebaId === undefined ? 0 : 1;
      const cb = b[0]!.tatoebaId === undefined ? 0 : 1;
      return (
        ca - cb ||
        words(a[0]!.es).length - words(b[0]!.es).length ||
        hash(a[0]!.id) - hash(b[0]!.id)
      );
    });
    byCat.set(cat, list);
  }
  const out: ModeCard[] = [];
  for (let round = 0; ; round++) {
    let added = false;
    for (const cat of MODE_CATEGORIES) {
      const group = byCat.get(cat)![round];
      if (!group) continue;
      for (const { pair: _pair, ...card } of group) out.push(card);
      added = true;
    }
    if (!added) break;
  }
  return out;
}

export async function buildMode(
  corpus: Corpus | null,
): Promise<{ file: ModeFile; stats: ModeBuildStats; errors: string[] }> {
  const rulesFile = await loadRules();
  const rules = compileRules(rulesFile.rules);
  const explanations: Record<string, string> = {};
  for (const r of rulesFile.rules) {
    for (const [mood, text] of Object.entries(r.explain)) explanations[`${r.id}:${mood}`] = text;
  }
  const an = corpus ? buildAnalyzer(corpus.wikt.verbs.values()) : null;
  const { cards: curated, errors } = curatedCards(await loadCurated(), rules, an);

  const rejected: Record<string, number> = {};
  const perRule = new Map<string, ModeCard[]>();
  let matched = 0;
  if (corpus && an) {
    const lex = corpus.wikt;
    for (const p of corpus.pairs) {
      const filter = rejectSentence(p.es, lex);
      if (filter) {
        rejected[filter] = (rejected[filter] ?? 0) + 1;
        continue;
      }
      const r = analyzeSentence(p.es, rules, an);
      if ('reject' in r) {
        rejected[r.reject] = (rejected[r.reject] ?? 0) + 1;
        continue;
      }
      matched++;
      const list = perRule.get(r.trigger.rule.id) ?? [];
      list.push({
        id: `m:t:${p.id}`,
        es: p.es,
        gap: [r.gap.start, r.gap.end],
        trigger: [r.trigger.start, r.trigger.end],
        inf: r.gap.inf,
        alternatives: r.gap.alternatives,
        mood: r.gap.mood,
        category: r.trigger.rule.category,
        explanation: r.explanation,
        de: p.de,
        tatoebaId: p.id,
      });
      perRule.set(r.trigger.rule.id, list);
    }
  }
  const tatoeba = [...perRule.values()].flatMap((list) =>
    [...list]
      .sort((a, b) => words(a.es).length - words(b.es).length || a.tatoebaId! - b.tatoebaId!)
      .slice(0, CARDS_PER_RULE),
  );
  const cards = orderCards([...curated, ...tatoeba]);
  const perCategory: Record<string, number> = {};
  for (const c of cards) perCategory[c.category] = (perCategory[c.category] ?? 0) + 1;

  return {
    file: { version: 1, categories: rulesFile.categories, explanations, cards },
    stats: {
      curated: curated.length,
      tatoebaMatched: matched,
      tatoebaKept: tatoeba.length,
      rejected,
      perCategory,
    },
    errors,
  };
}

/** Structural checks before writing mode.json (build fails on errors). */
export function validateMode(file: ModeFile): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const c of file.cards) {
    if (ids.has(c.id)) errors.push(`duplicate ${c.id}`);
    ids.add(c.id);
    if (!(c.gap[0] < c.gap[1] && c.gap[1] <= c.es.length)) errors.push(`${c.id}: bad gap`);
    if (c.trigger[1] > c.gap[0]) errors.push(`${c.id}: trigger after gap`);
    if (!file.explanations[c.explanation])
      errors.push(`${c.id}: unknown explanation ${c.explanation}`);
    if (!file.categories[c.category]) errors.push(`${c.id}: unknown category ${c.category}`);
  }
  for (const cat of MODE_CATEGORIES) {
    if (!file.cards.some((c) => c.category === cat)) errors.push(`category ${cat} has no cards`);
  }
  // SPEC §3: contrast pairs where the indicative is correct
  for (const cat of ['zweifel', 'zeitlich'] as const) {
    if (!file.cards.some((c) => c.category === cat && c.mood === 'ind')) {
      errors.push(`category ${cat} has no indicative contrast`);
    }
  }
  return errors;
}
