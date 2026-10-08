import { PERSONS, type Person, type SimpleTense } from './types.ts';

export type Level = 'A2' | 'B1' | 'B2';

/** Stable tense IDs. They are part of card IDs: never rename (SPEC §4). */
export const TENSE_IDS = [
  'pres',
  'indef',
  'perf',
  'ir_a',
  'imperf',
  'fut',
  'cond',
  'subj_pres',
  'imp_aff',
  'imp_neg',
  'subj_imperf',
  'plusc',
  'fut_perf',
  'cond_comp',
  'subj_perf',
  'subj_plusc',
] as const;
export type TenseId = (typeof TENSE_IDS)[number];

export type Composition =
  | { kind: 'simple'; tense: SimpleTense }
  | { kind: 'perfect'; haber: SimpleTense }
  | { kind: 'ir_a' }
  | { kind: 'negative_imperative' };

export interface TenseInfo {
  id: TenseId;
  label: string;
  level: Level;
  persons: readonly Person[];
  composition: Composition;
}

const ALL = PERSONS;
const IMPERATIVE: readonly Person[] = ['2s', '3s', '1p', '3p'];

export const TENSES: Record<TenseId, TenseInfo> = {
  pres: t('pres', 'Presente', 'A2', ALL, simple('pres')),
  indef: t('indef', 'Pretérito indefinido', 'A2', ALL, simple('indef')),
  perf: t('perf', 'Pretérito perfecto', 'A2', ALL, perfect('pres')),
  ir_a: t('ir_a', 'ir a + Infinitiv', 'A2', ALL, { kind: 'ir_a' }),
  imperf: t('imperf', 'Imperfecto', 'B1', ALL, simple('imperf')),
  fut: t('fut', 'Futuro simple', 'B1', ALL, simple('fut')),
  cond: t('cond', 'Condicional simple', 'B1', ALL, simple('cond')),
  subj_pres: t('subj_pres', 'Subjuntivo presente', 'B1', ALL, simple('subj_pres')),
  imp_aff: t('imp_aff', 'Imperativo afirmativo', 'B1', IMPERATIVE, simple('imp_aff')),
  imp_neg: t('imp_neg', 'Imperativo negativo', 'B1', IMPERATIVE, {
    kind: 'negative_imperative',
  }),
  subj_imperf: t('subj_imperf', 'Subjuntivo imperfecto', 'B2', ALL, simple('subj_imperf')),
  plusc: t('plusc', 'Pluscuamperfecto', 'B2', ALL, perfect('imperf')),
  fut_perf: t('fut_perf', 'Futuro perfecto', 'B2', ALL, perfect('fut')),
  cond_comp: t('cond_comp', 'Condicional compuesto', 'B2', ALL, perfect('cond')),
  subj_perf: t('subj_perf', 'Subjuntivo perfecto', 'B2', ALL, perfect('subj_pres')),
  subj_plusc: t('subj_plusc', 'Subjuntivo pluscuamperfecto', 'B2', ALL, perfect('subj_imperf')),
};

export const LEVELS: readonly Level[] = ['A2', 'B1', 'B2'];

export function tensesOfLevel(level: Level): TenseId[] {
  return TENSE_IDS.filter((id) => TENSES[id].level === level);
}

/** Pronoun shown on the card; imperatives address the listener. */
export function personLabel(person: Person, tense: TenseId): string {
  const imperative = tense === 'imp_aff' || tense === 'imp_neg';
  switch (person) {
    case '1s':
      return 'yo';
    case '2s':
      return 'tú';
    case '3s':
      return imperative ? 'usted' : 'él / ella / usted';
    case '1p':
      return 'nosotros';
    case '3p':
      return imperative ? 'ustedes' : 'ellos / ellas / ustedes';
  }
}

function t(
  id: TenseId,
  label: string,
  level: Level,
  persons: readonly Person[],
  composition: Composition,
): TenseInfo {
  return { id, label, level, persons, composition };
}

function simple(tense: SimpleTense): Composition {
  return { kind: 'simple', tense };
}

function perfect(haber: SimpleTense): Composition {
  return { kind: 'perfect', haber };
}
