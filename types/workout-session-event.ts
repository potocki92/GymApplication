export type WorkoutSessionPersistenceStatus = "active" | "paused" | "completed";

export type WorkoutSessionJson =
  | string
  | number
  | boolean
  | null
  | { [key: string]: WorkoutSessionJson }
  | WorkoutSessionJson[];

export interface WorkoutSessionEventRecord {
  id: string;
  sessionId: string;
  userId: string;
  eventType: string;
  payload: WorkoutSessionJson;
  clientEventId: string;
  deviceId?: string | null;
  sequenceNumber: number;
  createdAt: number;
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
  eventType: string;
  payload: WorkoutSessionJson;
  clientEventId: string;
  deviceId?: string | null;
  expectedVersion: number;
  nextState: WorkoutSessionJson;
  nextStatus: WorkoutSessionPersistenceStatus;
}
