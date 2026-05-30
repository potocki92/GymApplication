import type { WorkoutSessionEventRecord } from "@/types";

export type WorkoutSessionRealtimeStatus =
  | "idle"
  | "subscribing"
  | "recovering"
  | "listening"
  | "closed";

export interface WorkoutSessionRealtimeState {
  sessionId: string | null;
  serverVersion: number | null;
  hydrationReady: boolean;
  deviceId: string | null;
  ownClientEventIds: ReadonlySet<string>;
}

export interface WorkoutSessionRealtimeDependencies {
  getState: () => WorkoutSessionRealtimeState;
  subscribe: (options: {
    sessionId: string;
    onInsert: (event: WorkoutSessionEventRecord) => void;
    onStatus: (status: string) => void;
  }) => (() => Promise<void>) | null;
  fetchEventsAfter: (
    sessionId: string,
    serverVersion: number,
  ) => Promise<WorkoutSessionEventRecord[]>;
  applyEvents: (events: WorkoutSessionEventRecord[]) => Promise<void> | void;
  now?: () => number;
  setTimeout?: (handler: () => void, timeout: number) => number;
  clearTimeout?: (id: number) => void;
}

interface ActiveSubscription {
  key: string;
  generation: number;
  sessionId: string;
  unsubscribe: (() => Promise<void>) | null;
}

const RECENT_LIMIT = 512;
const RECOVERY_DEBOUNCE_MS = 250;

function isOpenStatus(status: string): boolean {
  return status === "SUBSCRIBED" || status === "CHANNEL_OPEN" || status === "OPEN";
}

function isDisconnectedStatus(status: string): boolean {
  return (
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT" ||
    status === "CLOSED" ||
    status === "ERROR"
  );
}

/**
 * Owns exactly one Supabase Realtime subscription for workout_session_events.
 * Realtime is treated only as a low-latency hint: every reconnect or buffered
 * delivery is recovered by fetching and replaying canonical missing events after
 * the store's serverVersion.
 */
export class WorkoutSessionRealtimeManager {
  private active: ActiveSubscription | null = null;
  private status: WorkoutSessionRealtimeStatus = "idle";
  private recovery: Promise<void> | null = null;
  private recoveryTimer: number | null = null;
  private readonly recentClientEventIds: string[] = [];
  private readonly seenClientEventIds = new Set<string>();
  private readonly pendingClientEventIds = new Set<string>();
  private generation = 0;

  constructor(private readonly deps: WorkoutSessionRealtimeDependencies) {}

  getStatus(): WorkoutSessionRealtimeStatus {
    return this.status;
  }

  ensure(sessionId: string | null): void {
    if (!sessionId) {
      void this.stop();
      return;
    }

    const state = this.deps.getState();
    const key = `${sessionId}:${state.deviceId ?? "anonymous"}`;
    if (this.active?.key === key) return;

    void this.stop();
    const generation = this.generation + 1;
    this.generation = generation;
    const active: ActiveSubscription = {
      key,
      generation,
      sessionId,
      unsubscribe: null,
    };
    this.active = active;
    this.status = "subscribing";

    active.unsubscribe = this.deps.subscribe({
      sessionId,
      onInsert: (event) => {
        if (this.active?.generation !== generation) return;
        void this.handleInsert(event).catch(() => {
          this.scheduleRecovery(RECOVERY_DEBOUNCE_MS);
        });
      },
      onStatus: (status) => {
        if (this.active?.generation !== generation) return;
        this.handleStatus(status);
      },
    });

    if (!active.unsubscribe) {
      this.status = "closed";
      return;
    }
  }

  async stop(): Promise<void> {
    const current = this.active;
    this.active = null;
    this.status = "idle";
    this.clearRecoveryTimer();
    if (current?.unsubscribe) await current.unsubscribe();
  }

  notifyHydrationReady(): void {
    if (this.active && this.deps.getState().hydrationReady) {
      this.scheduleRecovery(0);
    }
  }

  notifyWakeOrOnline(): void {
    if (this.active) this.scheduleRecovery(RECOVERY_DEBOUNCE_MS);
  }

  private handleStatus(status: string): void {
    if (isOpenStatus(status)) {
      this.status = "recovering";
      this.scheduleRecovery(0);
      return;
    }

    if (isDisconnectedStatus(status)) {
      this.status = "closed";
      this.scheduleRecovery(RECOVERY_DEBOUNCE_MS);
    }
  }

  private async handleInsert(event: WorkoutSessionEventRecord): Promise<void> {
    const state = this.deps.getState();
    if (event.sessionId !== state.sessionId) return;
    if (this.shouldIgnore(event, state)) return;

    // Supabase events can arrive while hydration is still restoring IDB/server
    // state or after a reconnect gap. Recover from canonical event log instead
    // of directly trusting the realtime payload as source of truth.
    if (!state.hydrationReady || event.sequenceNumber > (state.serverVersion ?? 0) + 1) {
      this.scheduleRecovery(0);
      return;
    }

    if (this.recovery) {
      void this.recovery.finally(() => this.scheduleRecovery(0));
      return;
    }

    if (this.shouldIgnore(event, state)) return;

    this.pendingClientEventIds.add(event.clientEventId);
    try {
      await this.deps.applyEvents([event]);
      this.markSeen([event]);
    } finally {
      this.pendingClientEventIds.delete(event.clientEventId);
    }
  }

  private shouldIgnore(
    event: WorkoutSessionEventRecord,
    state: WorkoutSessionRealtimeState,
  ): boolean {
    if (event.deviceId && state.deviceId && event.deviceId === state.deviceId) return true;
    if (state.ownClientEventIds.has(event.clientEventId)) return true;
    if (event.sequenceNumber <= (state.serverVersion ?? 0)) return true;
    return (
      this.seenClientEventIds.has(event.clientEventId) ||
      this.pendingClientEventIds.has(event.clientEventId)
    );
  }

  private markSeen(events: WorkoutSessionEventRecord[]): void {
    for (const event of events) {
      if (this.seenClientEventIds.has(event.clientEventId)) continue;
      this.seenClientEventIds.add(event.clientEventId);
      this.recentClientEventIds.push(event.clientEventId);
    }

    while (this.recentClientEventIds.length > RECENT_LIMIT) {
      const oldest = this.recentClientEventIds.shift();
      if (oldest) this.seenClientEventIds.delete(oldest);
    }
  }

  private scheduleRecovery(delay: number): void {
    if (!this.active) return;
    this.clearRecoveryTimer();
    const setTimeoutImpl = this.deps.setTimeout ?? ((handler, timeout) => window.setTimeout(handler, timeout));
    this.recoveryTimer = setTimeoutImpl(() => {
      this.recoveryTimer = null;
      void this.recover().catch(() => {
        if (!this.active) return;
        this.status = "closed";
        this.scheduleRecovery(RECOVERY_DEBOUNCE_MS);
      });
    }, delay);
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer == null) return;
    const clearTimeoutImpl = this.deps.clearTimeout ?? ((id) => window.clearTimeout(id));
    clearTimeoutImpl(this.recoveryTimer);
    this.recoveryTimer = null;
  }

  private async recover(): Promise<void> {
    if (this.recovery) return this.recovery;

    this.recovery = (async () => {
      const active = this.active;
      const state = this.deps.getState();
      if (!active || !state.hydrationReady || !state.sessionId) return;

      this.status = "recovering";
      const baseVersion = state.serverVersion ?? 0;
      const missing = await this.deps.fetchEventsAfter(state.sessionId, baseVersion);
      const latestState = this.deps.getState();
      if (this.active?.generation !== active.generation || latestState.sessionId !== state.sessionId) {
        return;
      }

      const filtered = missing.filter((event) => !this.shouldIgnore(event, this.deps.getState()));
      for (const event of filtered) this.pendingClientEventIds.add(event.clientEventId);
      try {
        if (filtered.length > 0) {
          await this.deps.applyEvents(filtered);
          this.markSeen(filtered);
        }
      } finally {
        for (const event of filtered) this.pendingClientEventIds.delete(event.clientEventId);
      }
      if (this.active?.generation === active.generation) this.status = "listening";
    })().finally(() => {
      this.recovery = null;
    });

    return this.recovery;
  }
}
