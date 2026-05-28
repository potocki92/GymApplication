/**
 * Garmin OAuth 2.0 PKCE helpers + token exchange.
 *
 * Why PKCE: Garmin's Health API requires it for confidential clients on
 * server-side redirect flows. We never embed `client_secret` in the browser;
 * all token endpoint calls happen in route handlers.
 */

import {
  GARMIN_AUTHORIZE_URL,
  GARMIN_CLIENT_ID,
  GARMIN_CLIENT_SECRET,
  GARMIN_DEFAULT_SCOPE,
  GARMIN_REDIRECT_URI,
  GARMIN_TOKEN_URL,
} from "./config";

export interface GarminOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string | null;
}

/**
 * RFC 7636 §4.1: 43-128 chars from the unreserved set. We pick 64 bytes from
 * the Web Crypto RNG and base64url-encode them, which yields ~86 chars.
 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

/** RFC 7636 §4.2: code_challenge = BASE64URL(SHA256(code_verifier)). */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function generateState(): string {
  return crypto.randomUUID();
}

export function buildAuthorizeUrl(params: {
  state: string;
  codeChallenge: string;
  scope?: string;
}): string {
  const url = new URL(GARMIN_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", GARMIN_CLIENT_ID);
  url.searchParams.set("redirect_uri", GARMIN_REDIRECT_URI);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", params.state);
  url.searchParams.set("scope", params.scope ?? GARMIN_DEFAULT_SCOPE);
  return url.toString();
}

export async function exchangeCodeForToken(args: {
  code: string;
  codeVerifier: string;
}): Promise<GarminOAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: args.code,
    code_verifier: args.codeVerifier,
    client_id: GARMIN_CLIENT_ID,
    client_secret: GARMIN_CLIENT_SECRET,
    redirect_uri: GARMIN_REDIRECT_URI,
  });

  return postToken(body);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GarminOAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: GARMIN_CLIENT_ID,
    client_secret: GARMIN_CLIENT_SECRET,
  });

  return postToken(body);
}

async function postToken(body: URLSearchParams): Promise<GarminOAuthTokens> {
  const res = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`garmin_token_exchange_failed:${res.status}:${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  };

  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt,
    scope: json.scope ?? null,
  };
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
