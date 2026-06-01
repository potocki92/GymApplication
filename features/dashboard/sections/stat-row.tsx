"use client";

import { useMemo } from "react";
import { Flame, Scale, Trophy, Weight } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import { formatNumber } from "@/lib/format";
import { sortRecords } from "@/lib/metrics-utils";
import { topPRs } from "@/lib/pr-utils";
import {
  buildDailyVolumeSeries,
  buildLongestStreak,
  buildStrengthProgress,
  buildWeeklyActivity,
  buildWorkoutStreak,
} from "@/lib/stats-utils";
import {
  useHistoryStore,
  useMetricsStore,
  useProfileStore,
  useSessionHistoryStore,
} from "@/store";
import { StatTile } from "../components/stat-tile";

/** Sparkline points sampled for the strength tile. */
const STRENGTH_POINTS = 12;
/** Weekly buckets shown behind the streak tile. */
const STREAK_WEEKS = 12;

/**
 * Quick-glance KPI row (streak · 7-day volume · weight · records). Each tile is
 * driven by the same `stats-utils` aggregations the rest of the dashboard uses —
 * no mock data. "Now" is pinned per mount so every tile shares a week boundary.
 */
export function StatRow() {
  const t = useDictionary();
  const sessions = useSessionHistoryStore((s) => s.sessions);
  const metrics = useMetricsStore((s) => s.records);
  const history = useHistoryStore((s) => s.records);
  const profile = useProfileStore((s) => s.profile);

  const now = useMemo(() => new Date(), []);

  const streak = useMemo(() => buildWorkoutStreak(sessions, now), [sessions, now]);
  const longestStreak = useMemo(() => buildLongestStreak(sessions), [sessions]);
  const streakSpark = useMemo(
    () => buildWeeklyActivity(sessions, STREAK_WEEKS, now).map((p) => p.count),
    [sessions, now],
  );

  const volume = useMemo(
    () => buildDailyVolumeSeries(sessions, 7, now),
    [sessions, now],
  );

  const weights = useMemo(
    () =>
      sortRecords(metrics)
        .map((r) => r.weightKg)
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v)),
    [metrics],
  );
  const currentWeight =
    weights.at(-1) ?? profile?.currentWeightKg ?? null;
  const targetWeight = profile?.targetWeightKg ?? null;

  const prCount = useMemo(() => topPRs(history, 99).length, [history]);
  const strengthSpark = useMemo(
    () => buildStrengthProgress(history).slice(-STRENGTH_POINTS).map((p) => p.topOneRMKg),
    [history],
  );

  const volumeDelta =
    volume.trendPct == null || volume.trendPct === 0
      ? undefined
      : {
          direction: (volume.trendPct > 0 ? "up" : "down") as "up" | "down",
          label: `${volume.trendPct > 0 ? "+" : "−"}${Math.abs(volume.trendPct)}%`,
        };

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatTile
        icon={Flame}
        label={t.dashboard.tiles.streak}
        value={streak}
        unit={t.dashboard.days}
        foot={`${t.dashboard.tiles.streakLongest}: ${longestStreak} ${t.dashboard.days}`}
        sparkline={streakSpark}
      />
      <StatTile
        icon={Weight}
        label={t.dashboard.tiles.volume7d}
        value={volume.total}
        unit="kg"
        delta={volumeDelta}
        sparkline={volume.points}
      />
      <StatTile
        icon={Scale}
        label={t.dashboard.tiles.weight}
        value={currentWeight ?? 0}
        unit="kg"
        decimals={1}
        foot={
          targetWeight != null
            ? `${t.dashboard.tiles.target}: ${formatNumber(targetWeight)} kg`
            : undefined
        }
        sparkline={weights.slice(-STRENGTH_POINTS)}
        sparklineColor="var(--chart-3)"
      />
      <StatTile
        icon={Trophy}
        label={t.dashboard.tiles.records}
        value={prCount}
        unit={t.dashboard.tiles.recordsUnit}
        foot={t.dashboard.tiles.recordsSub}
        sparkline={strengthSpark}
      />
    </div>
  );
}
