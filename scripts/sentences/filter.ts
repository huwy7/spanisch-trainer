/**
 * Sentence filter shared by all modules using Tatoeba (SPEC §2, §3 S):
 * 3–20 words, no vosotros, no voseo.
 */

export type RejectReason = 'length' | 'vosotros' | 'voseo';

export interface FilterLexicon {
  vosotros: ReadonlySet<string>;
  voseo: ReadonlySet<string>;
}

/** vosotros pronouns and possessives; `os` only exists for vosotros. */
const VOSOTROS_WORDS = new Set([
  'vosotros',
  'vosotras',
  'vuestro',
  'vuestra',
  'vuestros',
  'vuestras',
  'os',
]);

/** Words with their original spelling (for capitalisation checks). */
export function words(text: string): string[] {
  return text
    .normalize('NFC')
    .split(/[^\p{L}\p{M}]+/u)
    .filter(Boolean);
}

/** Capitalised words after the first one are names (Tomás, Manaos), not verb forms. */
const isName = (w: string, i: number) => i > 0 && /^\p{Lu}/u.test(w);

export function rejectSentence(es: string, lex: FilterLexicon): RejectReason | null {
  const ws = words(es);
  if (ws.length < 3 || ws.length > 20) return 'length';
  const lower = ws.map((w) => w.toLowerCase());
  if (lower.some((w, i) => VOSOTROS_WORDS.has(w) || (!isName(ws[i]!, i) && lex.vosotros.has(w)))) {
    return 'vosotros';
  }
  if (lower.some((w, i) => w === 'vos' || (!isName(ws[i]!, i) && lex.voseo.has(w)))) return 'voseo';
  return null;
}
