import { randomBytes } from "node:crypto";

/**
 * Generuje sekretny token ingestu per-user wklejany do akcji „Pobierz zawartość
 * adresu URL" w iOS Skrótach (nagłówek `Authorization: Bearer <token>`).
 *
 * 32 losowe bajty → base64url (~43 znaki). Prefiks `ahk_` ułatwia rozpoznanie
 * tokenu w logach i schowku.
 */
export function generateIngestToken(): string {
  return `ahk_${randomBytes(32).toString("base64url")}`;
}
