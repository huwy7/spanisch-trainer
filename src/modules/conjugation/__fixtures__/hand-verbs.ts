import type { VerbEntry } from '../types.ts';

/** Hand-written tables for unit tests (standard RAE forms). */
export const HABLAR: VerbEntry = {
  inf: 'hablar',
  de: ['sprechen'],
  rank: 10,
  irregular: false,
  spelling: false,
  participle: 'hablado',
  gerund: 'hablando',
  forms: {
    pres: ['hablo', 'hablas', 'habla', 'hablamos', 'hablan'],
    indef: ['hablé', 'hablaste', 'habló', 'hablamos', 'hablaron'],
    imperf: ['hablaba', 'hablabas', 'hablaba', 'hablábamos', 'hablaban'],
    fut: ['hablaré', 'hablarás', 'hablará', 'hablaremos', 'hablarán'],
    cond: ['hablaría', 'hablarías', 'hablaría', 'hablaríamos', 'hablarían'],
    subj_pres: ['hable', 'hables', 'hable', 'hablemos', 'hablen'],
    subj_imperf: ['hablara', 'hablaras', 'hablara', 'habláramos', 'hablaran'],
    imp_aff: ['', 'habla', 'hable', 'hablemos', 'hablen'],
  },
  subjImperfSe: ['hablase', 'hablases', 'hablase', 'hablásemos', 'hablasen'],
};

export const TENER: VerbEntry = {
  inf: 'tener',
  de: ['haben'],
  rank: 3,
  irregular: true,
  spelling: false,
  participle: 'tenido',
  gerund: 'teniendo',
  forms: {
    pres: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen'],
    indef: ['tuve', 'tuviste', 'tuvo', 'tuvimos', 'tuvieron'],
    imperf: ['tenía', 'tenías', 'tenía', 'teníamos', 'tenían'],
    fut: ['tendré', 'tendrás', 'tendrá', 'tendremos', 'tendrán'],
    cond: ['tendría', 'tendrías', 'tendría', 'tendríamos', 'tendrían'],
    subj_pres: ['tenga', 'tengas', 'tenga', 'tengamos', 'tengan'],
    subj_imperf: ['tuviera', 'tuvieras', 'tuviera', 'tuviéramos', 'tuvieran'],
    imp_aff: ['', 'ten', 'tenga', 'tengamos', 'tengan'],
  },
  subjImperfSe: ['tuviese', 'tuvieses', 'tuviese', 'tuviésemos', 'tuviesen'],
};

export const HABER: VerbEntry = {
  inf: 'haber',
  de: ['haben (Hilfsverb)'],
  rank: 2,
  irregular: true,
  spelling: false,
  participle: 'habido',
  gerund: 'habiendo',
  forms: {
    pres: ['he', 'has', 'ha', 'hemos', 'han'],
    indef: ['hube', 'hubiste', 'hubo', 'hubimos', 'hubieron'],
    imperf: ['había', 'habías', 'había', 'habíamos', 'habían'],
    fut: ['habré', 'habrás', 'habrá', 'habremos', 'habrán'],
    cond: ['habría', 'habrías', 'habría', 'habríamos', 'habrían'],
    subj_pres: ['haya', 'hayas', 'haya', 'hayamos', 'hayan'],
    subj_imperf: ['hubiera', 'hubieras', 'hubiera', 'hubiéramos', 'hubieran'],
    imp_aff: ['', 'he', 'haya', 'hayamos', 'hayan'],
  },
  subjImperfSe: ['hubiese', 'hubieses', 'hubiese', 'hubiésemos', 'hubiesen'],
};

export const IR: VerbEntry = {
  inf: 'ir',
  de: ['gehen'],
  rank: 5,
  irregular: true,
  spelling: false,
  participle: 'ido',
  gerund: 'yendo',
  forms: {
    pres: ['voy', 'vas', 'va', 'vamos', 'van'],
    indef: ['fui', 'fuiste', 'fue', 'fuimos', 'fueron'],
    imperf: ['iba', 'ibas', 'iba', 'íbamos', 'iban'],
    fut: ['iré', 'irás', 'irá', 'iremos', 'irán'],
    cond: ['iría', 'irías', 'iría', 'iríamos', 'irían'],
    subj_pres: ['vaya', 'vayas', 'vaya', 'vayamos', 'vayan'],
    subj_imperf: ['fuera', 'fueras', 'fuera', 'fuéramos', 'fueran'],
    imp_aff: ['', 've', 'vaya', 'vamos', 'vayan'],
  },
  subjImperfSe: ['fuese', 'fueses', 'fuese', 'fuésemos', 'fuesen'],
};

export const HAND_VERBS = [HABLAR, TENER, HABER, IR];
export const handLookup = (inf: string) => HAND_VERBS.find((v) => v.inf === inf);
