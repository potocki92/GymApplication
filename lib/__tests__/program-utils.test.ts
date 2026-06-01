import { describe, expect, it } from "vitest";

import { currentProgramWeek } from "@/lib/program-utils";

const profile = (
  programStartDate: string | null,
  programWeeks: number | null,
) => ({ programStartDate, programWeeks });

describe("currentProgramWeek", () => {
  it("returns null when the program is not configured", () => {
    expect(currentProgramWeek(null)).toBeNull();
    expect(currentProgramWeek(profile(null, 12))).toBeNull();
    expect(currentProgramWeek(profile("2026-04-20", null))).toBeNull();
    expect(currentProgramWeek(profile("2026-04-20", 0))).toBeNull();
  });

  it("counts whole Monday-based weeks since the start (1-based)", () => {
    // 2026-04-20 is a Monday; 6th week ⇒ Monday 2026-05-25.
    const now = new Date("2026-05-27T10:00:00"); // Wednesday of week 6
    expect(currentProgramWeek(profile("2026-04-20", 12), now)).toEqual({
      week: 6,
      total: 12,
    });
  });

  it("reports week 1 during the starting week", () => {
    const now = new Date("2026-04-22T10:00:00"); // same week as start
    expect(currentProgramWeek(profile("2026-04-20", 12), now)).toEqual({
      week: 1,
      total: 12,
    });
  });

  it("clamps to the program length once exceeded", () => {
    const now = new Date("2026-12-01T10:00:00"); // well past 12 weeks
    expect(currentProgramWeek(profile("2026-04-20", 12), now)).toEqual({
      week: 12,
      total: 12,
    });
  });

  it("clamps to week 1 before the program starts", () => {
    const now = new Date("2026-04-10T10:00:00");
    expect(currentProgramWeek(profile("2026-04-20", 12), now)).toEqual({
      week: 1,
      total: 12,
    });
  });
});
