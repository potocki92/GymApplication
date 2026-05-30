import type { WorkoutSessionEventType } from "@/features/workout-session/domain/workout-session-events";

export type WorkoutSessionPersistenceStatus = "active" | "paused" | "completed";

export type WorkoutSessionJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: WorkoutSessionJson }
  | WorkoutSessionJson[];

export type WorkoutSessionOutboxSyncStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";

export interface WorkoutSessionEventRecord {
  id: string;
  sessionId: string;
  userId: string;
  eventType: WorkoutSessionEventType;
  payload: WorkoutSessionJson;
  clientEventId: string;
  deviceId?: string | null;
  sequenceNumber: number;
  createdAt: number;
}

export interface WorkoutSessionOutboxEvent {
  id: string;
  sessionId: string;
  userId: string;
  eventType: WorkoutSessionEventType;
  payload: WorkoutSessionJson;
  /** Local-only snapshot used to update current_state during sync; not duplicated inside event payload. */
  nextState: WorkoutSessionJson;
  clientEventId: string;
  deviceId: string | null;
  baseVersion: number;
  localSequenceNumber: number;
  createdAt: number;
  syncStartedAt?: number | null;
  syncStatus: WorkoutSessionOutboxSyncStatus;
  retryCount: number;
  lastError: string | null;
}

export interface ActiveWorkoutSessionRecord {
  id: string;
  userId: string;
  workoutId: string;
  workoutName: string;
  startedAt: number;
  finishedAt?: number;
  totalActiveMs: number;
  status: WorkoutSessionPersistenceStatus;
  currentState: WorkoutSessionJson;
  version: number;
  deviceId?: string | null;
  lastEventId?: string | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface StartWorkoutSessionInput {
  sessionId: string;
  workoutId: string;
  workoutName: string;
  deviceId?: string | null;
  clientEventId: string;
  initialState: WorkoutSessionJson;
}

export interface AppendWorkoutSessionEventInput {
  sessionId: string;
  eventType: WorkoutSessionEventType;
  payload: WorkoutSessionJson;
  clientEventId: string;
  deviceId?: string | null;
  expectedVersion: number;
  nextState: WorkoutSessionJson;
  nextStatus: WorkoutSessionPersistenceStatus;
}
