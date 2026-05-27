/**
 * Sync orchestrator — composes the OAuth/API client + Supabase adapter.
 *
 * Lives outside the route handler so it can be exercised in tests and reused
 * by future schedulers/webhooks. Returns a structured result that the route
 * serialises directly to the client.
 */

import {
  ensureFreshToken,
  getActivityHrSamples,
  listActivities,
  type GarminActivityDto,
} from "./api-client";
import { buildMockActivities, buildMockHrSamples } from "./mock-client";
import { shouldUseMockGarmin } from "./config";
import { computeHrZones } from "./zones";
import {
  finaliseGarminSyncLog,
  insertGarminSyncLog,
  upsertGarminActivities,
  upsertGarminHrSamples,
  upsertGarminIntegration,
} from "@/lib/supabase-garmin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GarminHeartRateSample,
  GarminSyncResult,
  UserIntegrationWithTokens,
} from "@/types/garmin";

/** Default backfill window when there's no prior sync. */
const DEFAULT_BACKFILL_DAYS = 30;
/** Garmin's history API caps each request — chunk longer windows. */
const MAX_WINDOW_DAYS = 30;

export async function runGarminSync(args: {
  supabase: SupabaseClient;
  userId: string;
  integration: UserIntegrationWithTokens;
}): Promise<GarminSyncResult> {
  const { supabase, userId, integration } = args;
  const logId = await insertGarminSyncLog(supabase, userId, "manual");

  try {
    const now = new Date();
    const from = integration.lastSyncAt
      ? new Date(integration.lastSyncAt)
      : new Date(now.getTime() - DEFAULT_BACKFILL_DAYS * 86_400_000);

    const { activities, samples } = await collectGarminData({
      supabase,
      userId,
      integration,
      from,
      to: now,
    });

    const activitiesSynced = await upsertGarminActivities(
      supabase,
      userId,
      activities,
    );
    const samplesSynced = await upsertGarminHrSamples(supabase, userId, samples);

    const lastSyncAt = now.toISOString();
    await upsertGarminIntegration(supabase, userId, {
      status: "connected",
      lastSyncAt,
      lastError: null,
    });

    await finaliseGarminSyncLog(supabase, logId, {
      status: "success",
      activitiesSynced,
      samplesSynced,
    });

    return {
      activitiesSynced,
      samplesSynced,
      lastSyncAt,
      status: "success",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    await upsertGarminIntegration(supabase, userId, {
      status: message === "garmin_unauthorized" ? "expired" : "error",
      lastError: message,
    }).catch(() => undefined);
    await finaliseGarminSyncLog(supabase, logId, {
      status: "error",
      activitiesSynced: 0,
      samplesSynced: 0,
      errorMessage: message,
    }).catch(() => undefined);
    throw err;
  }
}

async function collectGarminData(args: {
  supabase: SupabaseClient;
  userId: string;
  integration: UserIntegrationWithTokens;
  from: Date;
  to: Date;
}): Promise<{
  activities: (GarminActivityDto & { hrZones: ReturnType<typeof computeHrZones> | null })[];
  samples: GarminHeartRateSample[];
}> {
  if (shouldUseMockGarmin()) {
    const activities = buildMockActivities(args.to);
    const samples: GarminHeartRateSample[] = [];
    const enriched = activities.map((a) => {
      const activitySamples = buildMockHrSamples(a);
      samples.push(...activitySamples);
      return { ...a, hrZones: computeHrZones(activitySamples) };
    });
    return { activities: enriched, samples };
  }

  const { integration, supabase, userId } = args;
  if (!integration.accessToken || !integration.refreshToken || !integration.tokenExpiresAt) {
    throw new Error("garmin_unauthorized");
  }

  const { tokens, rotated } = await ensureFreshToken({
    accessToken: integration.accessToken,
    refreshToken: integration.refreshToken,
    expiresAt: integration.tokenExpiresAt,
  });

  if (rotated) {
    await upsertGarminIntegration(supabase, userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenExpiresAt: tokens.expiresAt,
      scope: tokens.scope ?? null,
    });
  }

  const windows = splitWindow(args.from, args.to, MAX_WINDOW_DAYS);
  const allActivities: GarminActivityDto[] = [];
  for (const window of windows) {
    const batch = await listActivities({
      accessToken: tokens.accessToken,
      from: window.from,
      to: window.to,
    });
    allActivities.push(...batch);
  }

  const samples: GarminHeartRateSample[] = [];
  const enriched: (GarminActivityDto & { hrZones: ReturnType<typeof computeHrZones> | null })[] = [];

  for (const activity of allActivities) {
    let hrZones: ReturnType<typeof computeHrZones> | null = null;
    try {
      const activitySamples = await getActivityHrSamples({
        accessToken: tokens.accessToken,
        garminActivityId: activity.garminActivityId,
      });
      samples.push(...activitySamples);
      hrZones = computeHrZones(activitySamples);
    } catch {
      // HR detail fetch can fail per-activity (privacy, missing strap). Activity
      // header still gets persisted with hrZones = null.
    }
    enriched.push({ ...activity, hrZones });
  }

  return { activities: enriched, samples };
}

function splitWindow(from: Date, to: Date, maxDays: number): { from: Date; to: Date }[] {
  const windows: { from: Date; to: Date }[] = [];
  const stepMs = maxDays * 86_400_000;
  let cursor = from.getTime();
  const endMs = to.getTime();
  while (cursor < endMs) {
    const next = Math.min(cursor + stepMs, endMs);
    windows.push({ from: new Date(cursor), to: new Date(next) });
    cursor = next;
  }
  return windows;
}
