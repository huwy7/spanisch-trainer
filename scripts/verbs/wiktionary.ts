import {
  PERSONS,
  SIMPLE_TENSES,
  type FormRow,
  type Person,
  type SimpleTense,
} from '../../src/modules/conjugation/types.ts';

/** Subset of a kaikki.org (wiktextract) entry that the pipeline reads. */
export interface WiktEntry {
  word?: string;
  pos?: string;
  lang_code?: string;
  senses?: { glosses?: string[]; tags?: string[]; form_of?: { word: string }[] }[];
  forms?: { form: string; tags?: string[] }[];
  translations?: { lang_code?: string; code?: string; word?: string }[];
}

export interface ParsedVerb {
  inf: string;
  forms: Record<SimpleTense, FormRow>;
  subjImperfSe: FormRow;
  participle: string;
  gerund: string;
}

const SKIP_TAGS = new Set(['archaic', 'obsolete', 'dated', 'rare', 'nonstandard', 'misspelling']);
const SE_ENDING = /(se|ses|semos|sen)$/;

export function simpleTenseOf(tags: readonly string[]): SimpleTense | null {
  const t = new Set(tags);
  if (t.has('imperative')) return t.has('negative') ? null : 'imp_aff';
  if (t.has('subjunctive')) {
    if (t.has('present')) return 'subj_pres';
    if (t.has('imperfect')) return 'subj_imperf';
    return null; // future subjunctive: not used
  }
  if (!t.has('indicative')) return null;
  if (t.has('conditional')) return 'cond';
  if (t.has('future')) return 'fut';
  if (t.has('preterite')) return 'indef';
  if (t.has('imperfect')) return 'imperf';
  if (t.has('present')) return 'pres';
  return null;
}

/** Person without vosotros and voseo; usted/ustedes map to 3s/3p (SPEC §2). */
export function personOf(tags: readonly string[]): Person | null {
  const t = new Set(tags);
  if (t.has('vos-form') || t.has('voseo')) return null;
  const sg = t.has('singular');
  const pl = t.has('plural');
  if (t.has('first-person')) return sg ? '1s' : pl ? '1p' : null;
  if (t.has('third-person')) return sg ? '3s' : pl ? '3p' : null;
  if (t.has('second-person')) {
    if (t.has('formal')) return sg ? '3s' : pl ? '3p' : null;
    return sg ? '2s' : null; // 2nd person plural = vosotros: excluded
  }
  return null;
}

/** True for infinitives of pronominal verbs (quejarse); not exported in M1. */
export const isReflexive = (inf: string) => /(ar|er|ir|ír)se$/.test(inf);

/**
 * Builds the conjugation table of a verb entry.
 * Returns null if any required form is missing (incomplete tables are not exported).
 */
export function parseVerb(entry: WiktEntry): ParsedVerb | null {
  if (entry.lang_code !== 'es' || entry.pos !== 'verb' || !entry.word) return null;
  const inf = entry.word.toLowerCase();
  const cells = new Map<string, string>(); // first form wins (Wiktionary lists the standard form first)
  const se = new Map<Person, string>();
  let participle = '';
  let gerund = '';

  for (const f of entry.forms ?? []) {
    const tags = f.tags ?? [];
    const form = f.form?.trim().toLowerCase();
    if (!form || form.includes(' ') || tags.some((t) => SKIP_TAGS.has(t))) continue;
    if (
      !participle &&
      tags.includes('participle') &&
      tags.includes('masculine') &&
      tags.includes('singular')
    ) {
      participle = form;
      continue;
    }
    if (!gerund && tags.includes('gerund')) {
      gerund = form;
      continue;
    }
    const tense = simpleTenseOf(tags);
    const person = personOf(tags);
    if (!tense || !person) continue;
    if (tense === 'subj_imperf' && SE_ENDING.test(form)) {
      if (!se.has(person)) se.set(person, form);
      continue;
    }
    const key = `${tense}:${person}`;
    if (!cells.has(key)) cells.set(key, form);
  }

  const forms = {} as Record<SimpleTense, FormRow>;
  for (const tense of SIMPLE_TENSES) {
    const row = PERSONS.map((p) =>
      tense === 'imp_aff' && p === '1s' ? '' : (cells.get(`${tense}:${p}`) ?? ''),
    ) as FormRow;
    const complete = row.every((f, i) => f || (tense === 'imp_aff' && i === 0));
    if (!complete) return null;
    forms[tense] = row;
  }
  const subjImperfSe = PERSONS.map((p) => se.get(p) ?? '') as FormRow;
  if (!participle || !gerund || subjImperfSe.some((f) => !f)) return null;
  return { inf, forms, subjImperfSe, participle, gerund };
}
