import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/** Parse .env.local without pulling in dotenv. Next loads it for the server,
 *  but Vitest and Playwright runners don't see it by default. */
export function loadDotenv(): Record<string, string> {
  const file = resolve(process.cwd(), ".env.local");
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

export function getSupabaseEnv(): { url: string; key: string; configured: boolean } {
  const env = { ...loadDotenv(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, key, configured: Boolean(url && key) };
}
