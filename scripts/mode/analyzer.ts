import {
  PERSONS,
  SIMPLE_TENSES,
  type Person,
  type SimpleTense,
} from '../../src/modules/conjugation/types.ts';
import type { Mood } from '../../src/modules/mode/types.ts';
import type { ParsedVerb } from '../verbs/wiktionary.ts';

export interface FormAnalysis {
  inf: string;
  tense: SimpleTense;
  person: Person;
  /** -se variant of the subjuntivo imperfecto. */
  se?: boolean;
}

export interface Analyzer {
  finite: (form: string) => FormAnalysis[];
  /** Frequency of an infinitive (0 if unknown); used to resolve rare homographs. */
  frequency: (inf: string) => number;
  /** Infinitives whose past participle is `form`. */
  participle: (form: string) => string[];
  /** -se form of a verb for a person (alternative for -ra). */
  seForm: (inf: string, person: Person) => string | undefined;
}

export function moodOf(tense: SimpleTense): Mood | null {
  if (tense === 'subj_pres' || tense === 'subj_imperf') return 'subj';
  if (tense === 'imp_aff') return null;
  return 'ind';
}

export function buildAnalyzer(
  verbs: Iterable<ParsedVerb>,
  frequency: (inf: string) => number = () => 0,
): Analyzer {
  const finite = new Map<string, FormAnalysis[]>();
  const participles = new Map<string, string[]>();
  const se = new Map<string, ParsedVerb>();
  const add = (form: string, a: FormAnalysis) => {
    const list = finite.get(form) ?? [];
    list.push(a);
    finite.set(form, list);
  };
  for (const v of verbs) {
    se.set(v.inf, v);
    for (const tense of SIMPLE_TENSES) {
      v.forms[tense].forEach((f, i) => f && add(f, { inf: v.inf, tense, person: PERSONS[i]! }));
    }
    v.subjImperfSe.forEach((f, i) =>
      add(f, { inf: v.inf, tense: 'subj_imperf', person: PERSONS[i]!, se: true }),
    );
    participles.set(v.participle, [...(participles.get(v.participle) ?? []), v.inf]);
  }
  return {
    finite: (f) => finite.get(f) ?? [],
    frequency,
    participle: (f) => participles.get(f) ?? [],
    seForm: (inf, p) => se.get(inf)?.subjImperfSe[PERSONS.indexOf(p)],
  };
}

/** A verb counts as dominant if it is this many times more frequent than the next candidate. */
export const DOMINANCE = 20;

/**
 * Drops readings of verbs that are much rarer than the most frequent candidate
 * (vengas: venir ≫ vengar; fuimos: ser/ir ≫ fuir). Keeps all readings if frequencies are unknown.
 */
export function preferFrequent(
  analyses: FormAnalysis[],
  an: Pick<Analyzer, 'frequency'>,
): FormAnalysis[] {
  const infs = [...new Set(analyses.map((a) => a.inf))];
  if (infs.length < 2) return analyses;
  const top = Math.max(...infs.map(an.frequency));
  if (top <= 0) return analyses;
  return analyses.filter((a) => an.frequency(a.inf) * DOMINANCE >= top);
}
