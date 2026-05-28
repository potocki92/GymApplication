import { describe, expect, it } from "vitest";

import {
  canAccess,
  canManageClient,
  canManageOrganization,
  hasFeature,
} from "@/lib/access-control";
import type { AppAccessUser } from "@/types";

const baseUser: AppAccessUser = {
  id: "u-1",
  role: "user",
  planId: "free",
  featureGrants: [],
};

describe("access control", () => {
  it("combines roles and plans instead of relying on one user role", () => {
    const trainerOnFreePlan: AppAccessUser = {
      ...baseUser,
      role: "trainer",
      planId: "free",
    };

    expect(hasFeature(trainerOnFreePlan, "assign_training_plan")).toBe(true);
    expect(hasFeature(trainerOnFreePlan, "view_dashboard")).toBe(true);
  });

  it("keeps hidden Garmin capability unavailable to ordinary users", () => {
    const userWithGrant: AppAccessUser = {
      ...baseUser,
      featureGrants: [
        { userId: "u-1", feature: "garmin_connect", enabled: true },
      ],
    };

    expect(hasFeature(userWithGrant, "garmin_connect")).toBe(true);
    expect(canAccess(userWithGrant, "garmin_connect")).toBe(false);
  });

  it("gives dev role and developer plan full hidden access", () => {
    expect(canAccess({ ...baseUser, role: "dev" }, "garmin_connect")).toBe(true);
    expect(canAccess({ ...baseUser, planId: "developer" }, "hidden_dev_panel")).toBe(true);
  });

  it("allows active trainer-client management relationships only", () => {
    expect(canManageClient("trainer", "client", [
      { trainerId: "trainer", clientId: "client", status: "active", assignedAt: "2026-05-01T00:00:00.000Z" },
    ])).toBe(true);
    expect(canManageClient("trainer", "client", [
      { trainerId: "trainer", clientId: "client", status: "ended", assignedAt: "2026-05-01T00:00:00.000Z" },
    ])).toBe(false);
  });

  it("allows organization owners, managers and explicit manage permission", () => {
    expect(canManageOrganization("owner", "org", [
      { organizationId: "org", userId: "owner", role: "owner", active: true, permissions: [], joinedAt: "2026-05-01T00:00:00.000Z" },
    ])).toBe(true);
    expect(canManageOrganization("trainer", "org", [
      { organizationId: "org", userId: "trainer", role: "trainer", active: true, permissions: ["manage_organization"], joinedAt: "2026-05-01T00:00:00.000Z" },
    ])).toBe(true);
    expect(canManageOrganization("client", "org", [
      { organizationId: "org", userId: "client", role: "client", active: true, permissions: [], joinedAt: "2026-05-01T00:00:00.000Z" },
    ])).toBe(false);
  });
});
