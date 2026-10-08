/** Module P: validates the curated phrase list (SPEC §3 P) before it is published. */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CATEGORY_PREFIX,
  PHRASE_CATEGORIES,
  REGIONS,
  type PhraseFile,
} from '../../src/modules/phrases/types.ts';
import { regionalForm, words, type FilterLexicon } from '../sentences/filter.ts';

export const PHRASES_FILE = join(
  import.meta.dirname,
  '..',
  '..',
  'data',
  'curated',
  'phrases.json',
);

/**
 * Offline stand-in for the Wiktionary sets: frequent vosotros and voseo forms. Online, the
 * pipeline checks against the full sets as well.
 */
export const FALLBACK_LEXICON: FilterLexicon = {
  vosotros: new Set(['sois', 'vais', 'dais', 'veis', 'id', 'decís', 'venís', 'salís', 'oís']),
  voseo: new Set([
    'sos',
    'tenés',
    'querés',
    'podés',
    'sabés',
    'andás',
    'mirá',
    'vení',
    'decí',
    'tomá',
    'escuchá',
    'fijate',
  ]),
};

/** Endings that only occur in vosotros forms (habláis, coméis, estéis). */
const VOSOTROS_ENDING = /(áis|éis)$/;

export function validatePhrases(file: PhraseFile, lex: FilterLexicon): string[] {
  const errors: string[] = [];
  if (file.version !== 1) errors.push('version must be 1');
  const ids = new Set<string>();
  const texts = new Set<string>();
  for (const p of file.phrases) {
    const at = p.id ?? '(no id)';
    if (ids.has(p.id)) errors.push(`${at}: duplicate id`);
    ids.add(p.id);
    if (!PHRASE_CATEGORIES.includes(p.cat)) errors.push(`${at}: unknown category ${p.cat}`);
    else if (!new RegExp(`^${CATEGORY_PREFIX[p.cat]}-\\d{3}$`).test(p.id)) {
      errors.push(`${at}: id must be ${CATEGORY_PREFIX[p.cat]}-NNN`);
    }
    if (!REGIONS.includes(p.region)) errors.push(`${at}: unknown region ${p.region}`);
    if (!p.es?.trim() || !p.de?.trim()) errors.push(`${at}: es and de required`);
    if (p.alt && (!p.alt.length || p.alt.some((a) => !a.trim()))) errors.push(`${at}: empty alt`);
    if (p.note !== undefined && !p.note.trim()) errors.push(`${at}: empty note`);
    for (const es of [p.es, ...(p.alt ?? [])]) {
      // "¿Bueno?" (telephone) and "Bueno." are different phrases: keep ? and !
      const key = es
        .toLowerCase()
        .replace(/[¡¿.,…:;]/g, '')
        .trim();
      if (texts.has(key)) errors.push(`${at}: duplicate text "${es}"`);
      texts.add(key);
      const form = regionalForm(es, lex);
      if (form) errors.push(`${at}: ${form} in "${es}"`);
      else if (words(es).some((w) => VOSOTROS_ENDING.test(w.toLowerCase()))) {
        errors.push(`${at}: vosotros in "${es}"`);
      }
    }
  }
  return errors;
}

export async function loadPhrases(): Promise<PhraseFile> {
  return JSON.parse(await readFile(PHRASES_FILE, 'utf8')) as PhraseFile;
}

/** Union of the Wiktionary sets and the fallback forms. */
export function mergeLexicon(a: FilterLexicon, b: FilterLexicon): FilterLexicon {
  return {
    vosotros: new Set([...a.vosotros, ...b.vosotros]),
    voseo: new Set([...a.voseo, ...b.voseo]),
  };
}
