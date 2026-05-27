import type {
  HRConnectionState,
  HRRealtimeEvent,
  HRRealtimeEventHandler,
  HeartRateTransport,
  HRUnsubscribe,
} from "@/types";

interface MockTransportOptions {
  /** Center bpm around which the sine wave oscillates. Default 130. */
  baseBpm?: number;
  /** Amplitude in bpm. Default 20. */
  amplitudeBpm?: number;
  /** Sample period in ms. Default 1000 (1 Hz). */
  intervalMs?: number;
  /** Stable id for the simulated device. */
  deviceId?: string;
}

/**
 * Fully functional transport for local dev, tests, and Storybook. Emits a
 * deterministic-ish sine wave around `baseBpm` so the whole UI pipeline can
 * be exercised without backend or watch hardware.
 *
 * No network access, no auth — safe to instantiate anywhere.
 */
export class MockHeartRateTransport implements HeartRateTransport {
  private _state: HRConnectionState = "idle";
  private readonly handlers = new Set<HRRealtimeEventHandler>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;

  constructor(private readonly options: MockTransportOptions = {}) {}

  get state(): HRConnectionState {
    return this._state;
  }

  subscribe(handler: HRRealtimeEventHandler): HRUnsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async connect(_sessionId: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    this.setState("connecting");

    // Simulate a tiny handshake so the UI gets to render "connecting".
    await new Promise((resolve) => setTimeout(resolve, 120));
    if (signal.aborted) return;

    const deviceId = this.options.deviceId ?? "mock-device";
    this.emit({
      type: "device-connected",
      device: {
        id: deviceId,
        vendor: "mock",
        model: "Synthetic HRM",
        battery: 0.92,
        signalQuality: 1,
        lastSeenAt: Date.now(),
      },
    });

    this.setState("open");

    this.startedAt = Date.now();
    const period = this.options.intervalMs ?? 1000;
    this.timer = setInterval(() => {
      const sample = this.nextSample(deviceId);
      this.emit({ type: "sample", sample });
    }, period);

    signal.addEventListener(
      "abort",
      () => {
        this.teardown(deviceId, "user");
      },
      { once: true },
    );
  }

  private nextSample(deviceId: string) {
    const t = (Date.now() - this.startedAt) / 1000;
    const base = this.options.baseBpm ?? 130;
    const amp = this.options.amplitudeBpm ?? 20;
    // Slow drift (60s period) + small noise so charts look "alive".
    const drift = Math.sin((2 * Math.PI * t) / 60) * amp;
    const noise = (Math.random() - 0.5) * 4;
    return {
      ts: Date.now(),
      bpm: Math.round(base + drift + noise),
      source: "mock" as const,
      deviceId,
    };
  }

  private teardown(deviceId: string, reason: "user" | "timeout" | "error") {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.emit({ type: "device-disconnected", deviceId, reason });
    this.setState("closed");
  }

  private setState(next: HRConnectionState) {
    this._state = next;
    this.emit({ type: "connection-state", state: next });
  }

  private emit(event: HRRealtimeEvent) {
    for (const h of this.handlers) {
      try {
        h(event);
      } catch (err) {
        // Never let a UI handler kill the stream.
        console.error("[mock-transport] handler error", err);
      }
    }
  }
}
