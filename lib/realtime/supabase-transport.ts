import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  HeartRateSample,
  HeartRateTransport,
  HRConnectionState,
  HRRealtimeEvent,
  HRRealtimeEventHandler,
  HRUnsubscribe,
} from "@/types";

/**
 * Channel name convention: `hr:session:{sessionId}`. Mobile bridge broadcasts
 * `{ event: "sample", payload: HeartRateSample }` after persisting each
 * reading to `public.heart_rate_samples`. Web only subscribes — it never
 * writes here.
 *
 * NOTE(Etap 6): this is the only Supabase-coupled transport. The body is
 * intentionally a stub — wiring real subscribe/teardown lands together with
 * the mobile side so we can iterate on the wire shape end-to-end. The shape
 * of `connect` / `subscribe` is final.
 */
export class SupabaseHeartRateTransport implements HeartRateTransport {
  private _state: HRConnectionState = "idle";
  private readonly handlers = new Set<HRRealtimeEventHandler>();

  get state(): HRConnectionState {
    return this._state;
  }

  subscribe(handler: HRRealtimeEventHandler): HRUnsubscribe {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  async connect(sessionId: string, signal: AbortSignal): Promise<void> {
    if (signal.aborted) return;
    this.setState("connecting");

    const client = getSupabaseClient();
    if (!client) {
      this.setState("error");
      this.emit({
        type: "error",
        message: "Supabase client not configured",
        recoverable: false,
      });
      return;
    }

    // TODO(Etap 6): wire the real subscription. Sketch of the final code so
    // the contract is reviewable now:
    //
    //   const channel = client.channel(`hr:session:${sessionId}`, {
    //     config: { broadcast: { self: false } },
    //   });
    //   channel.on("broadcast", { event: "sample" }, ({ payload }) => {
    //     const sample = payload as HeartRateSample;
    //     this.emit({ type: "sample", sample });
    //   });
    //   channel.subscribe((status) => {
    //     if (status === "SUBSCRIBED") this.setState("open");
    //     if (status === "CHANNEL_ERROR") this.setState("error");
    //     if (status === "CLOSED") this.setState("closed");
    //   });
    //   signal.addEventListener("abort", () => {
    //     void client.removeChannel(channel);
    //   }, { once: true });
    //
    // Channel authorization (Realtime RLS) MUST be configured server-side so
    // only the session owner can subscribe — see migration TODO.
    void sessionId;
    void this.emitSample; // referenced for future use; keeps linter happy

    this.setState("idle");
  }

  /** Reserved for the live impl — invoked from inside the broadcast handler. */
  private emitSample(sample: HeartRateSample) {
    this.emit({ type: "sample", sample });
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
        console.error("[supabase-transport] handler error", err);
      }
    }
  }
}
