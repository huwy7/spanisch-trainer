import { describe, expect, it } from 'vitest';
import { phraseCardId, selectPhrases } from './filter.ts';
import type { Phrase } from './types.ts';

const p = (id: string, cat: Phrase['cat'], region: Phrase['region'] = 'general'): Phrase => ({
  id,
  cat,
  region,
  es: id,
  de: id,
});
const list = [
  p('st-001', 'smalltalk'),
  p('st-002', 'smalltalk', 'es'),
  p('st-003', 'smalltalk'),
  p('re-001', 'reaktionen', 'latam'),
  p('re-002', 'reaktionen'),
  p('al-001', 'alltag'),
];
const ids = (ps: Phrase[]) => ps.map((x) => x.id);

describe('phrase selection', () => {
  it('builds stable card IDs per direction', () => {
    expect(phraseCardId('st-001', 'de-es')).toBe('p:st-001');
    expect(phraseCardId('st-001', 'es-de')).toBe('p:r:st-001');
  });

  it('interleaves categories, keeping the file order within each', () => {
    expect(ids(selectPhrases(list, [], ['es', 'latam']))).toEqual([
      'st-001',
      're-001',
      'al-001',
      'st-002',
      're-002',
      'st-003',
    ]);
  });

  it('filters categories; general phrases stay with any region selection', () => {
    expect(ids(selectPhrases(list, ['reaktionen'], ['es', 'latam']))).toEqual(['re-001', 're-002']);
    expect(ids(selectPhrases(list, ['smalltalk', 'reaktionen'], []))).toEqual([
      'st-001',
      're-002',
      'st-003',
    ]);
  });
});
