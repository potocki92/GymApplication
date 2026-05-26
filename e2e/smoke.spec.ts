import { expect, test } from "@playwright/test";

/**
 * Smoke test that every public route renders without unhandled errors.
 *
 * Runs in "fallback mode" (no NEXT_PUBLIC_SUPABASE_* env), so the proxy is a
 * no-op and auth pages just inform the user that Supabase is not configured.
 * Both auth and (app) routes should respond 200 and not crash the client.
 */
const PUBLIC_ROUTES = [
  { path: "/", expect: "FitFlow" },
  { path: "/plan", expect: "Plan treningowy" },
  { path: "/exercises", expect: "Biblioteka ćwiczeń" },
  { path: "/progress", expect: "Postępy ciała" },
  { path: "/workout/active", expect: "" },
  { path: "/settings", expect: "Ustawienia" },
  { path: "/login", expect: "Zaloguj się" },
  { path: "/signup", expect: "Załóż konto" },
];

for (const route of PUBLIC_ROUTES) {
  test(`route ${route.path} renders without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const response = await page.goto(route.path);
    expect(response, `no response for ${route.path}`).not.toBeNull();
    expect(response!.status(), `non-200 for ${route.path}`).toBeLessThan(400);

    if (route.expect) {
      await expect(page.getByText(route.expect).first()).toBeVisible();
    }

    expect(
      errors,
      `unhandled errors on ${route.path}:\n${errors.join("\n")}`,
    ).toEqual([]);
  });
}

test("dashboard renders the weekly plan seed in fallback mode", async ({ page }) => {
  await page.goto("/plan");
  // Seed `WEEKLY_PLAN` lists at least one Push workout — confirm it actually
  // hydrated into the DOM (catches a broken store import).
  await expect(page.getByText(/Push.*Klatka/).first()).toBeVisible();
});

test("login page tells the user Supabase isn't configured", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/Supabase is not configured/)).toBeVisible();
});
