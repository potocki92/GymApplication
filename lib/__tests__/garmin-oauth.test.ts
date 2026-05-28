import { describe, expect, it } from "vitest";

import {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "@/lib/garmin/oauth-client";

describe("generateCodeVerifier", () => {
  it("returns a base64url string in the RFC 7636 length range", () => {
    const v = generateCodeVerifier();
    expect(v.length).toBeGreaterThanOrEqual(43);
    expect(v.length).toBeLessThanOrEqual(128);
    // base64url alphabet only — no padding, no +/.
    expect(v).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("is unique across invocations", () => {
    const a = generateCodeVerifier();
    const b = generateCodeVerifier();
    expect(a).not.toEqual(b);
  });
});

describe("generateCodeChallenge", () => {
  it("matches the RFC 7636 reference vector", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = await generateCodeChallenge(verifier);
    // Per RFC 7636 §B.1 the SHA256 + base64url of the verifier above is:
    expect(challenge).toEqual("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("is deterministic for the same verifier", async () => {
    const v = generateCodeVerifier();
    const a = await generateCodeChallenge(v);
    const b = await generateCodeChallenge(v);
    expect(a).toEqual(b);
  });
});

describe("generateState", () => {
  it("returns a UUID-shaped string", () => {
    const s = generateState();
    expect(s).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
