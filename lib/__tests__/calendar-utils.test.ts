import { describe, expect, it } from "vitest";

import {
  addMonths,
  buildMonthGrid,
  groupSessionsByDay,
  metricsByDay,
  photosByDay,
  plannedWorkoutsByDay,
} from "@/lib/calendar-utils";
import type {
  BodyMetricRecord,
  ProgressPhotoRecord,
  SessionHistoryRecord,
  WeeklyPlan,
} from "@/types";

describe("addMonths", () => {
  it("wraps forward across a year boundary", () => {
    expect(addMonths(2024, 11, 1)).toEqual({ year: 2025, month: 0 });
  });

  it("wraps backward across a year boundary", () => {
    expect(addMonths(2024, 0, -1)).toEqual({ year: 2023, month: 11 });
  });
});

describe("buildMonthGrid", () => {
  it("starts on a Monday and yields whole weeks", () => {
    const grid = buildMonthGrid(2024, 4); // May 2024 (1st is a Wednesday)
    expect(grid.length % 7).toBe(0);
    // First cell is the Monday before May 1 → April 29.
    expect(grid[0].iso).toBe("2024-04-29");
    expect(grid[0].inCurrentMonth).toBe(false);
  });

  it("marks days of the current month and flags today", () => {
    const grid = buildMonthGrid(2024, 4, "2024-05-23");
    const inMonth = grid.filter((c) => c.inCurrentMonth);
    expect(inMonth).toHaveLength(31); // May has 31 days
    expect(inMonth[0].iso).toBe("2024-05-01");
    expect(grid.find((c) => c.isToday)?.iso).toBe("2024-05-23");
  });

  it("includes the 1st when the month starts on a Monday", () => {
    const grid = buildMonthGrid(2024, 6); // July 2024 (1st is a Monday)
    expect(grid[0].iso).toBe("2024-07-01");
    expect(grid[0].inCurrentMonth).toBe(true);
  });
});

describe("groupSessionsByDay", () => {
  function session(id: string, finishedAt: number): SessionHistoryRecord {
    return {
      id,
      workoutId: `w-${id}`,
      workoutName: id,
      startedAt: finishedAt - 3_600_000,
      finishedAt,
      totalActiveMs: 3_600_000,
      totalVolumeKg: 1000,
      exercisesCount: 4,
      setsCompleted: 12,
      repsCompleted: 100,
    };
  }

  it("buckets multiple sessions on the same local day", () => {
    const day = new Date("2024-05-23T08:00:00").getTime();
    const sameDay = new Date("2024-05-23T20:30:00").getTime();
    const map = groupSessionsByDay([session("a", day), session("b", sameDay)]);
    expect(map.get("2024-05-23")).toHaveLength(2);
  });
});

describe("plannedWorkoutsByDay", () => {
  const plan: WeeklyPlan = {
    id: "p",
    weekStart: "2024-05-20", // Monday
    days: [
      { weekday: "monday", rest: false, workout: workout("legs") },
      { weekday: "tuesday", rest: true },
      { weekday: "wednesday", rest: false },
      { weekday: "thursday", rest: false, workout: workout("pull") },
      { weekday: "friday", rest: false },
      { weekday: "saturday", rest: false },
      { weekday: "sunday", rest: false },
    ],
  };

  it("maps training days to their concrete ISO dates", () => {
    const map = plannedWorkoutsByDay(plan);
    expect(map.get("2024-05-20")?.id).toBe("legs");
    expect(map.get("2024-05-23")?.id).toBe("pull");
    expect(map.has("2024-05-21")).toBe(false); // rest day
  });
});

describe("metricsByDay / photosByDay tie-breaking", () => {
  it("keeps the newest metric per day by updatedAt", () => {
    const records: BodyMetricRecord[] = [
      { id: "1", date: "2024-05-20", weightKg: 80, updatedAt: 100 },
      { id: "2", date: "2024-05-20", weightKg: 79, updatedAt: 200 },
    ];
    expect(metricsByDay(records).get("2024-05-20")?.weightKg).toBe(79);
  });

  it("keeps the newest photo per day by createdAt", () => {
    const photos: ProgressPhotoRecord[] = [
      photo("a", "2024-05-20", 100),
      photo("b", "2024-05-20", 200),
    ];
    expect(photosByDay(photos).get("2024-05-20")?.id).toBe("b");
  });
});

function workout(id: string) {
  return {
    id,
    name: id,
    type: "Push" as const,
    exercises: [],
    estimatedDurationMin: 60,
    completed: false,
  };
}

function photo(
  id: string,
  takenAt: string,
  createdAt: number,
): ProgressPhotoRecord {
  return {
    id,
    takenAt,
    pose: "front",
    storagePath: `s/${id}`,
    thumbPath: `t/${id}`,
    weightKg: null,
    notes: null,
    width: null,
    height: null,
    byteSize: null,
    createdAt,
    updatedAt: createdAt,
  };
}
