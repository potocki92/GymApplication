"use client";

import { useEffect, useRef } from "react";

interface AlarmOptions {
  sound: boolean;
  vibration: boolean;
}

type WindowAudio = typeof AudioContext;

function beep() {
  try {
    const Ctor: WindowAudio | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: WindowAudio })
        .webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    osc.onended = () => void ctx.close();
  } catch {
    /* audio unavailable — silent fallback */
  }
}

/**
 * Fires a beep + haptic buzz exactly once on the rest-countdown's false->true edge.
 * Every API is feature-detected; unsupported environments simply stay quiet.
 */
export function useRestAlarm(restDone: boolean, opts: AlarmOptions): void {
  const prev = useRef(false);

  useEffect(() => {
    if (restDone && !prev.current) {
      if (opts.sound) beep();
      if (opts.vibration && typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([120, 60, 120]);
      }
    }
    prev.current = restDone;
  }, [restDone, opts.sound, opts.vibration]);
}
