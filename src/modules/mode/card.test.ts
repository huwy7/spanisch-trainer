import { describe, expect, it } from 'vitest';
import { answerOf, segments } from './card.ts';
import type { ModeCard } from './types.ts';

const card: ModeCard = {
  id: 'm:c:x',
  es: 'Quiero que vengas mañana.',
  trigger: [0, 10],
  gap: [11, 17],
  inf: 'venir',
  alternatives: [],
  mood: 'subj',
  category: 'wunsch',
  explanation: 'wunsch:subj',
  de: 'Ich will, dass du morgen kommst.',
};

describe('mode card', () => {
  it('splits the sentence into trigger, gap and plain text', () => {
    expect(segments(card)).toEqual([
      { text: 'Quiero que', kind: 'trigger' },
      { text: ' ', kind: 'plain' },
      { text: 'vengas', kind: 'gap' },
      { text: ' mañana.', kind: 'plain' },
    ]);
    expect(answerOf(card)).toBe('vengas');
  });
});
