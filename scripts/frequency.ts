/**
 * Lemma frequencies from a word-form frequency list (FrequencyWords).
 * Ambiguous forms count for each candidate lemma in equal parts; a form that is
 * itself a lemma counts only for that lemma (como → como, not comer).
 */
export function lemmaFrequencies(
  rows: Iterable<{ form: string; count: number }>,
  isLemma: (word: string) => boolean,
  lemmasOf: (form: string) => readonly string[],
): Map<string, number> {
  const freq = new Map<string, number>();
  for (const { form, count } of rows) {
    const lemmas = isLemma(form) ? [form] : lemmasOf(form).filter(isLemma);
    for (const l of lemmas) freq.set(l, (freq.get(l) ?? 0) + count / lemmas.length);
  }
  return freq;
}

export function parseFrequencyLine(line: string): { form: string; count: number } | null {
  const [form, count] = line.trim().split(' ');
  return form && count ? { form: form.toLowerCase(), count: Number(count) } : null;
}
