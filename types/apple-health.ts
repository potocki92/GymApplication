/**
 * Apple Health integration types (Etap 1: ingest przez iOS Skróty).
 *
 * Dane Apple Health trafiają do aplikacji przez Skrót, który robi POST na
 * `/api/integrations/apple-health/ingest` z nagłówkiem `Authorization: Bearer <token>`.
 * Token per-user jest sekretem trzymanym po stronie serwera (kolumna
 * `user_integrations.access_token`) i zwracanym wyłącznie zalogowanemu właścicielowi.
 *
 * Docelowo zastąpimy to natywną integracją HealthKit / agregatorem (Terra/Vital);
 * kontrakt danych (`AppleHealthSample`) pozostanie ten sam.
 */

import type { IntegrationStatus } from "./garmin";

/** Metryki obsługiwane w MVP. */
export type AppleHealthMetric =
  | "steps"
  | "active_energy_kcal"
  | "resting_heart_rate"
  | "avg_heart_rate";

export const APPLE_HEALTH_METRICS: readonly AppleHealthMetric[] = [
  "steps",
  "active_energy_kcal",
  "resting_heart_rate",
  "avg_heart_rate",
] as const;

export type AppleHealthIngestStatus = "success" | "partial" | "error";

/** Pojedyncza próbka znormalizowana po stronie serwera. */
export interface AppleHealthSample {
  id: string;
  metric: AppleHealthMetric;
  value: number;
  unit: string | null;
  startTime: string;
  endTime: string | null;
  source: string;
}

/** Próbka przed zapisem (bez `id` — nadaje je baza). */
export type AppleHealthSampleInput = Omit<AppleHealthSample, "id">;

/** Wpis audytu pojedynczego ingestu ze Skrótu. */
export interface AppleHealthIngestLog {
  id: string;
  receivedAt: string;
  status: AppleHealthIngestStatus;
  samplesIngested: number;
  errorMessage: string | null;
}

/**
 * Bezpieczna projekcja integracji dla właściciela. Zawiera `token`, bo karta w UI
 * musi pozwolić go skopiować do Skrótu. Trafia wyłącznie do zalogowanego właściciela
 * (RLS + uwierzytelniony status route).
 */
export interface AppleHealthIntegration {
  id: string;
  status: IntegrationStatus;
  token: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
}

/** Wynik zwracany z `/api/integrations/apple-health/ingest`. */
export interface AppleHealthIngestResult {
  ingested: number;
  status: AppleHealthIngestStatus;
}
