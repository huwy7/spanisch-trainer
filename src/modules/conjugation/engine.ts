import { TENSES, TENSE_IDS, type TenseId } from './tenses.ts';
import { PERSONS, type Person, type VerbEntry } from './types.ts';

export interface Conjugation {
  /** The form that is asked. */
  answer: string;
  /** Also accepted and shown (e.g. subjuntivo imperfecto on -se). */
  alternatives: string[];
}

/** Lookup for auxiliaries (haber, ir) needed by composed tenses. */
export type VerbLookup = (inf: string) => VerbEntry | undefined;

const idx = (p: Person) => PERSONS.indexOf(p);

/**
 * Conjugates `verb` in `tense` for `person`.
 * Returns null if the combination does not exist (e.g. imperative for yo) or data is missing.
 */
export function conjugate(
  verb: VerbEntry,
  tense: TenseId,
  person: Person,
  lookup: VerbLookup,
): Conjugation | null {
  const info = TENSES[tense];
  if (!info.persons.includes(person)) return null;
  const i = idx(person);
  const c = info.composition;

  switch (c.kind) {
    case 'simple': {
      const answer = verb.forms[c.tense][i];
      if (!answer) return null;
      const se = c.tense === 'subj_imperf' ? verb.subjImperfSe[i] : '';
      return { answer, alternatives: se ? [se] : [] };
    }
    case 'perfect': {
      const haber = lookup('haber');
      const aux = haber?.forms[c.haber][i];
      if (!aux || !verb.participle) return null;
      const answer = `${aux} ${verb.participle}`;
      const auxSe = c.haber === 'subj_imperf' ? haber?.subjImperfSe[i] : '';
      return { answer, alternatives: auxSe ? [`${auxSe} ${verb.participle}`] : [] };
    }
    case 'ir_a': {
      const aux = lookup('ir')?.forms.pres[i];
      if (!aux) return null;
      return { answer: `${aux} a ${verb.inf}`, alternatives: [] };
    }
    case 'negative_imperative': {
      const subj = verb.forms.subj_pres[i];
      if (!subj) return null;
      return { answer: `no ${subj}`, alternatives: [] };
    }
  }
}

// ------------------------------------------------------------------ card IDs

export interface CardRef {
  inf: string;
  tense: TenseId;
  person: Person;
}

/** Stable card ID `verb:tense:person` (SPEC §4). */
export function cardId({ inf, tense, person }: CardRef): string {
  return `${inf}:${tense}:${person}`;
}

export function parseCardId(id: string): CardRef | null {
  const [inf, tense, person, ...rest] = id.split(':');
  if (!inf || rest.length) return null;
  if (!(TENSE_IDS as readonly string[]).includes(tense ?? '')) return null;
  if (!(PERSONS as readonly string[]).includes(person ?? '')) return null;
  const ref = { inf, tense: tense as TenseId, person: person as Person };
  return TENSES[ref.tense].persons.includes(ref.person) ? ref : null;
}

export interface CardFilter {
  tenses: readonly TenseId[];
  onlyIrregular: boolean;
}

/** All valid cards for the filter, most frequent verbs first. */
export function generateCards(
  verbs: readonly VerbEntry[],
  filter: CardFilter,
  lookup: VerbLookup,
): CardRef[] {
  const cards: CardRef[] = [];
  const sorted = [...verbs].sort((a, b) => a.rank - b.rank);
  for (const verb of sorted) {
    if (filter.onlyIrregular && !verb.irregular) continue;
    for (const tense of filter.tenses) {
      for (const person of TENSES[tense].persons) {
        if (conjugate(verb, tense, person, lookup)) cards.push({ inf: verb.inf, tense, person });
      }
    }
  }
  return cards;
}

/** FNV-1a hash; deterministic pseudo-random order per card ID. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/**
 * Order for introducing new cards: frequent verbs first, but mixed within blocks of
 * `blockSize` verbs so a session does not drill one verb in all tenses at once.
 * Deterministic: the same filter always yields the same order.
 */
export function interleave(cards: readonly CardRef[], blockSize = 5): CardRef[] {
  const verbIndex = new Map<string, number>();
  for (const c of cards) if (!verbIndex.has(c.inf)) verbIndex.set(c.inf, verbIndex.size);
  const key = (c: CardRef) => Math.floor(verbIndex.get(c.inf)! / blockSize);
  return [...cards].sort((a, b) => key(a) - key(b) || hash(cardId(a)) - hash(cardId(b)));
}

// ------------------------------------------------------------ answer grading

export type Grade = 'correct' | 'accent' | 'wrong';

const normalize = (s: string) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const stripAccents = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '');

/**
 * Typing mode: exact match → correct; match only without accents/tilde → accent
 * ("fast richtig", rated Hard); anything else → wrong.
 */
export function gradeAnswer(input: string, expected: Conjugation): Grade {
  const given = normalize(input);
  const accepted = [expected.answer, ...expected.alternatives].map(normalize);
  if (accepted.includes(given)) return 'correct';
  if (accepted.map(stripAccents).includes(stripAccents(given))) return 'accent';
  return 'wrong';
}
