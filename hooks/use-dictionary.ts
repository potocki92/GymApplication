import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n";

/**
 * Returns the active translation dictionary. Today there is a single locale,
 * so this is a thin accessor — when a real i18n provider is added, this hook
 * is the only call site components depend on.
 */
export function useDictionary(locale?: Locale): Dictionary {
  return getDictionary(locale);
}
