import { describe, expect, it } from 'vitest';
import { HABLAR, handLookup, TENER } from './__fixtures__/hand-verbs.ts';
import { conjugationTable } from './engine.ts';
import { TENSE_INFO } from './tenseInfo.ts';
import { TENSE_IDS } from './tenses.ts';

describe('tense info content', () => {
  it('exists for every tense with use, formation and 2–3 examples', () => {
    for (const id of TENSE_IDS) {
      const info = TENSE_INFO[id];
      expect(info.use.length, id).toBeGreaterThan(20);
      expect(info.formation.length, id).toBeGreaterThan(20);
      expect(info.examples.length, id).toBeGreaterThanOrEqual(2);
      expect(info.examples.length, id).toBeLessThanOrEqual(3);
      expect(info.irregularModel, id).toBeTruthy();
    }
  });

  it('contains no vosotros or voseo in the examples (SPEC §2)', () => {
    const banned = /\b(vosotros|vosotras|vuestr[oa]s?|os|vos)\b|(?:áis|éis)\b/i;
    for (const id of TENSE_IDS)
      for (const ex of TENSE_INFO[id].examples) expect(ex.es, id).not.toMatch(banned);
  });
});

describe('conjugationTable', () => {
  it('lists all persons of a tense', () => {
    expect(conjugationTable(HABLAR, 'pres', handLookup).map((r) => r.form)).toEqual([
      'hablo',
      'hablas',
      'habla',
      'hablamos',
      'hablan',
    ]);
  });

  it('leaves out yo in the imperative and keeps -se alternatives', () => {
    expect(conjugationTable(TENER, 'imp_neg', handLookup).map((r) => r.person)).toEqual([
      '2s',
      '3s',
      '1p',
      '3p',
    ]);
    expect(conjugationTable(TENER, 'subj_imperf', handLookup)[0]).toEqual({
      person: '1s',
      form: 'tuviera',
      alternatives: ['tuviese'],
    });
  });
});
