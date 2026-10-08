import { describe, expect, it } from 'vitest';
import { rejectSentence, words } from './filter.ts';

const lex = {
  vosotros: new Set(['tenéis', 'apagad', 'manaos', 'habéis']),
  voseo: new Set(['tenés', 'sos', 'tomás']),
};

describe('sentence filter', () => {
  it('keeps normal sentences', () => {
    expect(rejectSentence('Yo tengo un perro grande.', lex)).toBeNull();
  });

  it('rejects by length (3–20 words)', () => {
    expect(rejectSentence('¡Hola, Tom!', lex)).toBe('length');
    expect(rejectSentence(Array(21).fill('palabra').join(' '), lex)).toBe('length');
  });

  it('rejects vosotros forms and pronouns', () => {
    expect(rejectSentence('¿Vosotros tenéis hambre?', lex)).toBe('vosotros');
    expect(rejectSentence('Apagad la televisión ahora.', lex)).toBe('vosotros');
    expect(rejectSentence('Os llamo cuando oiga algo.', lex)).toBe('vosotros');
    expect(rejectSentence('Es vuestro coche, ¿no?', lex)).toBe('vosotros');
  });

  it('rejects voseo', () => {
    expect(rejectSentence('Vos tenés razón.', lex)).toBe('voseo');
    expect(rejectSentence('Sos muy escéptico.', lex)).toBe('voseo');
  });

  it('does not mistake names for verb forms', () => {
    expect(rejectSentence('Thomas está estudiando en Manaos.', lex)).toBeNull();
    expect(rejectSentence('Mi amigo Tomás no es tan alto.', lex)).toBeNull();
  });

  it('splits words keeping original case', () => {
    expect(words('¿Tú, Tomás?')).toEqual(['Tú', 'Tomás']);
  });
});
