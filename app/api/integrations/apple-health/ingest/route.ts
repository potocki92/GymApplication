import { NextResponse, type NextRequest } from "next/server";

import { normalizeIngestPayload } from "@/lib/apple-health/payload";
import { getServerSupabaseClient } from "@/lib/supabase/server";
import { toIngestRows } from "@/lib/supabase-apple-health";

/**
 * Publiczny endpoint przyjmujący dane Apple Health z iOS Skrótu.
 *
 * Skrót nie nosi sesji-cookie, więc autoryzujemy per-user tokenem z nagłówka
 * `Authorization: Bearer <token>` (lub pola `token` w body). Zapis wykonuje funkcja
 * Postgres `ingest_apple_health` (SECURITY DEFINER), która rozwiązuje użytkownika
 * z tokenu i omija RLS. Sam token nie jest tu walidowany — robi to baza.
 */
export async function POST(request: NextRequest) {
  const supabase = await getServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const token = extractToken(request, body);
  if (!token) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  const samples = normalizeIngestPayload(body);

  const { data, error } = await supabase.rpc("ingest_apple_health", {
    p_token: token,
    p_samples: toIngestRows(samples),
  });

  if (error) {
    // SQLSTATE 28000 = nieprawidłowy/niepołączony token.
    if (error.code === "28000") {
      return NextResponse.json({ error: "invalid_token" }, { status: 401 });
    }
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }

  const result = (data ?? { ingested: 0, status: "success" }) as {
    ingested: number;
    status: string;
  };

  return NextResponse.json({
    ingested: result.ingested,
    status: result.status,
  });
}

function extractToken(request: NextRequest, body: unknown): string | null {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) return match[1].trim();
  }
  if (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { token?: unknown }).token === "string"
  ) {
    const token = (body as { token: string }).token.trim();
    if (token) return token;
  }
  return null;
}
