import { describe, expect, it } from 'vitest';
import { countMatches, germanForms, rankMeanings } from './meanings.ts';
import { classify, phonetic, regularVerb } from './regular.ts';
import { isReflexive, parseVerb, personOf, simpleTenseOf, type WiktEntry } from './wiktionary.ts';
import { HABLAR, TENER } from '../../src/modules/conjugation/__fixtures__/hand-verbs.ts';
import { PERSONS, SIMPLE_TENSES } from '../../src/modules/conjugation/types.ts';

/** Builds a kaikki-style entry from a full table (tags as observed in the spike). */
function entryFrom(v: typeof HABLAR): WiktEntry {
  const tagMap = {
    pres: ['indicative', 'present'],
    indef: ['indicative', 'preterite'],
    imperf: ['indicative', 'imperfect'],
    fut: ['indicative', 'future'],
    cond: ['indicative', 'conditional'],
    subj_pres: ['subjunctive', 'present'],
    subj_imperf: ['subjunctive', 'imperfect'],
    imp_aff: ['imperative'],
  } as const;
  const personTags = {
    '1s': ['first-person', 'singular'],
    '2s': ['second-person', 'singular', 'informal'],
    '3s': ['third-person', 'singular'],
    '1p': ['first-person', 'plural'],
    '3p': ['third-person', 'plural'],
  } as const;
  const forms: { form: string; tags: string[] }[] = [
    { form: v.inf, tags: ['infinitive'] },
    { form: v.gerund, tags: ['gerund'] },
    { form: v.participle, tags: ['masculine', 'participle', 'past', 'singular'] },
  ];
  for (const t of SIMPLE_TENSES) {
    PERSONS.forEach((p, i) => {
      const f = v.forms[t][i];
      if (f) forms.push({ form: f, tags: [...tagMap[t], ...personTags[p]] });
      if (t === 'subj_imperf')
        forms.push({ form: v.subjImperfSe[i]!, tags: [...tagMap[t], ...personTags[p]] });
    });
  }
  // noise that must be ignored
  forms.push({ form: 'tenéis', tags: ['indicative', 'present', 'second-person', 'plural'] });
  forms.push({
    form: 'tenés',
    tags: ['indicative', 'present', 'second-person', 'singular', 'vos-form'],
  });
  forms.push({ form: 'no tengas', tags: ['imperative', 'negative', 'second-person', 'singular'] });
  return { word: v.inf, pos: 'verb', lang_code: 'es', forms };
}

describe('wiktionary tags', () => {
  it('maps tenses and skips negative imperative and future subjunctive', () => {
    expect(simpleTenseOf(['indicative', 'preterite'])).toBe('indef');
    expect(simpleTenseOf(['subjunctive', 'imperfect'])).toBe('subj_imperf');
    expect(simpleTenseOf(['imperative', 'negative'])).toBeNull();
    expect(simpleTenseOf(['subjunctive', 'future'])).toBeNull();
  });

  it('maps persons without vosotros/voseo; usted counts as 3s', () => {
    expect(personOf(['second-person', 'plural'])).toBeNull();
    expect(personOf(['second-person', 'singular', 'vos-form'])).toBeNull();
    expect(personOf(['formal', 'second-person', 'singular'])).toBe('3s');
    expect(
      personOf(['formal', 'imperative', 'second-person-semantically', 'singular', 'third-person']),
    ).toBe('3s');
  });

  it('recognises reflexive infinitives', () => {
    expect(isReflexive('quejarse')).toBe(true);
    expect(isReflexive('reírse')).toBe(true);
    expect(isReflexive('ser')).toBe(false);
  });
});

describe('parseVerb', () => {
  it('rebuilds the full table and separates -ra/-se', () => {
    const parsed = parseVerb(entryFrom(TENER));
    expect(parsed).toEqual({
      inf: 'tener',
      forms: TENER.forms,
      subjImperfSe: TENER.subjImperfSe,
      participle: 'tenido',
      gerund: 'teniendo',
    });
  });

  it('rejects incomplete tables', () => {
    const e = entryFrom(TENER);
    e.forms = e.forms!.filter((f) => f.form !== 'tuvo');
    expect(parseVerb(e)).toBeNull();
  });

  it('ignores non-verbs and other languages', () => {
    expect(parseVerb({ ...entryFrom(TENER), pos: 'noun' })).toBeNull();
    expect(parseVerb({ ...entryFrom(TENER), lang_code: 'pt' })).toBeNull();
  });
});

describe('regular pattern and classification', () => {
  it('conjugates regular -ar verbs like the hand table', () => {
    const r = regularVerb('hablar')!;
    expect(r.forms).toEqual(HABLAR.forms);
    expect(r.subjImperfSe).toEqual(HABLAR.subjImperfSe);
    expect(r.participle).toBe('hablado');
  });

  it('conjugates -er and -ir verbs', () => {
    expect(regularVerb('comer')!.forms.indef).toEqual([
      'comí',
      'comiste',
      'comió',
      'comimos',
      'comieron',
    ]);
    expect(regularVerb('vivir')!.forms.pres).toEqual(['vivo', 'vives', 'vive', 'vivimos', 'viven']);
    expect(regularVerb('vivir')!.forms.imp_aff).toEqual(['', 'vive', 'viva', 'vivamos', 'vivan']);
  });

  it('maps spellings to sounds', () => {
    expect(phonetic('busqué')).toBe('busKé');
    expect(phonetic('cojo')).toBe(phonetic('cogí').slice(0, 3) + 'o');
    expect(phonetic('leyó')).toBe('leió');
    expect(phonetic('leído')).toBe('leido');
  });

  it('classifies hablar regular, tener irregular, buscar spelling-only', () => {
    expect(classify({ ...HABLAR })).toEqual({ irregular: false, spelling: false });
    expect(classify({ ...TENER })).toEqual({ irregular: true, spelling: false });
    const buscar = regularVerb('buscar')!;
    buscar.forms.indef[0] = 'busqué';
    buscar.forms.subj_pres = ['busque', 'busques', 'busque', 'busquemos', 'busquen'];
    buscar.forms.imp_aff = ['', 'busca', 'busque', 'busquemos', 'busquen'];
    expect(classify({ inf: 'buscar', ...buscar })).toEqual({ irregular: false, spelling: true });
  });

  it('treats coger and leer as spelling-only', () => {
    const coger = regularVerb('coger')!;
    coger.forms.pres[0] = 'cojo';
    coger.forms.subj_pres = ['coja', 'cojas', 'coja', 'cojamos', 'cojan'];
    coger.forms.imp_aff = ['', 'coge', 'coja', 'cojamos', 'cojan'];
    expect(classify({ inf: 'coger', ...coger }).irregular).toBe(false);

    const leer = regularVerb('leer')!;
    leer.forms.indef = ['leí', 'leíste', 'leyó', 'leímos', 'leyeron'];
    leer.forms.subj_imperf = ['leyera', 'leyeras', 'leyera', 'leyéramos', 'leyeran'];
    leer.subjImperfSe = ['leyese', 'leyeses', 'leyese', 'leyésemos', 'leyesen'];
    leer.participle = 'leído';
    leer.gerund = 'leyendo';
    expect(classify({ inf: 'leer', ...leer })).toEqual({ irregular: false, spelling: true });
  });
});

describe('meanings', () => {
  const sentences = [
    ['ich', 'beginne', 'morgen'],
    ['wir', 'beginnen', 'jetzt'],
    ['er', 'fing', 'an'],
    ['das', 'ist', 'passiert'],
    ['das', 'konzert', 'setzt', 'ein'],
  ];
  const corpus = (s = sentences, df: Record<string, number> = {}) => ({
    sentences: s,
    total: 1000,
    df: (t: string) => df[t] ?? 1,
  });

  it('generates German verb forms without matching unrelated words', () => {
    const forms = germanForms('passen');
    expect(forms.has('passt')).toBe(true);
    expect(forms.has('gepasst')).toBe(true);
    expect(forms.has('passiert')).toBe(false);
    expect(germanForms('passieren').has('passiert')).toBe(true);
    expect(germanForms('sich ändern').has('ändert')).toBe(true);
  });

  it('counts sentences with a form of the word', () => {
    expect(countMatches('beginnen', sentences)).toBe(2);
    expect(countMatches('passen', sentences)).toBe(0);
    expect(countMatches('passieren', sentences)).toBe(1);
  });

  it('ranks by evidence and drops candidates without evidence', () => {
    const r = rankMeanings(
      { direct: ['anfangen'], reverse: ['anbrechen', 'beginnen', 'einsetzen'] },
      corpus(),
      { verb: true },
    );
    expect(r).toEqual(['beginnen']);
  });

  it('down-weights very frequent German words', () => {
    const s = [
      ['er', 'geht'],
      ['sie', 'geht'],
      ['er', 'kommt'],
    ];
    const r = rankMeanings(
      { direct: [], reverse: ['gehen', 'kommen'] },
      corpus(s, { geht: 900, kommt: 10 }),
      {
        verb: true,
      },
    );
    expect(r).toEqual(['kommen', 'gehen']);
  });

  it('falls back to table order without evidence and keeps only verbs', () => {
    const r = rankMeanings({ direct: [], reverse: ['treten', 'Anfang', 'ficken'] }, corpus([]), {
      verb: true,
      max: 1,
    });
    expect(r).toEqual(['treten']);
  });
});

describe('validateVerbs', () => {
  it('accepts complete tables and reports defects', async () => {
    const { validateVerbs } = await import('./build.ts');
    expect(validateVerbs({ version: 1, verbs: [TENER, HABLAR] })).toEqual([]);
    const broken = structuredClone(TENER);
    broken.forms.pres[4] = 'tenéis';
    broken.forms.imp_aff[0] = 'tengo';
    broken.de = [];
    expect(validateVerbs({ version: 1, verbs: [broken, broken] })).toEqual([
      'tener: no German meaning',
      'tener pres 3p: looks like vosotros (tenéis)',
      'tener imp_aff 1s: must be empty',
      'duplicate verb tener',
      'tener: no German meaning',
      'tener pres 3p: looks like vosotros (tenéis)',
      'tener imp_aff 1s: must be empty',
    ]);
  });
});
