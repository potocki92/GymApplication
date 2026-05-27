/**
 * Pure HR-zone math. Every function is side-effect-free and unit-testable so
 * the same logic runs in the store, in the UI, and (eventually) server-side
 * when persisting per-zone aggregates.
 *
 * Only the `percent_mhr` method is implemented today. The `karvonen` branch is
 * scaffolded (returns null) so callers can switch on `profile.hrZoneMethod`
 * without conditionals scattered through the codebase.
 */

import type {
  HeartRateZoneDefinition,
  HeartRateZoneId,
  UserProfile,
} from "@/types";

/** %MHR boundaries used by zone classification — Garmin / Polar standard. */
const PERCENT_MHR_BOUNDS: ReadonlyArray<{
  zone: HeartRateZoneId;
  lo: number;
  hi: number;
  labelKey: HeartRateZoneDefinition["labelKey"];
  color: HeartRateZoneDefinition["color"];
}> = [
  {
    zone: 1,
    lo: 0.5,
    hi: 0.6,
    labelKey: "z1",
    color: {
      fg: "text-blue-300",
      bg: "bg-blue-500/10",
      ring: "ring-blue-500/40",
    },
  },
  {
    zone: 2,
    lo: 0.6,
    hi: 0.7,
    labelKey: "z2",
    color: {
      fg: "text-emerald-300",
      bg: "bg-emerald-500/10",
      ring: "ring-emerald-500/40",
    },
  },
  {
    zone: 3,
    lo: 0.7,
    hi: 0.8,
    labelKey: "z3",
    color: {
      fg: "text-amber-300",
      bg: "bg-amber-500/10",
      ring: "ring-amber-500/40",
    },
  },
  {
    zone: 4,
    lo: 0.8,
    hi: 0.9,
    labelKey: "z4",
    color: {
      fg: "text-orange-300",
      bg: "bg-orange-500/10",
      ring: "ring-orange-500/40",
    },
  },
  {
    zone: 5,
    lo: 0.9,
    hi: 1.0,
    labelKey: "z5",
    color: {
      fg: "text-rose-300",
      bg: "bg-rose-500/10",
      ring: "ring-rose-500/40",
    },
  },
];

/**
 * Fagerberg `220 - age` fallback. Crude but standard for users who haven't
 * measured their true max. Returns null when `birthDate` is missing.
 */
export function defaultMaxHr(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (ageYears <= 0 || ageYears > 120) return null;
  return Math.round(220 - ageYears);
}

/**
 * Resolves the user's effective max HR: explicit override first, age-based
 * fallback second. Null when neither is available.
 */
export function resolveMaxHr(profile: Pick<UserProfile, "maxHrBpm" | "birthDate">): number | null {
  if (profile.maxHrBpm != null && profile.maxHrBpm > 0) return profile.maxHrBpm;
  return defaultMaxHr(profile.birthDate);
}

/**
 * Computes the five zone boundaries for the given profile. Returns null when
 * `maxHrBpm` cannot be resolved — callers should render the "set up zones"
 * placeholder rather than guessing.
 *
 * Karvonen requires `restingHrBpm`; until that branch is implemented we fall
 * back to `percent_mhr` (so the UI never breaks on profiles configured with
 * `hrZoneMethod: "karvonen"`).
 */
export function computeZoneBounds(
  profile: Pick<
    UserProfile,
    "maxHrBpm" | "restingHrBpm" | "hrZoneMethod" | "birthDate"
  >,
): HeartRateZoneDefinition[] | null {
  const maxHr = resolveMaxHr(profile);
  if (maxHr == null) return null;

  // TODO(Etap 6): when `hrZoneMethod === "karvonen"` and `restingHrBpm` is
  // present, compute via HRR = max - rest, target = rest + pct * HRR.
  return PERCENT_MHR_BOUNDS.map((b) => ({
    zone: b.zone,
    minBpm: Math.round(b.lo * maxHr),
    maxBpm: Math.round(b.hi * maxHr),
    labelKey: b.labelKey,
    color: b.color,
  }));
}

/**
 * Classifies a single bpm reading into a zone id. Returns null when the
 * reading is below Z1 (e.g. resting) or above Z5 (anomaly). Boundaries are
 * inclusive on the lower edge and exclusive on the upper edge, except the
 * last zone which is inclusive on both edges.
 */
export function classifyZone(
  bpm: number,
  bounds: HeartRateZoneDefinition[],
): HeartRateZoneId | null {
  if (!Number.isFinite(bpm) || bounds.length === 0) return null;
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i]!;
    const isLast = i === bounds.length - 1;
    if (bpm >= b.minBpm && (isLast ? bpm <= b.maxBpm : bpm < b.maxBpm)) {
      return b.zone;
    }
  }
  return null;
}
