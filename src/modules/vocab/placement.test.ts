import { describe, expect, it } from 'vitest';
import { blockOf, genderLabel, isBlockEnd, suggestStop, swipeDecision } from './placement.ts';

describe('placement', () => {
  it('decides by swipe direction above the threshold', () => {
    expect(swipeDecision(120)).toBe('known');
    expect(swipeDecision(-90)).toBe('unknown');
    expect(swipeDecision(40)).toBeNull();
    expect(swipeDecision(-79)).toBeNull();
  });

  it('counts blocks of 50', () => {
    expect(blockOf(0)).toEqual({ block: 1, position: 1 });
    expect(blockOf(49)).toEqual({ block: 1, position: 50 });
    expect(blockOf(50)).toEqual({ block: 2, position: 1 });
    expect(isBlockEnd(50)).toBe(true);
    expect(isBlockEnd(0)).toBe(false);
    expect(isBlockEnd(51)).toBe(false);
  });

  it('suggests stopping below 30 % known', () => {
    expect(suggestStop(14)).toBe(true);
    expect(suggestStop(15)).toBe(false);
  });

  it('labels gender without articles', () => {
    expect(genderLabel('f')).toBe('f');
    expect(genderLabel('mf')).toBe('m/f');
    expect(genderLabel(undefined)).toBe('');
  });
});
