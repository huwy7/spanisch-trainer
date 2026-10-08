import { describe, expect, it } from 'vitest';
import { lemmaFrequencies, parseFrequencyLine } from './frequency.ts';

describe('lemmaFrequencies', () => {
  const lemmas = new Set(['comer', 'como', 'tener']);
  const forms: Record<string, string[]> = {
    tengo: ['tener'],
    comes: ['comer'],
    vino: ['venir', 'vino'],
  };
  const freq = lemmaFrequencies(
    [
      { form: 'como', count: 10 },
      { form: 'tengo', count: 5 },
      { form: 'comes', count: 2 },
      { form: 'xyz', count: 99 },
    ],
    (w) => lemmas.has(w),
    (f) => forms[f] ?? [],
  );

  it('sums forms per lemma and prefers a form that is itself a lemma', () => {
    expect(freq.get('como')).toBe(10);
    expect(freq.get('comer')).toBe(2);
    expect(freq.get('tener')).toBe(5);
    expect(freq.has('xyz')).toBe(false);
  });

  it('parses list lines', () => {
    expect(parseFrequencyLine('Tengo 123')).toEqual({ form: 'tengo', count: 123 });
    expect(parseFrequencyLine('')).toBeNull();
  });
});
