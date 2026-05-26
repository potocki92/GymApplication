import { create } from "zustand";

import {
  buildActiveSession,
  currentSet,
  nextCursor,
  suggestedReps,
  toCompletedSession,
  uid,
} from "@/lib/session-utils";
import type {
  ActiveSession,
  CompletedSession,
  LoggedSet,
  Workout,
} from "@/types";

const HISTORY_LIMIT = 30;

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Activate the set the cursor currently points at (start its timer, prefill actuals). */
function activateCurrentSet(s: ActiveSession, now: number): void {
  const set = s.exercises[s.currentExerciseIndex]?.sets[s.currentSetIndex];
  if (!set) return;
  s.status = "executing";
  s.restStartedAt = null;
  s.restTargetSec = 0;
  set.startedAt = now;
  set.status = "active";
  if (set.actualReps == null) set.actualReps = suggestedReps(set.targetReps);
  if (set.actualWeightKg == null) set.actualWeightKg = set.targetWeightKg;
}

interface ActiveSessionState {
  session: ActiveSession | null;
  past: ActiveSession[];
  future: ActiveSession[];

  // lifecycle
  start: (workout: Workout) => void;
  beginFirstSet: () => void;
  pause: () => void;
  resume: () => void;
  abort: () => void;
  finishEarly: () => void;
  save: () => CompletedSession | null;

  // execution
  completeSet: () => void;
  skipRest: () => void;

  // in-flight editing
  editCurrentSet: (
    patch: Partial<Pick<LoggedSet, "actualReps" | "actualWeightKg">>,
  ) => void;
  setRestForCurrentSet: (sec: number) => void;
  addSet: (exerciseIndex: number) => void;
  removeSet: (exerciseIndex: number, setId: string) => void;

  // history
  undo: () => void;
  redo: () => void;

  // recovery
  hydrate: (session: ActiveSession) => void;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => {
  /**
   * Apply an immutable mutation to the session. `fn` mutates a deep clone; return
   * `false` to abort with no state change. When `pushHistory` is true the pre-edit
   * session is pushed onto the undo stack and the redo stack is cleared.
   */
  function commit(
    pushHistory: boolean,
    fn: (draft: ActiveSession) => boolean | void,
  ): void {
    const cur = get().session;
    if (!cur) return;
    const draft = clone(cur);
    if (fn(draft) === false) return;
    draft.updatedAt = Date.now();
    if (pushHistory) {
      set({
        session: draft,
        past: [...get().past, cur].slice(-HISTORY_LIMIT),
        future: [],
      });
    } else {
      set({ session: draft });
    }
  }

  return {
    session: null,
    past: [],
    future: [],

    start: (workout) =>
      set({ session: buildActiveSession(workout), past: [], future: [] }),

    beginFirstSet: () =>
      commit(true, (s) => {
        if (s.status !== "planning") return false;
        const now = Date.now();
        s.startedAt = now;
        s.currentExerciseIndex = 0;
        s.currentSetIndex = 0;
        if (!s.exercises[0]?.sets[0]) return false;
        activateCurrentSet(s, now);
      }),

    completeSet: () =>
      commit(true, (s) => {
        if (s.status !== "executing") return false;
        const now = Date.now();
        const set = s.exercises[s.currentExerciseIndex]?.sets[s.currentSetIndex];
        if (!set) return false;
        set.completedAt = now;
        set.status = "completed";
        if (set.actualReps == null) set.actualReps = suggestedReps(set.targetReps);
        if (set.actualWeightKg == null) set.actualWeightKg = set.targetWeightKg;

        const next = nextCursor(s, s.currentExerciseIndex, s.currentSetIndex);
        if (!next) {
          s.status = "finished";
          s.finishedAt = now;
          s.restStartedAt = null;
          return;
        }
        const restSec = set.restTargetSec;
        s.currentExerciseIndex = next.exerciseIndex;
        s.currentSetIndex = next.setIndex;
        if (restSec > 0) {
          s.status = "resting";
          s.restStartedAt = now;
          s.restTargetSec = restSec;
        } else {
          activateCurrentSet(s, now);
        }
      }),

    skipRest: () =>
      commit(true, (s) => {
        if (s.status !== "resting") return false;
        activateCurrentSet(s, Date.now());
      }),

    pause: () =>
      commit(false, (s) => {
        if (s.status !== "executing" && s.status !== "resting") return false;
        s.pausedAt = Date.now();
        s.status = "paused";
      }),

    resume: () =>
      commit(false, (s) => {
        if (s.status !== "paused" || s.pausedAt == null) return false;
        const delta = Date.now() - s.pausedAt;
        if (s.startedAt != null) s.startedAt += delta;
        if (s.restStartedAt != null) {
          s.restStartedAt += delta;
          s.status = "resting";
        } else {
          const cur = currentSet(s);
          if (cur?.startedAt != null && cur.completedAt == null) {
            cur.startedAt += delta;
          }
          s.status = "executing";
        }
        s.pausedAt = null;
      }),

    finishEarly: () =>
      commit(true, (s) => {
        if (s.status === "finished" || s.status === "planning") return false;
        const now = Date.now();
        for (const ex of s.exercises) {
          for (const st of ex.sets) {
            if (st.status === "pending" || st.status === "active") {
              st.status = "skipped";
            }
          }
        }
        s.status = "finished";
        s.finishedAt = now;
        s.restStartedAt = null;
        s.pausedAt = null;
      }),

    abort: () => set({ session: null, past: [], future: [] }),

    save: () => {
      const s = get().session;
      if (!s || s.status !== "finished") return null;
      const completed = toCompletedSession(s);
      set({ session: null, past: [], future: [] });
      return completed;
    },

    editCurrentSet: (patch) =>
      commit(true, (s) => {
        const cur = currentSet(s);
        if (!cur) return false;
        if (patch.actualReps != null) {
          cur.actualReps = Math.max(0, Math.round(patch.actualReps));
        }
        if (patch.actualWeightKg != null) {
          cur.actualWeightKg = Math.max(0, patch.actualWeightKg);
        }
      }),

    setRestForCurrentSet: (sec) =>
      commit(true, (s) => {
        const clamped = Math.max(0, Math.round(sec));
        if (s.status === "resting") {
          s.restTargetSec = clamped;
          s.restStartedAt = Date.now(); // restart, per E1.2.4
        } else {
          const cur = currentSet(s);
          if (!cur) return false;
          cur.restTargetSec = clamped;
        }
      }),

    addSet: (exerciseIndex) =>
      commit(true, (s) => {
        const ex = s.exercises[exerciseIndex];
        if (!ex) return false;
        const last = ex.sets[ex.sets.length - 1];
        const num = ex.sets.length + 1;
        ex.sets.push({
          id: `${ex.id}-set-${num}-${uid()}`,
          setNumber: num,
          status: "pending",
          targetReps: ex.targetReps,
          targetWeightKg: last?.targetWeightKg ?? ex.targetWeightKg,
          actualReps: null,
          actualWeightKg: null,
          restTargetSec: last?.restTargetSec ?? 0,
          startedAt: null,
          completedAt: null,
        });
      }),

    removeSet: (exerciseIndex, setId) =>
      commit(true, (s) => {
        const ex = s.exercises[exerciseIndex];
        if (!ex) return false;
        const idx = ex.sets.findIndex((x) => x.id === setId);
        if (idx < 0) return false;
        const target = ex.sets[idx];
        // only pending sets can be removed, and never the active cursor target
        if (target.status !== "pending") return false;
        if (
          exerciseIndex === s.currentExerciseIndex &&
          idx === s.currentSetIndex
        ) {
          return false;
        }
        ex.sets.splice(idx, 1);
        ex.sets.forEach((x, i) => (x.setNumber = i + 1));
        if (
          exerciseIndex === s.currentExerciseIndex &&
          idx < s.currentSetIndex
        ) {
          s.currentSetIndex -= 1;
        }
      }),

    undo: () => {
      const { past, session, future } = get();
      if (past.length === 0 || !session) return;
      const prev = past[past.length - 1];
      set({
        session: prev,
        past: past.slice(0, -1),
        future: [session, ...future].slice(0, HISTORY_LIMIT),
      });
    },

    redo: () => {
      const { past, session, future } = get();
      if (future.length === 0 || !session) return;
      const next = future[0];
      set({
        session: next,
        past: [...past, session].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      });
    },

    hydrate: (session) => set({ session, past: [], future: [] }),
  };
});
