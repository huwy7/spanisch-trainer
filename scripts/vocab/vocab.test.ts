import { describe, expect, it } from 'vitest';
import type { Corpus } from '../corpus.ts';
import {
  betterExample,
  isHomographReading,
  loadVocabOverrides,
  meaningCoverage,
  validateVocab,
  vocabCandidates,
} from './build.ts';

const lex = { vosotros: new Set(['tenéis']), voseo: new Set(['tenés']) };

describe('vocab pipeline', () => {
  it('picks lemmas by frequency, only known words made of letters', () => {
    const corpus = {
      lemmaFreq: new Map([
        ['casa', 50],
        ['de', 100],
        ['m.', 90],
        ['xyz', 80],
      ]),
      wikt: {
        info: new Map([
          ['casa', { pos: 'noun' }],
          ['de', { pos: 'other' }],
          ['m.', { pos: 'other' }],
        ]),
      },
    } as unknown as Corpus;
    expect(vocabCandidates(corpus)).toEqual(['de', 'casa']);
  });

  it('prefers shorter example sentences, then lower IDs', () => {
    const long: [number, string, string] = [1, 'Mi casa es muy grande y bonita.', ''];
    const short: [number, string, string] = [9, 'Mi casa es grande.', ''];
    const sameLen: [number, string, string] = [3, 'Tu casa es nueva.', ''];
    expect(betterExample(undefined, long)).toBe(long);
    expect(betterExample(long, short)).toBe(short);
    expect(betterExample(short, sameLen)).toBe(sameLen);
  });

  it('validates duplicates, meanings and examples', () => {
    const ok = {
      lemma: 'casa',
      pos: 'noun' as const,
      gender: 'f' as const,
      de: ['Haus'],
      rank: 1,
      ex: [1, 'Mi casa es grande.', 'Mein Haus ist gross.'] as [number, string, string],
    };
    expect(validateVocab({ version: 1, words: [ok] }, lex)).toEqual([]);
    const bad = {
      ...ok,
      de: [],
      ex: [2, '¿Tenéis una casa grande?', ''] as [number, string, string],
    };
    expect(validateVocab({ version: 1, words: [ok, bad] }, lex)).toEqual([
      'duplicate casa',
      'casa: no meaning',
      'casa: example violates the sentence filter',
    ]);
  });

  it('loads curated overrides', async () => {
    const o = await loadVocabOverrides();
    expect(o.get('y')).toEqual(['und']);
    expect(o.has('_comment')).toBe(false);
  });

  it('measures how many German sentences confirm a meaning', () => {
    const sentences = [
      ['das', 'haus', 'ist', 'groß'],
      ['er', 'war', 'müde'],
      ['im', 'hause'],
    ];
    expect(meaningCoverage(['Haus'], sentences)).toBeCloseTo(1 / 3);
    expect(meaningCoverage(['Zeitalter', 'Ära'], sentences)).toBe(0);
    expect(meaningCoverage(['wichtig sein'], [['das', 'ist', 'wichtig']])).toBe(1);
    expect(meaningCoverage(['Haus'], [])).toBe(0);
  });

  it('drops homograph readings without confirmation, keeps plain words', () => {
    expect(isHomographReading('era', ['era', 'ser'], 0.01)).toBe(true);
    expect(isHomographReading('casa', ['casa', 'casar'], 0.6)).toBe(false);
    expect(isHomographReading('mesa', ['mesa'], 0)).toBe(false);
  });
});
