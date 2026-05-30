import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendWorkoutSessionEvent,
  completeWorkoutSession,
  getActiveWorkoutSession,
  getWorkoutSessionEventsAfter,
  getWorkoutSessionById,
  mapRowToWorkoutSession,
  mapRowToWorkoutSessionEvent,
  startWorkoutSession,
  type WorkoutSessionEventRow,
  type WorkoutSessionRow,
} from "@/lib/supabase-workout-session-events";

let mockClient: SupabaseClient | null = null;

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => mockClient,
}));

const SESSION_ROW: WorkoutSessionRow = {
  id: "session-1",
  user_id: "user-1",
  workout_id: "workout-1",
  workout_name: "Push",
  started_at: "2026-05-29T10:00:00.000Z",
  finished_at: null,
  total_active_ms: "0",
  status: "active",
  current_state: { status: "executing" },
  version: 1,
  device_id: "device-1",
  last_event_id: "event-1",
  created_at: "2026-05-29T10:00:00.000Z",
  updated_at: "2026-05-29T10:00:01.000Z",
};

const EVENT_ROW: WorkoutSessionEventRow = {
  id: "event-1",
  session_id: "session-1",
  user_id: "user-1",
  event_type: "WORKOUT_STARTED",
  payload: { workoutId: "workout-1" },
  client_event_id: "client-event-1",
  device_id: "device-1",
  sequence_number: 1,
  created_at: "2026-05-29T10:00:00.000Z",
};

class QueryMock {
  readonly select = vi.fn(() => this);
  readonly update = vi.fn(() => this);
  readonly eq = vi.fn(() => this);
  readonly gt = vi.fn(() => this);
  readonly in = vi.fn(() => this);
  readonly order = vi.fn(() => this);
  readonly limit = vi.fn(() => this);

  constructor(
    readonly data: unknown,
    readonly error: { message?: string } | null = null,
  ) {}
}

function makeClient({
  rpcData = null,
  queryData = [],
  queryError = null,
  userId = "user-1",
}: {
  rpcData?: unknown;
  queryData?: unknown;
  queryError?: { message?: string } | null;
  userId?: string | null;
}) {
  const query = new QueryMock(queryData, queryError);
  const rpc = vi.fn(async () => ({ data: rpcData, error: null }));
  const from = vi.fn(() => query);
  const getUser = vi.fn(async () => ({
    data: { user: userId ? { id: userId } : null },
    error: null,
  }));
  const client = {
    rpc,
    from,
    auth: { getUser },
  } as unknown as SupabaseClient;
  return { client, rpc, from, getUser, query };
}

describe("workout session event mappers", () => {
  it("maps a workout session row to the domain shape", () => {
    expect(mapRowToWorkoutSession(SESSION_ROW)).toEqual({
      id: "session-1",
      userId: "user-1",
      workoutId: "workout-1",
      workoutName: "Push",
      startedAt: Date.UTC(2026, 4, 29, 10, 0, 0),
      finishedAt: undefined,
      totalActiveMs: 0,
      status: "active",
      currentState: { status: "executing" },
      version: 1,
      deviceId: "device-1",
      lastEventId: "event-1",
      createdAt: Date.UTC(2026, 4, 29, 10, 0, 0),
      updatedAt: Date.UTC(2026, 4, 29, 10, 0, 1),
    });
  });

  it("maps a workout session event row to the domain event shape", () => {
    expect(mapRowToWorkoutSessionEvent(EVENT_ROW)).toEqual({
      id: "event-1",
      sessionId: "session-1",
      userId: "user-1",
      eventType: "WORKOUT_STARTED",
      payload: { workoutId: "workout-1" },
      clientEventId: "client-event-1",
      deviceId: "device-1",
      sequenceNumber: 1,
      createdAt: Date.UTC(2026, 4, 29, 10, 0, 0),
    });
  });
});

describe("workout session event Supabase adapter", () => {
  beforeEach(() => {
    mockClient = null;
  });

  it("calls the start_workout_session RPC and maps the returned session", async () => {
    const { client, rpc } = makeClient({ rpcData: SESSION_ROW });
    mockClient = client;

    const result = await startWorkoutSession({
      sessionId: "session-1",
      workoutId: "workout-1",
      workoutName: "Push",
      deviceId: "device-1",
      clientEventId: "client-event-1",
      initialState: { status: "planning" },
    });

    expect(rpc).toHaveBeenCalledWith("start_workout_session", {
      p_session_id: "session-1",
      p_workout_id: "workout-1",
      p_workout_name: "Push",
      p_device_id: "device-1",
      p_client_event_id: "client-event-1",
      p_initial_state: { status: "planning" },
    });
    expect(result?.id).toBe("session-1");
    expect(result?.status).toBe("active");
  });

  it("calls the append_workout_session_event RPC and maps the returned event", async () => {
    const { client, rpc } = makeClient({ rpcData: EVENT_ROW });
    mockClient = client;

    const result = await appendWorkoutSessionEvent({
      sessionId: "session-1",
      eventType: "SET_COMPLETED",
      payload: { setId: "set-1" },
      clientEventId: "client-event-2",
      deviceId: null,
      expectedVersion: 1,
      nextState: { status: "resting" },
      nextStatus: "active",
    });

    expect(rpc).toHaveBeenCalledWith("append_workout_session_event", {
      p_session_id: "session-1",
      p_event_type: "SET_COMPLETED",
      p_payload: { setId: "set-1" },
      p_client_event_id: "client-event-2",
      p_device_id: null,
      p_expected_version: 1,
      p_next_state: { status: "resting" },
      p_next_status: "active",
    });
    expect(result?.eventType).toBe("WORKOUT_STARTED");
  });

  it("loads the current user's active or paused session", async () => {
    const { client, from, getUser, query } = makeClient({ queryData: [SESSION_ROW] });
    mockClient = client;

    const result = await getActiveWorkoutSession();

    expect(getUser).toHaveBeenCalled();
    expect(from).toHaveBeenCalledWith("workout_sessions");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("status", ["active", "paused"]);
    expect(query.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(result?.id).toBe("session-1");
  });

  it("loads events after the supplied sequence number", async () => {
    const { client, from, query } = makeClient({ queryData: [EVENT_ROW] });
    mockClient = client;

    const result = await getWorkoutSessionEventsAfter("session-1", 3);

    expect(from).toHaveBeenCalledWith("workout_session_events");
    expect(query.eq).toHaveBeenCalledWith("session_id", "session-1");
    expect(query.gt).toHaveBeenCalledWith("sequence_number", 3);
    expect(query.order).toHaveBeenCalledWith("sequence_number", { ascending: true });
    expect(result).toHaveLength(1);
    expect(result[0].sequenceNumber).toBe(1);
  });


  it("loads a workout session by id", async () => {
    const { client, from, query } = makeClient({ queryData: [SESSION_ROW] });
    mockClient = client;

    const result = await getWorkoutSessionById("session-1");

    expect(from).toHaveBeenCalledWith("workout_sessions");
    expect(query.eq).toHaveBeenCalledWith("id", "session-1");
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(result?.workoutId).toBe("workout-1");
  });

  it("finalizes an active session by marking the row completed", async () => {
    const { client, from, query } = makeClient({ queryData: null });
    mockClient = client;

    await completeWorkoutSession("session-1");

    expect(from).toHaveBeenCalledWith("workout_sessions");
    expect(query.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" }),
    );
    expect(query.eq).toHaveBeenCalledWith("id", "session-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.in).toHaveBeenCalledWith("status", ["active", "paused"]);
  });

  it("swallows Supabase errors so the fire-and-forget call never rejects", async () => {
    const { client } = makeClient({ queryError: { message: "boom" } });
    mockClient = client;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(completeWorkoutSession("session-1")).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
