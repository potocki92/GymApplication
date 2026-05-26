import { expect, test } from "@playwright/test";

import { getSupabaseEnv } from "../tests/helpers/env";

const env = getSupabaseEnv();

// When Supabase isn't configured the app runs in local-only mode — no signup,
// no DB persistence — so there's nothing to verify here.
test.skip(!env.configured, "Supabase not configured");

function uniqueEmail(): string {
  return `e2e-ui-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

const PASSWORD = "Pa55w0rd-e2e-ui";

async function signUpFreshUser(page: import("@playwright/test").Page): Promise<string> {
  const email = uniqueEmail();
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Hasło").fill(PASSWORD);
  await page.getByRole("button", { name: "Zarejestruj" }).click();
  // Middleware bounces a signed-in user away from /signup; landing on "/" is
  // the strongest signal that the session cookie was set.
  await page.waitForURL("/", { timeout: 15_000 });
  return email;
}

test("workout created in UI is visible on /plan after reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await signUpFreshUser(page);

  await page.goto("/plan/new?day=tuesday");
  await page.getByLabel("Nazwa treningu").fill("E2E UI Push");

  // Picker shows ~20 exercises with a "Dodaj do treningu" icon button next to
  // each. Click the first available one.
  await page
    .getByRole("button", { name: "Dodaj do treningu" })
    .first()
    .click();

  // Form has two "Zapisz trening" buttons (desktop sticky + mobile bottom).
  // Click whichever is visible in the current viewport.
  await page
    .getByRole("button", { name: "Zapisz trening" })
    .first()
    .click();

  await page.waitForURL("/plan", { timeout: 10_000 });

  // The new workout name must show up on the Tuesday card.
  await expect(page.getByText("E2E UI Push").first()).toBeVisible({
    timeout: 10_000,
  });

  // Hard reload: this is the real persistence test. After a full page reload
  // the client re-fetches from Supabase, so the workout must still be there.
  await page.reload();
  await expect(page.getByText("E2E UI Push").first()).toBeVisible({
    timeout: 15_000,
  });

  expect(errors, `unhandled errors:\n${errors.join("\n")}`).toEqual([]);
});
