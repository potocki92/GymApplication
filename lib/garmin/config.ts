/**
 * Garmin Connect configuration. Centralised so we never read `process.env.*`
 * from more than one place. Secrets must NOT use the `NEXT_PUBLIC_` prefix —
 * they're only ever read inside server-side route handlers.
 *
 * When secrets are absent we fall back to a deterministic mock client so the
 * full UI flow can be exercised in Vercel previews and local dev.
 */

export const GARMIN_CLIENT_ID = process.env.GARMIN_CLIENT_ID ?? "";
export const GARMIN_CLIENT_SECRET = process.env.GARMIN_CLIENT_SECRET ?? "";
export const GARMIN_REDIRECT_URI = process.env.GARMIN_REDIRECT_URI ?? "";

/** Override to force mock mode even when real secrets are present. */
const GARMIN_USE_MOCK = process.env.GARMIN_USE_MOCK === "true";

export const GARMIN_AUTHORIZE_URL =
  "https://connect.garmin.com/oauth2Confirm";
export const GARMIN_TOKEN_URL =
  "https://diauth.garmin.com/di-oauth2-service/oauth/token";
export const GARMIN_API_BASE = "https://apis.garmin.com";

export const GARMIN_DEFAULT_SCOPE = "activity_api activity_export";

export function isGarminConfigured(): boolean {
  return Boolean(GARMIN_CLIENT_ID && GARMIN_CLIENT_SECRET && GARMIN_REDIRECT_URI);
}

export function shouldUseMockGarmin(): boolean {
  return GARMIN_USE_MOCK || !isGarminConfigured();
}
