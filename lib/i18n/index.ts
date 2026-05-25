import { pl, type Dictionary } from "./pl";

export type Locale = "pl";

export const defaultLocale: Locale = "pl";

export const dictionaries: Record<Locale, Dictionary> = { pl };

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
