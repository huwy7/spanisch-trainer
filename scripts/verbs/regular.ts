import {
  SIMPLE_TENSES,
  type FormRow,
  type SimpleTense,
} from '../../src/modules/conjugation/types.ts';
import type { ParsedVerb } from './wiktionary.ts';

type Group = 'ar' | 'er' | 'ir';

const ENDINGS: Record<Group, Record<Exclude<SimpleTense, 'fut' | 'cond' | 'imp_aff'>, FormRow>> = {
  ar: {
    pres: ['o', 'as', 'a', 'amos', 'an'],
    indef: ['é', 'aste', 'ó', 'amos', 'aron'],
    imperf: ['aba', 'abas', 'aba', 'ábamos', 'aban'],
    subj_pres: ['e', 'es', 'e', 'emos', 'en'],
    subj_imperf: ['ara', 'aras', 'ara', 'áramos', 'aran'],
  },
  er: {
    pres: ['o', 'es', 'e', 'emos', 'en'],
    indef: ['í', 'iste', 'ió', 'imos', 'ieron'],
    imperf: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    subj_pres: ['a', 'as', 'a', 'amos', 'an'],
    subj_imperf: ['iera', 'ieras', 'iera', 'iéramos', 'ieran'],
  },
  ir: {
    pres: ['o', 'es', 'e', 'imos', 'en'],
    indef: ['í', 'iste', 'ió', 'imos', 'ieron'],
    imperf: ['ía', 'ías', 'ía', 'íamos', 'ían'],
    subj_pres: ['a', 'as', 'a', 'amos', 'an'],
    subj_imperf: ['iera', 'ieras', 'iera', 'iéramos', 'ieran'],
  },
};
const FUT: FormRow = ['é', 'ás', 'á', 'emos', 'án'];
const COND: FormRow = ['ía', 'ías', 'ía', 'íamos', 'ían'];
const SE: Record<Group, FormRow> = {
  ar: ['ase', 'ases', 'ase', 'ásemos', 'asen'],
  er: ['iese', 'ieses', 'iese', 'iésemos', 'iesen'],
  ir: ['iese', 'ieses', 'iese', 'iésemos', 'iesen'],
};

const row = (prefix: string, endings: FormRow) => endings.map((e) => prefix + e) as FormRow;

/** Conjugation of `inf` following the regular -ar/-er/-ir patterns (no orthographic adjustments). */
export function regularVerb(inf: string): Omit<ParsedVerb, 'inf'> | null {
  const m = /^(.+)(ar|er|ir)$/.exec(inf);
  if (!m) return null;
  const stem = m[1]!;
  const group = m[2] as Group;
  const e = ENDINGS[group];
  const subjPres = row(stem, e.subj_pres);
  const pres = row(stem, e.pres);
  return {
    forms: {
      pres,
      indef: row(stem, e.indef),
      imperf: row(stem, e.imperf),
      fut: row(inf, FUT),
      cond: row(inf, COND),
      subj_pres: subjPres,
      subj_imperf: row(stem, e.subj_imperf),
      imp_aff: ['', pres[2], subjPres[2], subjPres[3], subjPres[4]],
    },
    subjImperfSe: row(stem, SE[group]),
    participle: stem + (group === 'ar' ? 'ado' : 'ido'),
    gerund: stem + (group === 'ar' ? 'ando' : 'iendo'),
  };
}

/** Consonant spellings → sounds (c/qu/z, g/gu/gü/j). */
function consonants(form: string): string {
  return form
    .replace(/qu(?=[eéií])/g, 'K')
    .replace(/c(?=[aáoóuú])/g, 'K')
    .replace(/c(?=[eéií])/g, 'Z')
    .replace(/z/g, 'Z')
    .replace(/gü(?=[eéií])/g, 'GW')
    .replace(/gu(?=[eéií])/g, 'G')
    .replace(/gu(?=[aáoó])/g, 'GW')
    .replace(/g(?=[aáoóuú])/g, 'G')
    .replace(/g(?=[eéií])/g, 'J')
    .replace(/j/g, 'J');
}

/** Vowel spellings: y between vowels (leyó) and hiatus accents (leído) are orthographic. */
function vowels(form: string): string {
  return form.replace(/(?<=[aeiouáéíóú])y(?=[aeiouáéíóú])/g, 'i').replace(/(?<=[aeo])í/g, 'i');
}

/** Sound representation of a written form. */
export function phonetic(form: string): string {
  return vowels(consonants(form));
}

export interface Classification {
  irregular: boolean;
  spelling: boolean;
}

/**
 * Compares a verb with its regular pattern (SPEC §3). The regular form is built from the
 * *sound* of the stem as heard in the infinitive, so buscar → busqué, coger → cojo,
 * leer → leyó count as spelling changes, tener → tengo as irregular.
 */
export function classify(verb: ParsedVerb): Classification {
  const reg = regularVerb(verb.inf);
  if (!reg) return { irregular: true, spelling: false };
  const inf = verb.inf;
  const stem = inf.slice(0, -2);
  const infSound = consonants(inf);
  const stemSound = infSound.slice(0, -2);
  const expectedSound = (regular: string) =>
    vowels(
      regular.startsWith(inf)
        ? infSound + regular.slice(inf.length)
        : stemSound + regular.slice(stem.length),
    );

  const pairs: [string, string][] = [
    [verb.participle, reg.participle],
    [verb.gerund, reg.gerund],
  ];
  for (const t of SIMPLE_TENSES) {
    verb.forms[t].forEach((f, i) => pairs.push([f, reg.forms[t][i]!]));
  }
  verb.subjImperfSe.forEach((f, i) => pairs.push([f, reg.subjImperfSe[i]!]));

  let spelling = false;
  for (const [actual, regular] of pairs) {
    if (actual === regular) continue;
    if (phonetic(actual) === expectedSound(regular)) spelling = true;
    else return { irregular: true, spelling: false };
  }
  return { irregular: false, spelling };
}
