import type { ModeCard, Mood } from './types.ts';

export interface Segment {
  text: string;
  kind: 'plain' | 'trigger' | 'gap';
}

/** Sentence split into plain text, trigger and gap (for highlighting). */
export function segments(card: ModeCard): Segment[] {
  const [ts, te] = card.trigger;
  const [gs, ge] = card.gap;
  const parts: Segment[] = [
    { text: card.es.slice(0, ts), kind: 'plain' },
    { text: card.es.slice(ts, te), kind: 'trigger' },
    { text: card.es.slice(te, gs), kind: 'plain' },
    { text: card.es.slice(gs, ge), kind: 'gap' },
    { text: card.es.slice(ge), kind: 'plain' },
  ];
  return parts.filter((p) => p.text);
}

export const answerOf = (card: ModeCard) => card.es.slice(card.gap[0], card.gap[1]);

export const MOOD_LABEL: Record<Mood, string> = { ind: 'Indikativ', subj: 'Subjuntivo' };
