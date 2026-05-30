import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WEEKLY_PLAN } from "@/data";
import { ActiveWorkoutView } from "@/features/active-workout/active-workout-view";
import { NextWorkoutCard } from "@/features/dashboard/components/next-workout-card";
import { useActiveSessionStore } from "@/store";
import type { Workout } from "@/types";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));

vi.mock("@/hooks/use-session-autosave", () => ({
  useSessionAutosave: () => undefined,
}));

vi.mock("@/hooks/use-session-clock", () => ({
  useSessionClock: () => ({
    totalMs: 0,
    setMs: 0,
    restRemainingMs: 0,
    restElapsedMs: 0,
    restDone: false,
  }),
}));

function resetActiveSession() {
  useActiveSessionStore.setState({
    session: null,
    activeSession: null,
    serverVersion: null,
    hydrationStatus: "idle",
    past: [],
    future: [],
  });
  pushMock.mockClear();
}

function plannedWorkout(): Workout {
  const workout = WEEKLY_PLAN.days.find((day) => day.workout)?.workout;
  if (!workout) throw new Error("Seed plan must include at least one workout");
  return workout;
}

describe("starting an active workout", () => {
  beforeEach(() => {
    resetActiveSession();
  });

  afterEach(() => {
    resetActiveSession();
  });

  it("creates a planning session from the dashboard card and navigates to active workout", () => {
    const workout = plannedWorkout();

    render(<NextWorkoutCard workout={workout} />);
    fireEvent.click(screen.getByRole("button", { name: "Rozpocznij trening" }));

    expect(pushMock).toHaveBeenCalledWith("/workout/active");
    const session = useActiveSessionStore.getState().session;
    expect(session?.status).toBe("planning");
    expect(session?.workoutId).toBe(workout.id);
    expect(session?.exercises.length).toBe(workout.exercises.length);
  });

  it("transitions from the pre-start screen to the first executable set", () => {
    const workout = plannedWorkout();
    useActiveSessionStore.getState().start(workout);

    render(<ActiveWorkoutView />);
    fireEvent.click(screen.getByRole("button", { name: "Rozpocznij" }));

    const session = useActiveSessionStore.getState().session;
    expect(session?.status).toBe("executing");
    expect(session?.startedAt).not.toBeNull();
    expect(session?.currentExerciseIndex).toBe(0);
    expect(session?.currentSetIndex).toBe(0);
    expect(session?.exercises[0]?.sets[0]?.status).toBe("active");
    expect(screen.getByRole("button", { name: "Zakończ serię" })).toBeVisible();
  });
});
