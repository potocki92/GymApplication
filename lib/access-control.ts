import {
  FEATURES_BY_KEY,
  ORGANIZATION_MEMBERS,
  PLANS_BY_ID,
  ROLE_FEATURES,
  TRAINER_CLIENTS,
} from "@/data";
import type {
  AppAccessUser,
  FeatureKey,
  OrganizationMemberRecord,
  PlanDefinition,
  TrainerClientRecord,
  UserFeatureGrant,
} from "@/types";

export const DEFAULT_ROLE: AppAccessUser["role"] = "user";
export const DEFAULT_PLAN_ID: AppAccessUser["planId"] = "free";

export function createDefaultAccessUser(
  id: string,
  email: string | null = null,
): AppAccessUser {
  return {
    id,
    email,
    role: DEFAULT_ROLE,
    planId: DEFAULT_PLAN_ID,
    featureGrants: [],
  };
}

export function hasFullAccess(user: AppAccessUser): boolean {
  return user.role === "dev" || user.planId === "developer";
}

function isGrantActive(grant: UserFeatureGrant, now = new Date()): boolean {
  if (!grant.expiresAt) return true;
  const expiry = new Date(grant.expiresAt);
  return !Number.isNaN(expiry.getTime()) && expiry > now;
}

function getPlan(user: AppAccessUser): PlanDefinition {
  return PLANS_BY_ID[user.planId] ?? PLANS_BY_ID[DEFAULT_PLAN_ID];
}

function getGrant(
  user: AppAccessUser,
  feature: FeatureKey,
): UserFeatureGrant | undefined {
  return user.featureGrants?.find(
    (grant) => grant.feature === feature && isGrantActive(grant),
  );
}

/**
 * Checks the capability graph only: full-access role/plan, explicit user grant,
 * role capabilities, then plan capabilities. UI/API visibility rules are applied
 * by `canAccess` so backends can reason about the raw grant separately when needed.
 */
export function hasFeature(user: AppAccessUser, feature: FeatureKey): boolean {
  if (hasFullAccess(user)) return true;

  const directGrant = getGrant(user, feature);
  if (directGrant) return directGrant.enabled;

  const roleFeatures: readonly FeatureKey[] = ROLE_FEATURES[user.role] ?? [];
  if (roleFeatures.includes(feature)) return true;

  return getPlan(user).features.includes(feature);
}

/**
 * Access decision used by UI gates and API routes. Hidden/experimental features
 * stay unavailable to ordinary users even if a public plan is expanded later;
 * only `dev` role or `developer` plan receives them by default. A hidden feature
 * can opt into beta grants via `allowDirectGrantWhenHidden`.
 */
export function canAccess(user: AppAccessUser, feature: FeatureKey): boolean {
  if (!hasFeature(user, feature)) return false;
  if (hasFullAccess(user)) return true;

  const definition = FEATURES_BY_KEY[feature];
  if (!definition) return false;
  if (definition.visibility !== "hidden") return true;

  const directGrant = getGrant(user, feature);
  return Boolean(definition.allowDirectGrantWhenHidden && directGrant?.enabled);
}

export function canManageClient(
  trainerId: string,
  clientId: string,
  trainerClients: readonly TrainerClientRecord[] = TRAINER_CLIENTS,
): boolean {
  return trainerClients.some(
    (record) =>
      record.trainerId === trainerId &&
      record.clientId === clientId &&
      record.status === "active",
  );
}

export function canManageOrganization(
  userId: string,
  organizationId: string,
  members: readonly OrganizationMemberRecord[] = ORGANIZATION_MEMBERS,
): boolean {
  return members.some(
    (member) =>
      member.userId === userId &&
      member.organizationId === organizationId &&
      member.active &&
      (member.role === "owner" ||
        member.role === "manager" ||
        member.permissions.includes("manage_organization")),
  );
}
