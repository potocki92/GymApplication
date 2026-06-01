/** Polish plural forms: one (1), few (2–4), many (0, 5+ and the teens). */
export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

/**
 * Pick the correct Polish plural form for a count. Mirrors the standard PL
 * pluralization rule (e.g. 1 ćwiczenie, 2 ćwiczenia, 5 ćwiczeń).
 */
export function pluralPl(n: number, forms: PluralForms): string {
  const abs = Math.abs(n);
  if (abs === 1) return forms.one;
  const last = abs % 10;
  const last2 = abs % 100;
  if (last >= 2 && last <= 4 && (last2 < 12 || last2 > 14)) return forms.few;
  return forms.many;
}
