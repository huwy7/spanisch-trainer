import { describe, expect, it } from 'vitest';
import { chunkFile } from './sentences.ts';

describe('chunkFile', () => {
  it('finds the hashed chunk of a level in the manifest', () => {
    const m = {
      chunks: {
        'verbs.json': 'x',
        'sentences-A2.abc123.json': 'y',
        'sentences-B1.def456.json': 'z',
      },
    };
    expect(chunkFile(m, 'A2')).toBe('sentences-A2.abc123.json');
    expect(chunkFile(m, 'B2')).toBeUndefined();
  });
});
