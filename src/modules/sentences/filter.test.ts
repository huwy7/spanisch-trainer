import { describe, expect, it } from 'vitest';
import { selectRows, sentenceCardId } from './filter.ts';
import { tenseMask, type SentenceChunk } from './types.ts';

const chunk = (level: 'A2' | 'B1' | 'B2', rows: SentenceChunk['rows']): SentenceChunk => ({
  version: 1,
  level,
  rows,
});
const chunks = {
  A2: chunk('A2', [
    [1, 'Tengo frío.', 'Mir ist kalt.', tenseMask(['pres'])],
    [2, 'Ayer comí.', 'Gestern ass ich.', tenseMask(['indef'])],
  ]),
  B1: chunk('B1', [[3, 'Quiero que vengas.', 'Komm bitte.', tenseMask(['pres', 'subj_pres'])]]),
};

describe('sentence selection', () => {
  it('keeps level order and filters by levels', () => {
    expect(selectRows(chunks, ['B1', 'A2'], []).map((r) => r[0])).toEqual([1, 2, 3]);
    expect(selectRows(chunks, ['B1'], []).map((r) => r[0])).toEqual([3]);
  });

  it('filters by tense: at least one selected tense present', () => {
    expect(selectRows(chunks, ['A2', 'B1'], ['subj_pres']).map((r) => r[0])).toEqual([3]);
    expect(selectRows(chunks, ['A2', 'B1'], ['pres', 'indef']).map((r) => r[0])).toEqual([1, 2, 3]);
  });

  it('uses separate card IDs per direction', () => {
    expect(sentenceCardId(42, 'de-es')).toBe('s:42');
    expect(sentenceCardId(42, 'es-de')).toBe('s:r:42');
  });
});
