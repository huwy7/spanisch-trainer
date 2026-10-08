import { describe, expect, it } from 'vitest';
import { HAND_VERBS } from '../../src/modules/conjugation/__fixtures__/hand-verbs.ts';
import { tenseMask, tensesOf } from '../../src/modules/sentences/types.ts';
import { buildAnalyzer } from '../mode/analyzer.ts';
import { lengthLevel, rarityLevel, sentenceLevel } from './level.ts';
import { detectTenses, type TenseContext } from './tenses.ts';

const an = buildAnalyzer(
  HAND_VERBS,
  (inf) => ({ tener: 1000, haber: 2000, ir: 1500, hablar: 800 })[inf] ?? 0,
);
const ctx: TenseContext = {
  an,
  nonVerb: (w) => w === 'habla' && false,
  isInfinitive: (w) => HAND_VERBS.some((v) => v.inf === w),
};
const tenses = (es: string, c = ctx) => [...detectTenses(es, c)].sort();

describe('detectTenses', () => {
  it('finds simple tenses', () => {
    expect(tenses('Tengo un perro.')).toEqual(['pres']);
    expect(tenses('Ayer hablé con ella y tuvo suerte.')).toEqual(['indef']);
    expect(tenses('Quiero que tengas suerte.')).toEqual(['subj_pres']);
    expect(tenses('Si tuviera tiempo, iría.')).toEqual(['cond', 'subj_imperf']);
  });

  it('treats haber + participle as a composed tense', () => {
    expect(tenses('He hablado con él.')).toEqual(['perf']);
    expect(tenses('Ya había tenido suerte.')).toEqual(['plusc']);
    expect(tenses('Ojalá hubiera hablado.')).toEqual(['subj_plusc']);
  });

  it('recognises ir a + infinitive but not ir a + noun', () => {
    expect(tenses('Voy a hablar con ella.')).toEqual(['ir_a']);
    expect(tenses('Voy a la playa.')).toEqual(['pres']);
  });

  it('skips words that are more likely not verbs', () => {
    const c = { ...ctx, nonVerb: (w: string) => w === 'tengo' };
    expect(tenses('Tengo frío.', c)).toEqual([]);
  });

  it('does not tag imperative-only readings', () => {
    expect(tenses('Ten cuidado.')).toEqual([]);
  });
});

describe('level', () => {
  it('uses the maximum of tense, vocabulary and length', () => {
    expect(sentenceLevel(['pres'], 300, 5)).toBe('A2');
    expect(sentenceLevel(['subj_pres'], 300, 5)).toBe('B1');
    expect(sentenceLevel(['pres'], 5000, 5)).toBe('B2');
    expect(sentenceLevel([], 300, 15)).toBe('B2');
    expect(rarityLevel(Infinity)).toBe('B2');
    expect(lengthLevel(9)).toBe('B1');
  });
});

describe('tense bitmask', () => {
  it('round-trips tense sets', () => {
    expect(tensesOf(tenseMask(['pres', 'subj_plusc', 'ir_a']))).toEqual([
      'pres',
      'ir_a',
      'subj_plusc',
    ]);
    expect(tenseMask([])).toBe(0);
  });
});
