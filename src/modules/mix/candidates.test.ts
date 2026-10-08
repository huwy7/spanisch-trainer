import { describe, expect, it } from 'vitest';
import { mixCandidates, moduleOf } from './candidates.ts';

describe('mixed mode', () => {
  it('derives the module from the card ID', () => {
    expect(moduleOf('tener:pres:1s')).toBe('K');
    expect(moduleOf('m:t:123')).toBe('M');
    expect(moduleOf('m:c:creer-1')).toBe('M');
    expect(moduleOf('s:42')).toBe('S');
    expect(moduleOf('s:r:42')).toBe('S');
    expect(moduleOf('v:casa')).toBe('V');
    expect(moduleOf('p:st-001')).toBe('P');
    expect(moduleOf('p:r:st-001')).toBe('P');
  });

  it('interleaves the module lists round-robin', () => {
    expect(mixCandidates([['k1', 'k2', 'k3'], ['m1'], [], ['v1', 'v2']])).toEqual([
      'k1',
      'm1',
      'v1',
      'k2',
      'v2',
      'k3',
    ]);
    expect(mixCandidates([])).toEqual([]);
  });
});
