import type { ModuleId } from '../registry.ts';

/** Module of a card from its stable ID prefix (SPEC §4); conjugation IDs have no prefix. */
export function moduleOf(cardId: string): ModuleId {
  const prefix = /^([msvp]):/.exec(cardId)?.[1];
  return prefix ? (prefix.toUpperCase() as ModuleId) : 'K';
}

/**
 * Mixed mode (SPEC §4): candidates of several modules in new-card order, interleaved round-robin
 * so new cards alternate between modules. Each list keeps its own order.
 */
export function mixCandidates(lists: readonly (readonly string[])[]): string[] {
  const out: string[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) for (const l of lists) if (i < l.length) out.push(l[i]!);
  return out;
}
