import {
  APPLE_HEALTH_METRICS,
  type AppleHealthMetric,
  type AppleHealthSampleInput,
} from "@/types";

const METRIC_SET = new Set<string>(APPLE_HEALTH_METRICS);

const HR_METRICS = new Set<AppleHealthMetric>([
  "resting_heart_rate",
  "avg_heart_rate",
]);

const DEFAULT_UNIT: Record<AppleHealthMetric, string> = {
  steps: "count",
  active_energy_kcal: "kcal",
  resting_heart_rate: "bpm",
  avg_heart_rate: "bpm",
};

const HR_MIN_BPM = 20;
const HR_MAX_BPM = 250;

/** Surowy kształt wejścia ze Skrótu — celowo luźny (akceptujemy aliasy pól). */
interface RawSample {
  metric?: unknown;
  value?: unknown;
  unit?: unknown;
  start?: unknown;
  startTime?: unknown;
  start_time?: unknown;
  end?: unknown;
  endTime?: unknown;
  end_time?: unknown;
  source?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeSample(entry: unknown): AppleHealthSampleInput | null {
  if (!isRecord(entry)) return null;
  const raw = entry as RawSample;

  const metric = raw.metric;
  if (typeof metric !== "string" || !METRIC_SET.has(metric)) return null;
  const typedMetric = metric as AppleHealthMetric;

  const value = toFiniteNumber(raw.value);
  if (value === null) return null;

  // Kroki/energia nie mogą być ujemne; tętno poza fizjologicznym zakresem odrzucamy.
  if (HR_METRICS.has(typedMetric)) {
    if (value < HR_MIN_BPM || value > HR_MAX_BPM) return null;
  } else if (value < 0) {
    return null;
  }

  const startTime = toIsoTimestamp(raw.start ?? raw.startTime ?? raw.start_time);
  if (startTime === null) return null;

  const endTime = toIsoTimestamp(raw.end ?? raw.endTime ?? raw.end_time);

  return {
    metric: typedMetric,
    value,
    unit: toOptionalString(raw.unit) ?? DEFAULT_UNIT[typedMetric],
    startTime,
    endTime,
    source: toOptionalString(raw.source) ?? "apple_health",
  };
}

function extractSamples(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.samples)) return raw.samples;
  return [];
}

/**
 * Czysta walidacja/normalizacja payloadu ze Skrótu. Akceptuje `{ samples: [...] }`
 * lub gołą tablicę. Nieznane metryki, nieparsowalne wartości/daty oraz tętno poza
 * zakresem 20–250 bpm są pomijane. Zwraca próbki gotowe do zapisu w bazie.
 */
export function normalizeIngestPayload(raw: unknown): AppleHealthSampleInput[] {
  const out: AppleHealthSampleInput[] = [];
  for (const entry of extractSamples(raw)) {
    const sample = normalizeSample(entry);
    if (sample) out.push(sample);
  }
  return out;
}
