/**
 * Thin typed wrapper around the Garmin Health API endpoints we use during a
 * historical sync. All functions return DTOs in the shape we want to persist —
 * mapping happens at the boundary so the Supabase adapter doesn't need to know
 * about Garmin's response envelopes.
 */

import { GARMIN_API_BASE } from "./config";
import {
  refreshAccessToken,
  type GarminOAuthTokens,
} from "./oauth-client";
import type { GarminActivity, GarminHeartRateSample } from "@/types/garmin";

export interface GarminActivityDto {
  garminActivityId: string;
  activityType: string;
  startTime: string;
  durationSeconds: number;
  distanceMeters: number | null;
  calories: number | null;
  avgHeartRateBpm: number | null;
  maxHeartRateBpm: number | null;
  avgSpeedMps: number | null;
  elevationGainM: number | null;
  raw: unknown;
}

export interface GarminActivityDetails {
  activity: GarminActivityDto;
  samples: GarminHeartRateSample[];
}

export interface GarminAuthState {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

/**
 * Refreshes the access token if it expires within the next 60s. Returns the
 * (possibly new) token set — caller should persist if the refresh token rotated.
 */
export async function ensureFreshToken(
  state: GarminAuthState,
): Promise<{ tokens: GarminOAuthTokens; rotated: boolean }> {
  const expiresAtMs = new Date(state.expiresAt).getTime();
  const isExpiringSoon = expiresAtMs - Date.now() < 60_000;

  if (!isExpiringSoon) {
    return {
      tokens: {
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        scope: null,
      },
      rotated: false,
    };
  }

  const tokens = await refreshAccessToken(state.refreshToken);
  return { tokens, rotated: true };
}

export async function getUserId(accessToken: string): Promise<string> {
  const res = await garminFetch(
    `${GARMIN_API_BASE}/wellness-api/rest/user/id`,
    accessToken,
  );
  const json = (await res.json()) as { userId: string };
  return json.userId;
}

export async function listActivities(args: {
  accessToken: string;
  from: Date;
  to: Date;
}): Promise<GarminActivityDto[]> {
  const url = new URL(`${GARMIN_API_BASE}/activity-api/rest/activities`);
  url.searchParams.set("uploadStartTimeInSeconds", String(Math.floor(args.from.getTime() / 1000)));
  url.searchParams.set("uploadEndTimeInSeconds", String(Math.floor(args.to.getTime() / 1000)));

  const res = await garminFetch(url.toString(), args.accessToken);
  const json = (await res.json()) as GarminRawActivity[];
  return json.map(mapRawActivity);
}

export async function getActivityHrSamples(args: {
  accessToken: string;
  garminActivityId: string;
}): Promise<GarminHeartRateSample[]> {
  const url = `${GARMIN_API_BASE}/activity-api/rest/activity/${args.garminActivityId}/details`;
  const res = await garminFetch(url, args.accessToken);
  const json = (await res.json()) as { samples?: Array<{ timestamp: string; heartRate?: number }> };

  return (json.samples ?? [])
    .filter((s): s is { timestamp: string; heartRate: number } =>
      typeof s.heartRate === "number" && s.heartRate >= 20 && s.heartRate <= 250,
    )
    .map((s) => ({
      garminActivityId: args.garminActivityId,
      ts: s.timestamp,
      bpm: s.heartRate,
    }));
}

async function garminFetch(url: string, accessToken: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (res.status === 401) {
    throw new Error("garmin_unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`garmin_api_failed:${res.status}:${text.slice(0, 200)}`);
  }
  return res;
}

interface GarminRawActivity {
  activityId: number | string;
  activityType?: { typeKey?: string } | string;
  startTimeInSeconds?: number;
  startTimeLocal?: string;
  durationInSeconds?: number;
  distanceInMeters?: number;
  activeKilocalories?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageSpeedInMetersPerSecond?: number;
  totalElevationGainInMeters?: number;
}

function mapRawActivity(raw: GarminRawActivity): GarminActivityDto {
  const typeKey =
    typeof raw.activityType === "string"
      ? raw.activityType
      : raw.activityType?.typeKey ?? "unknown";

  const startTime = raw.startTimeInSeconds
    ? new Date(raw.startTimeInSeconds * 1000).toISOString()
    : raw.startTimeLocal ?? new Date(0).toISOString();

  return {
    garminActivityId: String(raw.activityId),
    activityType: normaliseActivityType(typeKey),
    startTime,
    durationSeconds: Math.round(raw.durationInSeconds ?? 0),
    distanceMeters: raw.distanceInMeters ?? null,
    calories: raw.activeKilocalories ?? null,
    avgHeartRateBpm: raw.averageHeartRateInBeatsPerMinute ?? null,
    maxHeartRateBpm: raw.maxHeartRateInBeatsPerMinute ?? null,
    avgSpeedMps: raw.averageSpeedInMetersPerSecond ?? null,
    elevationGainM: raw.totalElevationGainInMeters ?? null,
    raw,
  };
}

function normaliseActivityType(raw: string): string {
  const normalized = raw.toLowerCase().replace(/_/g, "-");
  if (normalized.includes("running")) return "running";
  if (normalized.includes("cycling") || normalized.includes("biking")) return "cycling";
  if (normalized.includes("swim")) return "swimming";
  if (normalized.includes("strength") || normalized.includes("weight")) return "strength";
  if (normalized.includes("walking")) return "walking";
  if (normalized.includes("hiking")) return "hiking";
  return normalized || "other";
}

/** Re-export for callers that need the row shape but not the network calls. */
export type { GarminActivity };
