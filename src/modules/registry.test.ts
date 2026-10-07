import { describe, expect, it } from 'vitest';
import { MODULES } from './registry.ts';

describe('module registry', () => {
  it('lists every module from SPEC §3 exactly once', () => {
    expect(MODULES.map((m) => m.id).sort()).toEqual(['K', 'M', 'P', 'S', 'V']);
  });
});
