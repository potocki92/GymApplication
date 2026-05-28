import type {
  ActiveExercise,
  CompletedSession,
  ExerciseHistoryRecord,
  SessionHistoryRecord,
} from "@/types";

function aggregateCounters(exercises: ActiveExercise[]): {
  setsCompleted: number;
  repsCompleted: number;
  totalVolumeKg: number;
} {
  let sets = 0;
  let reps = 0;
  let volume = 0;
  for (const ex of exercises) {
    for (const s of ex.sets) {
      if (s.status !== "completed") continue;
      sets += 1;
      reps += s.actualReps ?? 0;
      volume += (s.actualReps ?? 0) * (s.actualWeightKg ?? 0);
    }
  }
  return { setsCompleted: sets, repsCompleted: reps, totalVolumeKg: volume };
}

/**
 * Build a session-history header from a freshly-completed session plus the
 * summary screen's rating/note. HR fields are filled when available — Etap 5/6
 * will start populating them.
 */
export function buildSessionHistoryRecord(
  session: CompletedSession,
): SessionHistoryRecord {
  const counters = aggregateCounters(session.exercises);
  return {
    id: session.id,
    workoutId: session.workoutId,
    workoutName: session.workoutName,
    startedAt: session.startedAt,
    finishedAt: session.finishedAt,
    totalActiveMs: session.totalActiveMs,
    totalVolumeKg: Math.round(counters.totalVolumeKg * 100) / 100,
    exercisesCount: session.exercises.length,
    setsCompleted: counters.setsCompleted,
    repsCompleted: counters.repsCompleted,
    rating: session.rating,
    note: session.note,
    avgHrBpm: session.heartRate?.avgBpm,
    maxHrBpm: session.heartRate?.maxBpm,
  };
}

export function buildSessionHistoryRecordsFromSets(
  records: ExerciseHistoryRecord[],
  workoutNames: ReadonlyMap<string, string> = new Map(),
): SessionHistoryRecord[] {
  const grouped = new Map<string, ExerciseHistoryRecord[]>();

  for (const record of records) {
    const sessionRecords = grouped.get(record.sessionId) ?? [];
    sessionRecords.push(record);
    grouped.set(record.sessionId, sessionRecords);
  }

  return Array.from(grouped.entries())
    .map(([sessionId, sessionRecords]) => {
      const sorted = [...sessionRecords].sort(
        (a, b) => a.completedAt - b.completedAt,
      );
      const first = sorted[0];
      const last = sorted.at(-1);

      if (!first || !last) return null;

      const workoutId = first.workoutId;
      const totalVolumeKg = sessionRecords.reduce(
        (sum, record) => sum + record.reps * record.weightKg,
        0,
      );
      const repsCompleted = sessionRecords.reduce(
        (sum, record) => sum + record.reps,
        0,
      );
      const exercisesCount = new Set(
        sessionRecords.map((record) => record.exerciseId),
      ).size;

      return {
        id: sessionId,
        workoutId,
        workoutName: workoutNames.get(workoutId) ?? "Trening",
        startedAt: first.completedAt,
        finishedAt: last.completedAt,
        totalActiveMs: Math.max(0, last.completedAt - first.completedAt),
        totalVolumeKg: Math.round(totalVolumeKg * 100) / 100,
        exercisesCount,
        setsCompleted: sessionRecords.length,
        repsCompleted,
      } satisfies SessionHistoryRecord;
    })
    .filter((record): record is SessionHistoryRecord => record != null)
    .sort((a, b) => b.finishedAt - a.finishedAt);
}

export function mergeSessionHistoryRecords(
  primary: SessionHistoryRecord[],
  fallback: SessionHistoryRecord[],
): SessionHistoryRecord[] {
  const byId = new Map<string, SessionHistoryRecord>();

  for (const record of fallback) {
    byId.set(record.id, record);
  }

  for (const record of primary) {
    byId.set(record.id, record);
  }

  return Array.from(byId.values()).sort((a, b) => b.finishedAt - a.finishedAt);
}
