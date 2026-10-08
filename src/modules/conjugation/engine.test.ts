import { describe, expect, it } from 'vitest';
import { HAND_VERBS, HABLAR, IR, TENER, handLookup } from './__fixtures__/hand-verbs.ts';
import {
  cardId,
  conjugate,
  generateCards,
  gradeAnswer,
  interleave,
  parseCardId,
} from './engine.ts';
import { TENSES, TENSE_IDS, personLabel, tensesOfLevel } from './tenses.ts';
import { PERSONS } from './types.ts';

const c = (
  verb = TENER,
  tense: Parameters<typeof conjugate>[1],
  person: Parameters<typeof conjugate>[2],
) => conjugate(verb, tense, person, handLookup);

describe('tense catalog (SPEC §3)', () => {
  it('assigns the levels from SPEC §3', () => {
    expect(tensesOfLevel('A2')).toEqual(['pres', 'indef', 'perf', 'ir_a']);
    expect(tensesOfLevel('B1')).toEqual([
      'imperf',
      'fut',
      'cond',
      'subj_pres',
      'imp_aff',
      'imp_neg',
    ]);
    expect(tensesOfLevel('B2')).toEqual([
      'subj_imperf',
      'plusc',
      'fut_perf',
      'cond_comp',
      'subj_perf',
      'subj_plusc',
    ]);
  });

  it('has no imperative for yo', () => {
    expect(TENSES.imp_aff.persons).not.toContain('1s');
    expect(TENSES.imp_neg.persons).not.toContain('1s');
    expect(c(TENER, 'imp_aff', '1s')).toBeNull();
  });

  it('never contains vosotros persons', () => {
    for (const id of TENSE_IDS) for (const p of TENSES[id].persons) expect(PERSONS).toContain(p);
  });

  it('labels imperative persons as usted/ustedes', () => {
    expect(personLabel('3s', 'imp_aff')).toBe('usted');
    expect(personLabel('3p', 'pres')).toBe('ellos / ellas / ustedes');
  });
});

describe('conjugate', () => {
  it('returns simple forms from the data', () => {
    expect(c(TENER, 'pres', '1s')?.answer).toBe('tengo');
    expect(c(TENER, 'indef', '3s')?.answer).toBe('tuvo');
    expect(c(HABLAR, 'subj_pres', '1p')?.answer).toBe('hablemos');
  });

  it('composes perfect tenses with haber + participle', () => {
    expect(c(HABLAR, 'perf', '1s')?.answer).toBe('he hablado');
    expect(c(TENER, 'plusc', '3p')?.answer).toBe('habían tenido');
    expect(c(IR, 'fut_perf', '2s')?.answer).toBe('habrás ido');
    expect(c(HABLAR, 'cond_comp', '1p')?.answer).toBe('habríamos hablado');
    expect(c(TENER, 'subj_perf', '3s')?.answer).toBe('haya tenido');
    expect(c(HABLAR, 'subj_plusc', '1p')).toEqual({
      answer: 'hubiéramos hablado',
      alternatives: ['hubiésemos hablado'],
    });
  });

  it('composes ir a + infinitive', () => {
    expect(c(HABLAR, 'ir_a', '1s')?.answer).toBe('voy a hablar');
    expect(c(IR, 'ir_a', '3p')?.answer).toBe('van a ir');
  });

  it('builds the negative imperative from the present subjunctive', () => {
    expect(c(TENER, 'imp_neg', '2s')?.answer).toBe('no tengas');
    expect(c(HABLAR, 'imp_neg', '3p')?.answer).toBe('no hablen');
    expect(c(IR, 'imp_neg', '1p')?.answer).toBe('no vayamos');
  });

  it('keeps the affirmative imperative irregulars', () => {
    expect(c(TENER, 'imp_aff', '2s')?.answer).toBe('ten');
    expect(c(IR, 'imp_aff', '2s')?.answer).toBe('ve');
    expect(c(IR, 'imp_aff', '1p')?.answer).toBe('vamos');
  });

  it('offers -se only as alternative for subjuntivo imperfecto', () => {
    expect(c(TENER, 'subj_imperf', '1p')).toEqual({
      answer: 'tuviéramos',
      alternatives: ['tuviésemos'],
    });
    expect(c(TENER, 'pres', '1s')?.alternatives).toEqual([]);
  });

  it('returns null when an auxiliary is missing', () => {
    expect(conjugate(HABLAR, 'perf', '1s', () => undefined)).toBeNull();
  });
});

describe('card IDs (SPEC §4)', () => {
  it('formats verb:tense:person and parses it back', () => {
    const ref = { inf: 'tener', tense: 'subj_pres', person: '2s' } as const;
    expect(cardId(ref)).toBe('tener:subj_pres:2s');
    expect(parseCardId('tener:subj_pres:2s')).toEqual(ref);
  });

  it('rejects invalid IDs', () => {
    expect(parseCardId('tener:imp_aff:1s')).toBeNull();
    expect(parseCardId('tener:pres:2p')).toBeNull();
    expect(parseCardId('tener:unknown:1s')).toBeNull();
    expect(parseCardId('tener:pres:1s:x')).toBeNull();
  });
});

describe('generateCards', () => {
  it('creates one card per valid verb/tense/person, frequent verbs first', () => {
    const cards = generateCards(
      HAND_VERBS,
      { tenses: ['pres', 'imp_aff'], onlyIrregular: false },
      handLookup,
    );
    expect(cards).toHaveLength(4 * (5 + 4));
    expect(cards[0]!.inf).toBe('haber');
    expect(new Set(cards.map(cardId)).size).toBe(cards.length);
  });

  it('filters irregular verbs', () => {
    const cards = generateCards(HAND_VERBS, { tenses: ['pres'], onlyIrregular: true }, handLookup);
    expect(new Set(cards.map((c) => c.inf))).toEqual(new Set(['tener', 'haber', 'ir']));
  });
});

describe('interleave', () => {
  const cards = generateCards(
    HAND_VERBS,
    { tenses: ['pres', 'indef'], onlyIrregular: false },
    handLookup,
  );

  it('keeps all cards, mixes within a block and is deterministic', () => {
    const a = interleave(cards, 2);
    expect(a).toHaveLength(cards.length);
    expect(new Set(a.map(cardId))).toEqual(new Set(cards.map(cardId)));
    expect(a.map(cardId)).toEqual(interleave(cards, 2).map(cardId));
    expect(a.map(cardId)).not.toEqual(cards.map(cardId));
  });

  it('introduces the most frequent verbs first', () => {
    const a = interleave(cards, 2);
    const firstBlock = new Set(a.slice(0, 20).map((c) => c.inf));
    expect(firstBlock).toEqual(new Set(['haber', 'tener']));
  });
});

describe('gradeAnswer', () => {
  const tuvieramos = { answer: 'tuviéramos', alternatives: ['tuviésemos'] };

  it('accepts exact answers, case and whitespace insensitive', () => {
    expect(gradeAnswer('  Tuviéramos ', tuvieramos)).toBe('correct');
    expect(gradeAnswer('tuviésemos', tuvieramos)).toBe('correct');
    expect(gradeAnswer('he  hablado', { answer: 'he hablado', alternatives: [] })).toBe('correct');
  });

  it('flags missing accents or tilde as almost right', () => {
    expect(gradeAnswer('tuvieramos', tuvieramos)).toBe('accent');
    expect(gradeAnswer('nino', { answer: 'niño', alternatives: [] })).toBe('accent');
    expect(gradeAnswer('hablo', { answer: 'habló', alternatives: [] })).toBe('accent');
  });

  it('rejects wrong forms', () => {
    expect(gradeAnswer('tenemos', tuvieramos)).toBe('wrong');
    expect(gradeAnswer('', tuvieramos)).toBe('wrong');
  });

  it('treats decomposed unicode input like composed input', () => {
    expect(gradeAnswer('habló', { answer: 'habló', alternatives: [] })).toBe('correct');
  });
});
