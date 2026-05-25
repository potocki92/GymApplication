import { create } from "zustand";

import type { Exercise, Weekday, Workout, WorkoutExercise } from "@/types";
import { averageReps, reindexExercises } from "@/lib/workout-utils";
import { usePlanStore } from "./use-plan-store";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

/** Rough session-length estimate from sets and rest. */
function estimateDuration(exercises: WorkoutExercise[]): number {
  const seconds = exercises.reduce(
    (total, ex) => total + ex.sets * (averageReps(ex.reps) * 4 + ex.restSec),
    0,
  );
  return Math.max(0, Math.round(seconds / 60));
}

interface DraftState {
  open: boolean;
  editingWorkoutId: string | null;
  name: string;
  weekday: Weekday;
  exercises: WorkoutExercise[];

  init: (weekday: Weekday, existing?: Workout) => void;
  setName: (name: string) => void;
  setWeekday: (weekday: Weekday) => void;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (id: string) => void;
  updateExercise: (id: string, patch: Partial<WorkoutExercise>) => void;
  reset: () => void;
  commit: () => boolean;
}

const initialState = {
  open: false,
  editingWorkoutId: null as string | null,
  name: "",
  weekday: "monday" as Weekday,
  exercises: [] as WorkoutExercise[],
};

export const useWorkoutDraftStore = create<DraftState>((set, get) => ({
  ...initialState,

  init: (weekday, existing) =>
    set({
      open: true,
      weekday,
      editingWorkoutId: existing?.id ?? null,
      name: existing?.name ?? "",
      exercises: existing ? existing.exercises.map((e) => ({ ...e })) : [],
    }),

  setName: (name) => set({ name }),
  setWeekday: (weekday) => set({ weekday }),

  addExercise: (exercise) =>
    set((state) => ({
      exercises: reindexExercises([
        ...state.exercises,
        {
          id: uid(),
          exerciseId: exercise.id,
          sets: exercise.defaultSets,
          reps: exercise.defaultReps,
          weightKg: exercise.defaultWeightKg ?? 0,
          restSec: exercise.defaultRestSec,
          order: state.exercises.length,
        },
      ]),
    })),

  removeExercise: (id) =>
    set((state) => ({
      exercises: reindexExercises(state.exercises.filter((e) => e.id !== id)),
    })),

  updateExercise: (id, patch) =>
    set((state) => ({
      exercises: state.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    })),

  reset: () => set({ ...initialState }),

  commit: () => {
    const { name, weekday, exercises, editingWorkoutId } = get();
    if (!name.trim() || exercises.length === 0) return false;

    const workout: Workout = {
      id: editingWorkoutId ?? `w-${uid()}`,
      name: name.trim(),
      type: "Custom",
      exercises: reindexExercises(exercises),
      estimatedDurationMin: estimateDuration(exercises),
      completed: false,
    };

    const planActions = usePlanStore.getState();
    if (editingWorkoutId) {
      planActions.updateWorkout(weekday, workout);
    } else {
      planActions.addWorkout(weekday, workout);
    }
    return true;
  },
}));
