/**
 * Garmin Connect integration types.
 *
 * The official OAuth 2.0 PKCE flow yields access/refresh tokens that we keep
 * server-side. The browser only ever sees the safe projection (status,
 * lastSyncAt, externalUserId) — never the tokens themselves.
 */

export type IntegrationProvider =
  | "garmin"
  | "polar"
  | "strava"
  | "wahoo"
  | "apple_health";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "expired";

export type GarminSyncStatus =
  | "success"
  | "partial"
  | "error"
  | "in_progress";

export type GarminSyncTrigger = "manual" | "scheduled" | "webhook";

/** Browser-safe projection (tokens stripped before leaving the server). */
export interface UserIntegration {
  id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  externalUserId: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

/** Server-only view that includes secrets — never serialised to the client. */
export interface UserIntegrationWithTokens extends UserIntegration {
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scope: string | null;
}

export interface HrZoneBreakdown {
  z1Seconds: number;
  z2Seconds: number;
  z3Seconds: number;
  z4Seconds: number;
  z5Seconds: number;
}

export interface GarminActivity {
  id: string;
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
  hrZones: HrZoneBreakdown | null;
}

export interface GarminSyncLog {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: GarminSyncStatus;
  activitiesSynced: number;
  samplesSynced: number;
  errorMessage: string | null;
  trigger: GarminSyncTrigger;
}

export interface GarminHeartRateSample {
  garminActivityId: string;
  ts: string;
  bpm: number;
}

/** Result returned from `/api/integrations/garmin/sync`. */
export interface GarminSyncResult {
  activitiesSynced: number;
  samplesSynced: number;
  lastSyncAt: string;
  status: GarminSyncStatus;
}
