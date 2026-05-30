import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkoutSessionRealtimeManager } from "@/lib/workout-session-realtime-manager";
import type { WorkoutSessionEventRecord } from "@/types";

function record(
  sequenceNumber: number,
  overrides: Partial<WorkoutSessionEventRecord> = {},
): WorkoutSessionEventRecord {
  return {
    id: `event-${sequenceNumber}`,
    sessionId: "session-1",
    userId: "user-1",
    eventType: "SET_UPDATED",
    payload: {},
    clientEventId: `client-${sequenceNumber}`,
    deviceId: "device-b",
    sequenceNumber,
    createdAt: sequenceNumber,
    ...overrides,
  };
}

function setup() {
  vi.useFakeTimers();
  let serverVersion = 1;
  let hydrationReady = true;
  let sessionId: string | null = "session-1";
  let deviceId: string | null = "device-a";
  const ownClientEventIds = new Set<string>();
  const unsubscribers: Array<() => Promise<void>> = [];
  const statusHandlers: Array<(status: string) => void> = [];
  const insertHandlers: Array<(event: WorkoutSessionEventRecord) => void> = [];
  const fetchEventsAfter = vi.fn(async () => [] as WorkoutSessionEventRecord[]);
  const applyEvents = vi.fn(async (events: WorkoutSessionEventRecord[]) => {
    serverVersion = Math.max(serverVersion, ...events.map((event) => event.sequenceNumber));
  });
  const subscribe = vi.fn(({ onInsert, onStatus }) => {
    insertHandlers.push(onInsert);
    statusHandlers.push(onStatus);
    const unsubscribe = vi.fn(async () => undefined);
    unsubscribers.push(unsubscribe);
    return unsubscribe;
  });
  const manager = new WorkoutSessionRealtimeManager({
    getState: () => ({
      sessionId,
      serverVersion,
      hydrationReady,
      deviceId,
      ownClientEventIds,
    }),
    subscribe,
    fetchEventsAfter,
    applyEvents,
    setTimeout: (handler, timeout) => Number(setTimeout(handler, timeout)),
    clearTimeout: (id) => clearTimeout(id),
  });

  return {
    manager,
    subscribe,
    fetchEventsAfter,
    applyEvents,
    insert: (event: WorkoutSessionEventRecord, index = insertHandlers.length - 1) =>
      insertHandlers[index]?.(event),
    status: (status: string, index = statusHandlers.length - 1) => statusHandlers[index]?.(status),
    unsubscribers,
    setServerVersion: (value: number) => {
      serverVersion = value;
    },
    setHydrationReady: (value: boolean) => {
      hydrationReady = value;
    },
    setSessionId: (value: string | null) => {
      sessionId = value;
    },
    setDeviceId: (value: string | null) => {
      deviceId = value;
    },
    ownClientEventIds,
  };
}

async function flushTimers(): Promise<void> {
  await vi.runOnlyPendingTimersAsync();
  await Promise.resolve();
}

describe("WorkoutSessionRealtimeManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("guards realtime same event twice", async () => {
    const env = setup();
    env.manager.ensure("session-1");

    env.insert(record(2));
    env.insert(record(2));
    await Promise.resolve();

    expect(env.applyEvents).toHaveBeenCalledTimes(1);
    expect(env.applyEvents).toHaveBeenCalledWith([record(2)]);
  });

  it("runs reconnect replay before continuing realtime listening", async () => {
    const env = setup();
    env.fetchEventsAfter.mockResolvedValue([record(2), record(3)]);
    env.manager.ensure("session-1");

    env.status("SUBSCRIBED");
    await flushTimers();

    expect(env.fetchEventsAfter).toHaveBeenCalledWith("session-1", 1);
    expect(env.applyEvents).toHaveBeenCalledWith([record(2), record(3)]);
    expect(env.manager.getStatus()).toBe("listening");
  });

  it("cleans stale subscriptions and prevents multiple subscriptions", async () => {
    const env = setup();
    env.manager.ensure("session-1");
    env.manager.ensure("session-1");
    expect(env.subscribe).toHaveBeenCalledTimes(1);

    env.setSessionId("session-2");
    env.manager.ensure("session-2");
    await Promise.resolve();

    expect(env.subscribe).toHaveBeenCalledTimes(2);
    expect(env.unsubscribers[0]).toHaveBeenCalledTimes(1);
  });

  it("recovers on tab switch wake signal", async () => {
    const env = setup();
    env.fetchEventsAfter.mockResolvedValue([record(2)]);
    env.manager.ensure("session-1");

    env.manager.notifyWakeOrOnline();
    await flushTimers();

    expect(env.fetchEventsAfter).toHaveBeenCalledWith("session-1", 1);
    expect(env.applyEvents).toHaveBeenCalledWith([record(2)]);
  });

  it("resubscribes after device switch", async () => {
    const env = setup();
    env.manager.ensure("session-1");
    env.setDeviceId("device-c");
    env.manager.ensure("session-1");
    await Promise.resolve();

    expect(env.subscribe).toHaveBeenCalledTimes(2);
    expect(env.unsubscribers[0]).toHaveBeenCalledTimes(1);
  });

  it("recovers delayed realtime events with a sequence gap", async () => {
    const env = setup();
    env.fetchEventsAfter.mockResolvedValue([record(2), record(3)]);
    env.manager.ensure("session-1");

    env.insert(record(3));
    await flushTimers();

    expect(env.applyEvents).toHaveBeenCalledWith([record(2), record(3)]);
  });

  it("defers hydration + realtime race to canonical replay", async () => {
    const env = setup();
    env.setHydrationReady(false);
    env.fetchEventsAfter.mockResolvedValue([record(2)]);
    env.manager.ensure("session-1");

    env.insert(record(2));
    await flushTimers();
    expect(env.applyEvents).not.toHaveBeenCalled();

    env.setHydrationReady(true);
    env.manager.notifyHydrationReady();
    await flushTimers();

    expect(env.fetchEventsAfter).toHaveBeenCalledWith("session-1", 1);
    expect(env.applyEvents).toHaveBeenCalledWith([record(2)]);
  });
});
