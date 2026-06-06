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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pick(obj: Record<string, unknown>, candidates: readonly string[]): unknown {
  const norm = (s: string) => s.toLowerCase().replace(/[\s_]/g, "");
  const index = new Map<string, unknown>();
  for (const [k, v] of Object.entries(obj)) index.set(norm(k), v);
  for (const c of candidates) {
    const hit = index.get(norm(c));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const match = value.replace(/\s/g, "").match(/-?\d+(?:[.,]\d+)?/);
    if (match) {
      const n = Number(match[0].replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
}

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const native = new Date(trimmed);
  if (!Number.isNaN(native.getTime())) return native.toISOString();

  const m = trimmed.match(
    /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/,
  );
  if (m) {
    const [, dd, mm, yyyy, hh = "0", min = "0"] = m;
    const d = new Date(
      Number(yyyy),
      Number(mm) - 1,
      Number(dd),
      Number(hh),
      Number(min),
    );
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function resolveMetric(raw: unknown, unit: string | undefined): AppleHealthMetric | null {
  if (typeof raw === "string") {
    if (METRIC_SET.has(raw)) return raw as AppleHealthMetric;
    const k = raw.toLowerCase().replace(/[\s_]/g, "");
    if (k.includes("step") || k.includes("krok")) return "steps";
    if (k.includes("activeenergy") || k.includes("activecalor")) return "active_energy_kcal";
    if (k.includes("restingheart")) return "resting_heart_rate";
    if (k.includes("heartrate") || k.includes("tętno")) return "avg_heart_rate";
    return null;
  }

  const u = (unit ?? "").toLowerCase();
  if (u === "count" || u.includes("step") || u.includes("krok")) return "steps";
  if (u.includes("kcal") || u.includes("cal")) return "active_energy_kcal";

  if (raw === undefined || raw === null) return "steps";
  return null;
}

function normalizeSample(entry: unknown): AppleHealthSampleInput | null {
  if (!isRecord(entry)) return null;

  const unit = toOptionalString(pick(entry, ["unit", "Unit", "Jednostka"]));

  const metric = resolveMetric(
    pick(entry, ["metric", "type", "sampleType", "Sample Type", "Typ próbki", "Typ"]),
    unit,
  );
  if (!metric) return null;

  const value = toFiniteNumber(
    pick(entry, ["value", "Value", "Wartość", "quantity", "Quantity"]),
  );
  if (value === null) return null;

  if (HR_METRICS.has(metric)) {
    if (value < HR_MIN_BPM || value > HR_MAX_BPM) return null;
  } else if (value < 0) {
    return null;
  }

  const startTime = toIsoTimestamp(
    pick(entry, [
      "start",
      "startTime",
      "start_time",
      "startDate",
      "Start Date",
      "Data początkowa",
      "date",
      "Date",
      "Data",
    ]),
  );
  if (startTime === null) return null;

  const endTime = toIsoTimestamp(
    pick(entry, ["end", "endTime", "end_time", "endDate", "End Date", "Data końcowa"]),
  );

  return {
    metric,
    value,
    unit: unit ?? DEFAULT_UNIT[metric],
    startTime,
    endTime,
    source: toOptionalString(pick(entry, ["source", "Source", "Źródło"])) ?? "apple_health",
  };
}

function extractSamples(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.samples)) return raw.samples;
  return [];
}

export function normalizeIngestPayload(raw: unknown): AppleHealthSampleInput[] {
  const out: AppleHealthSampleInput[] = [];
  for (const entry of extractSamples(raw)) {
    const sample = normalizeSample(entry);
    if (sample) out.push(sample);
  }
  return out;
}
