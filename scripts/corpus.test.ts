import { describe, expect, it } from 'vitest';
import { genderOf, isLetterName, replacesInfo } from './corpus.ts';

describe('genderOf', () => {
  it('reads the es-noun head template', () => {
    expect(genderOf({ head_templates: [{ name: 'es-noun', args: { '1': 'f' } }] })).toBe('f');
    expect(genderOf({ head_templates: [{ name: 'es-noun', args: { '1': 'm-p' } }] })).toBe('m');
    expect(genderOf({ head_templates: [{ name: 'es-noun', args: { '1': 'mf' } }] })).toBe('mf');
  });

  it('falls back to the expansion text and to tags', () => {
    expect(
      genderOf({ head_templates: [{ name: 'es-noun', expansion: 'casa f (plural casas)' }] }),
    ).toBe('f');
    expect(
      genderOf({
        head_templates: [{ name: 'es-noun', expansion: 'artista m or f (plural artistas)' }],
      }),
    ).toBe('mf');
    expect(genderOf({ tags: ['masculine'] })).toBe('m');
    expect(genderOf({})).toBeUndefined();
  });
});

describe('replacesInfo', () => {
  it('lets a function word beat a noun reading, otherwise the first entry wins', () => {
    expect(replacesInfo({ pos: 'noun', gender: 'f' }, 'pron')).toBe(true); // me
    expect(replacesInfo({ pos: 'noun' }, 'intj')).toBe(false); // hombre
    expect(replacesInfo({ pos: 'noun' }, 'adv')).toBe(false);
    expect(replacesInfo({ pos: 'noun' }, 'adj')).toBe(false);
    expect(replacesInfo({ pos: 'adj' }, 'noun')).toBe(false);
    expect(replacesInfo({ pos: 'other' }, 'pron')).toBe(false);
  });
});

describe('isLetterName', () => {
  it('detects noun entries that only name a letter', () => {
    const gloss = (g: string) => ({ glosses: [g] });
    expect(
      isLetterName({ pos: 'noun', senses: [gloss('The name of the Latin-script letter D/d.')] }),
    ).toBe(true);
    expect(
      isLetterName({
        pos: 'noun',
        senses: [gloss('The name of the Latin-script letter T/t.'), gloss('tea')],
      }),
    ).toBe(false);
    expect(isLetterName({ pos: 'prep', senses: [gloss('of, from')] })).toBe(false);
    expect(isLetterName({ pos: 'noun', senses: [] })).toBe(false);
  });
});
