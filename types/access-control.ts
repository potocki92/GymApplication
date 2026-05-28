export type UserRole = "user" | "trainer" | "gym_owner" | "admin" | "dev";

export type SubscriptionPlanId =
  | "free"
  | "basic"
  | "pro"
  | "premium"
  | "trainer"
  | "gym"
  | "developer";

export type FeatureKey =
  | "view_dashboard"
  | "manage_own_profile"
  | "create_own_training_plan"
  | "track_workouts"
  | "view_basic_history"
  | "view_progress_history"
  | "view_advanced_stats"
  | "use_ai_recommendations"
  | "export_data"
  | "create_training_plan"
  | "assign_training_plan"
  | "view_client_workouts"
  | "view_client_progress"
  | "send_client_recommendations"
  | "manage_organization"
  | "manage_trainers"
  | "manage_gym_clients"
  | "view_organization_reports"
  | "manage_system"
  | "garmin_connect"
  | "experimental_features"
  | "hidden_dev_panel";

export type FeatureCategory =
  | "core"
  | "progress"
  | "ai"
  | "trainer"
  | "organization"
  | "admin"
  | "integration"
  | "experimental";

export type FeatureVisibility = "public" | "hidden";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  category: FeatureCategory;
  visibility: FeatureVisibility;
  experimental?: boolean;
  /** Hidden features are normally dev-only. Set this to true for hand-picked beta grants. */
  allowDirectGrantWhenHidden?: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlanId;
  label: string;
  description: string;
  features: FeatureKey[];
  maxTrainingPlans: number | null;
  maxClients: number | null;
  maxTrainers: number | null;
}

export interface UserFeatureGrant {
  userId: string;
  feature: FeatureKey;
  enabled: boolean;
  reason?: string;
  expiresAt?: string | null;
}

export interface AppAccessUser {
  id: string;
  email?: string | null;
  role: UserRole;
  planId: SubscriptionPlanId;
  featureGrants?: UserFeatureGrant[];
}

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
}

export type TrainerClientStatus = "active" | "paused" | "ended";

export interface TrainerClientRecord {
  trainerId: string;
  clientId: string;
  status: TrainerClientStatus;
  assignedAt: string;
  organizationId?: string | null;
}

export type OrganizationMemberRole = "owner" | "manager" | "trainer" | "client";

export interface OrganizationRecord {
  id: string;
  name: string;
  ownerId: string;
  planId: SubscriptionPlanId;
  createdAt: string;
}

export interface OrganizationMemberRecord {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  active: boolean;
  permissions: FeatureKey[];
  joinedAt: string;
}

export type TrainingPlanStatus = "draft" | "published" | "archived";

export interface TrainingPlanRecord {
  id: string;
  ownerId: string;
  organizationId?: string | null;
  title: string;
  description?: string | null;
  status: TrainingPlanStatus;
  featureScope: FeatureKey[];
  createdAt: string;
  updatedAt: string;
}

export type AssignedTrainingPlanStatus = "active" | "paused" | "completed" | "canceled";

export interface AssignedTrainingPlanRecord {
  id: string;
  trainingPlanId: string;
  clientId: string;
  assignedBy: string;
  organizationId?: string | null;
  status: AssignedTrainingPlanStatus;
  startsAt: string;
  endsAt?: string | null;
}

export interface WorkoutResultRecord {
  id: string;
  userId: string;
  assignedTrainingPlanId?: string | null;
  workoutId?: string | null;
  completedAt: string;
  durationMin: number;
  volumeKg: number;
  notes?: string | null;
}
