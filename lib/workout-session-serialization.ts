import type { WorkoutSessionJson } from "@/types";

export function isJsonRecord(value: WorkoutSessionJson | null | undefined): value is Record<string, WorkoutSessionJson> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

export function isWorkoutSessionJson(value: unknown): value is WorkoutSessionJson {
  if (
    value == null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isWorkoutSessionJson);
  if (typeof value !== "object") return false;
  return Object.values(value).every(isWorkoutSessionJson);
}

export function safeJsonParse(value: string): WorkoutSessionJson | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return isWorkoutSessionJson(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toWorkoutSessionJson(value: unknown): WorkoutSessionJson {
  const serialized = JSON.stringify(value);
  const parsed = serialized === undefined ? null : safeJsonParse(serialized);
  if (!isWorkoutSessionJson(parsed)) {
    throw new Error("Value is not serializable as workout session JSON");
  }
  return parsed;
}

export function cloneSerializable<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  const serialized = JSON.stringify(value);
  const parsed = safeJsonParse(serialized);
  if (parsed == null && serialized !== "null") {
    throw new Error("Failed to clone workout session JSON safely");
  }
  return parsed as T;
}

export function stableJson(value: unknown): string {
  if (value == null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}
