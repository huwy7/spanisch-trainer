import { describe, expect, it } from 'vitest';
import { HAND_VERBS } from '../../src/modules/conjugation/__fixtures__/hand-verbs.ts';
import sample from '../../data/dev/verbs.sample.json' with { type: 'json' };
import type { VerbsFile } from '../../src/modules/conjugation/types.ts';
import type { ModeCard, ModeFile } from '../../src/modules/mode/types.ts';
import { buildAnalyzer } from './analyzer.ts';
import {
  curatedCards,
  loadCurated,
  loadRules,
  orderCards,
  parseGapMarkup,
  validateMode,
} from './build.ts';
import { analyzeSentence, compileRules } from './match.ts';

const an = buildAnalyzer(HAND_VERBS);
const rulesFile = await loadRules();
const rules = compileRules(rulesFile.rules);
const analyze = (es: string) => analyzeSentence(es, rules, an);
const ok = (es: string) => {
  const r = analyze(es);
  if ('reject' in r) throw new Error(`rejected: ${r.reject}`);
  return {
    rule: r.trigger.rule.id,
    gap: es.slice(r.gap.start, r.gap.end),
    inf: r.gap.inf,
    mood: r.gap.mood,
    alt: r.gap.alternatives,
  };
};

describe('trigger rules and gap detection', () => {
  it('finds wish triggers and the subjunctive verb after them', () => {
    expect(ok('Quiero que hables conmigo.')).toEqual({
      rule: 'wunsch',
      gap: 'hables',
      inf: 'hablar',
      mood: 'subj',
      alt: [],
    });
  });

  it('distinguishes negated and plain opinion (contrast pair)', () => {
    expect(ok('No creo que tenga razón.')).toMatchObject({ rule: 'zweifel-neg', mood: 'subj' });
    expect(ok('Creo que tiene razón.')).toMatchObject({ rule: 'meinung-ind', mood: 'ind' });
  });

  it('accepts both moods after si, but never the present subjunctive', () => {
    expect(ok('Si tuviera dinero, iría.')).toMatchObject({
      rule: 'si',
      mood: 'subj',
      alt: ['tuviese'],
    });
    expect(ok('Si tengo tiempo, voy.')).toMatchObject({ rule: 'si', mood: 'ind' });
    expect(analyze('Si tenga tiempo, voy.')).toEqual({ reject: 'mood' });
  });

  it('rejects the future after cuando', () => {
    expect(analyze('Cuando tendré tiempo, lo haré.')).toEqual({ reject: 'mood' });
    expect(ok('Cuando tenga tiempo, lo haré.')).toMatchObject({ rule: 'zeitlich', mood: 'subj' });
  });

  it('rejects a mood that contradicts the rule', () => {
    expect(analyze('Quiero que tienes razón.')).toEqual({ reject: 'mood' });
  });

  it('skips negation, clitics and subject pronouns, but nothing else', () => {
    expect(ok('Espero que no lo tengas.')).toMatchObject({ gap: 'tengas' });
    expect(ok('Quiero que tú hables.')).toMatchObject({ gap: 'hables' });
    expect(analyze('Quiero que mi hermano hable.')).toEqual({ reject: 'no-verb' });
  });

  it('takes haber + participle as one gap with the -se alternative', () => {
    expect(ok('Ojalá hubiera hablado con él.')).toEqual({
      rule: 'ojala',
      gap: 'hubiera hablado',
      inf: 'hablar',
      mood: 'subj',
      alt: ['hubiese hablado'],
    });
    expect(ok('Creo que ha tenido suerte.')).toMatchObject({
      gap: 'ha tenido',
      inf: 'tener',
      mood: 'ind',
    });
  });

  it('handles irregular forms (ir)', () => {
    expect(ok('Quiero que vayas conmigo.')).toMatchObject({ inf: 'ir', mood: 'subj' });
  });

  it('resolves rare homographs in favour of the clearly more frequent verb', () => {
    // fake rare verb "tenar" whose present tense collides with tener's subjunctive
    const tenar = {
      ...HAND_VERBS[1]!,
      inf: 'tenar',
      forms: { ...HAND_VERBS[1]!.forms, pres: ['teno', 'tengas', 'tena', 'tenamos', 'tenan'] },
    } as (typeof HAND_VERBS)[number];
    const freq: Record<string, number> = { tener: 1000, tenar: 1 };
    const an2 = buildAnalyzer([...HAND_VERBS, tenar], (inf) => freq[inf] ?? 0);
    const r = analyzeSentence('Quiero que tengas suerte.', rules, an2);
    expect('reject' in r ? r.reject : r.gap.inf).toBe('tener');
    const even = buildAnalyzer([...HAND_VERBS, tenar], () => 10);
    expect(analyzeSentence('Quiero que tengas suerte.', rules, even)).toEqual({
      reject: 'ambiguous',
    });
  });

  it('reports sentences without trigger', () => {
    expect(analyze('Tengo un perro.')).toEqual({ reject: 'no-trigger' });
  });
});

describe('gap markup', () => {
  it('parses exactly one {gap}', () => {
    expect(parseGapMarkup('Ojalá {haga} sol.')).toEqual({ text: 'Ojalá haga sol.', gap: [6, 10] });
    expect(parseGapMarkup('sin gap')).toBeNull();
    expect(parseGapMarkup('{a} y {b}')).toBeNull();
  });
});

describe('curated data', () => {
  it('every curated sentence has a trigger and a unique id', async () => {
    const curated = await loadCurated();
    const { cards, errors } = curatedCards(curated, rules, null);
    expect(errors).toEqual([]);
    expect(new Set(cards.map((c) => c.id)).size).toBe(curated.length);
  });

  it('curated sentences with hand-table verbs are recognised exactly as written', async () => {
    const curated = (await loadCurated()).filter((s) => HAND_VERBS.some((v) => v.inf === s.inf));
    expect(curated.length).toBeGreaterThan(5);
    const { errors } = curatedCards(curated, rules, an);
    expect(errors).toEqual([]);
  });

  it('all curated sentences are recognised with real verb tables (dev sample)', async () => {
    const real = buildAnalyzer((sample as VerbsFile).verbs);
    const curated = await loadCurated();
    expect(curated.every((s) => (sample as VerbsFile).verbs.some((v) => v.inf === s.inf))).toBe(
      true,
    );
    const { cards, errors } = curatedCards(curated, rules, real);
    expect(errors).toEqual([]);
    expect(cards.find((c) => c.id === 'm:c:si3')?.alternatives).toEqual(['hubiese sabido']);
  });

  it('covers every category and contains the contrast pairs of SPEC §3', async () => {
    const { cards } = curatedCards(await loadCurated(), rules, null);
    const cats = new Set(cards.map((c) => c.category));
    expect(cats.size).toBe(Object.keys(rulesFile.categories).length);
    const pairs = new Map<string, Set<string>>();
    for (const c of cards)
      if (c.pair) pairs.set(c.pair, (pairs.get(c.pair) ?? new Set()).add(c.mood));
    for (const p of ['creer', 'cuando', 'si', 'aunque', 'relativ'])
      expect(pairs.get(p)).toEqual(new Set(['ind', 'subj']));
  });
});

describe('orderCards', () => {
  const card = (
    id: string,
    category: ModeCard['category'],
    extra: Partial<ModeCard & { pair: string }> = {},
  ) => ({
    id,
    es: 'a b c',
    gap: [0, 1] as [number, number],
    trigger: [0, 0] as [number, number],
    inf: 'x',
    alternatives: [],
    mood: 'subj' as const,
    category,
    explanation: 'e',
    de: '',
    ...extra,
  });

  it('alternates categories, keeps pairs together, curated before Tatoeba', () => {
    const order = orderCards([
      card('t1', 'wunsch', { tatoebaId: 1 }),
      card('c1', 'wunsch'),
      card('p1', 'zweifel', { pair: 'p' }),
      card('p2', 'zweifel', { pair: 'p', mood: 'ind' }),
      card('c2', 'si'),
    ]).map((c) => c.id);
    expect(order).toEqual(['c1', 'p1', 'p2', 'c2', 't1']);
  });

  it('drops the internal pair field', () => {
    expect(orderCards([card('p1', 'si', { pair: 'p' })])[0]).not.toHaveProperty('pair');
  });
});

describe('validateMode', () => {
  it('reports missing categories and contrasts', () => {
    const file: ModeFile = {
      version: 1,
      categories: rulesFile.categories,
      explanations: {},
      cards: [],
    };
    const errors = validateMode(file);
    expect(errors).toContain('category wunsch has no cards');
    expect(errors).toContain('category zweifel has no indicative contrast');
  });
});
