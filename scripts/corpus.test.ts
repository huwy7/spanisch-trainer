import { describe, expect, it } from 'vitest';
import { genderOf } from './corpus.ts';

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
