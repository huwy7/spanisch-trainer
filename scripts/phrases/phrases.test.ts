import { describe, expect, it } from 'vitest';
import type { Phrase, PhraseFile } from '../../src/modules/phrases/types.ts';
import { FALLBACK_LEXICON, loadPhrases, validatePhrases } from './build.ts';

const phrase = (p: Partial<Phrase>): Phrase => ({
  id: 'st-001',
  cat: 'smalltalk',
  region: 'general',
  es: '¿Qué tal?',
  de: "Wie geht's?",
  ...p,
});
const file = (...phrases: Phrase[]): PhraseFile => ({ version: 1, phrases });
const check = (...phrases: Phrase[]) => validatePhrases(file(...phrases), FALLBACK_LEXICON);

describe('phrase validation', () => {
  it('accepts a valid entry', () => {
    expect(check(phrase({}))).toEqual([]);
  });

  it('checks ids, categories and regions', () => {
    expect(check(phrase({}), phrase({ es: 'Hola.' }))).toEqual(['st-001: duplicate id']);
    expect(check(phrase({ id: 'hf-001' }))).toEqual(['hf-001: id must be st-NNN']);
    expect(check(phrase({ id: 'st-1' }))).toEqual(['st-1: id must be st-NNN']);
    expect(check(phrase({ region: 'mx' as Phrase['region'] }))).toEqual([
      'st-001: unknown region mx',
    ]);
    expect(check(phrase({ de: ' ' }))).toEqual(['st-001: es and de required']);
  });

  it('finds duplicate texts, also in variants, but keeps ? and ! apart', () => {
    expect(check(phrase({}), phrase({ id: 'st-002', es: 'Hola.', alt: ['¿Qué tal?'] }))).toEqual([
      'st-002: duplicate text "¿Qué tal?"',
    ]);
    expect(check(phrase({ es: 'Bueno.' }), phrase({ id: 'st-002', es: '¿Bueno?' }))).toEqual([]);
  });

  it('rejects vosotros and voseo, also in variants', () => {
    expect(check(phrase({ es: '¿Qué os parece?' }))).toEqual([
      'st-001: vosotros in "¿Qué os parece?"',
    ]);
    expect(check(phrase({ es: '¿Cómo estáis?' }))).toEqual(['st-001: vosotros in "¿Cómo estáis?"']);
    expect(check(phrase({ alt: ['¿Sois de aquí?'] }))).toEqual([
      'st-001: vosotros in "¿Sois de aquí?"',
    ]);
    expect(check(phrase({ es: '¿Vos sabés?' }))).toEqual(['st-001: voseo in "¿Vos sabés?"']);
    expect(check(phrase({ es: '¿De dónde sos?' }))).toEqual(['st-001: voseo in "¿De dónde sos?"']);
  });

  it('validates the curated list (SPEC §3 P: 300–500 entries, all categories and regions)', async () => {
    const f = await loadPhrases();
    expect(validatePhrases(f, FALLBACK_LEXICON)).toEqual([]);
    expect(f.phrases.length).toBeGreaterThanOrEqual(300);
    expect(f.phrases.length).toBeLessThanOrEqual(500);
    for (const cat of ['smalltalk', 'hoeflichkeit', 'reaktionen', 'alltag', 'umgangssprachlich']) {
      expect(f.phrases.filter((p) => p.cat === cat).length).toBeGreaterThanOrEqual(50);
    }
    for (const region of ['general', 'es', 'latam']) {
      expect(f.phrases.some((p) => p.region === region)).toBe(true);
    }
  });
});
