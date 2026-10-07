import { describe, expect, it } from 'vitest';
import { buildManifest, hashContent } from './manifest.ts';

describe('data manifest', () => {
  it('hashes deterministically and changes with content', () => {
    expect(hashContent('a')).toBe(hashContent('a'));
    expect(hashContent('a')).not.toBe(hashContent('b'));
    expect(hashContent('a')).toHaveLength(16);
  });

  it('lists chunks in stable sorted order', () => {
    const m = buildManifest({ 'k/b.json': '2', 'k/a.json': '1' }, new Date(0));
    expect(Object.keys(m.chunks)).toEqual(['k/a.json', 'k/b.json']);
    expect(m.generatedAt).toBe('1970-01-01T00:00:00.000Z');
  });
});
