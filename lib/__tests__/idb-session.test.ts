import { beforeEach, describe, expect, it } from "vitest";

import { clearSession } from "@/lib/idb-session";

describe("clearSession", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not clear another tab session when ids differ", async () => {
    window.localStorage.setItem("fitflow.activeSessionId", "session-new");

    await clearSession("session-old");

    expect(window.localStorage.getItem("fitflow.activeSessionId")).toBe(
      "session-new",
    );
  });

  it("clears localStorage flag when ids match", async () => {
    window.localStorage.setItem("fitflow.activeSessionId", "session-current");

    await clearSession("session-current");

    expect(window.localStorage.getItem("fitflow.activeSessionId")).toBeNull();
  });
});
