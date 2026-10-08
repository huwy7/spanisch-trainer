import { describe, expect, it } from 'vitest';
import sample from '../../../data/dev/verbs.sample.json';
import reference from './__fixtures__/reference.json';
import { conjugate } from './engine.ts';
import type { TenseId } from './tenses.ts';
import type { Person, VerbsFile } from './types.ts';

/**
 * DoD M1: engine output vs an independent reference (Fred Jehle's verb database).
 * Covers simple and composed tenses incl. negative imperative for the dev-sample verbs.
 */
describe('engine vs reference (≥ 200 samples)', () => {
  const verbs = (sample as VerbsFile).verbs;
  const byInf = new Map(verbs.map((v) => [v.inf, v]));
  const lookup = (inf: string) => byInf.get(inf);
  const refs = reference as { inf: string; tense: TenseId; person: Person; form: string }[];

  it('has at least 200 reference forms', () => {
    expect(refs.length).toBeGreaterThanOrEqual(200);
  });

  it('matches every reference form', () => {
    const wrong = refs.filter(
      (r) => conjugate(byInf.get(r.inf)!, r.tense, r.person, lookup)?.answer !== r.form,
    );
    expect(wrong).toEqual([]);
  });
});
