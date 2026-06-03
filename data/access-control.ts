import type {
  AppAccessUser,
  AssignedTrainingPlanRecord,
  FeatureDefinition,
  FeatureKey,
  OrganizationMemberRecord,
  OrganizationRecord,
  PlanDefinition,
  SubscriptionRecord,
  TrainerClientRecord,
  TrainingPlanRecord,
  WorkoutResultRecord,
} from "@/types";

const USER_CORE_FEATURES = [
  "view_dashboard",
  "manage_own_profile",
  "create_own_training_plan",
  "track_workouts",
] as const satisfies readonly FeatureKey[];

const BASIC_FEATURES = [
  ...USER_CORE_FEATURES,
  "view_basic_history",
  "view_progress_history",
] as const satisfies readonly FeatureKey[];

const PRO_FEATURES = [
  ...BASIC_FEATURES,
  "view_advanced_stats",
  "use_ai_recommendations",
  "export_data",
] as const satisfies readonly FeatureKey[];

const TRAINER_FEATURES = [
  ...PRO_FEATURES,
  "create_training_plan",
  "assign_training_plan",
  "view_client_workouts",
  "view_client_progress",
  "send_client_recommendations",
] as const satisfies readonly FeatureKey[];

const GYM_FEATURES = [
  ...TRAINER_FEATURES,
  "manage_organization",
  "manage_trainers",
  "manage_gym_clients",
  "view_organization_reports",
] as const satisfies readonly FeatureKey[];

export const FEATURES = [
  { key: "view_dashboard", label: "Panel", description: "Dostęp do panelu startowego.", category: "core", visibility: "public" },
  { key: "manage_own_profile", label: "Profil", description: "Edycja własnego profilu i preferencji.", category: "core", visibility: "public" },
  { key: "create_own_training_plan", label: "Własny plan", description: "Tworzenie planów treningowych dla siebie.", category: "core", visibility: "public" },
  { key: "track_workouts", label: "Rejestrowanie treningów", description: "Zapisywanie wykonanych treningów i serii.", category: "core", visibility: "public" },
  { key: "view_basic_history", label: "Historia", description: "Podgląd podstawowej historii treningów.", category: "progress", visibility: "public" },
  { key: "view_progress_history", label: "Historia progresu", description: "Analiza dłuższej historii postępów.", category: "progress", visibility: "public" },
  { key: "view_advanced_stats", label: "Zaawansowane statystyki", description: "Rozszerzone wykresy, trendy i porównania.", category: "progress", visibility: "public" },
  { key: "use_ai_recommendations", label: "Rekomendacje AI", description: "Sugestie planów, progresji i regeneracji.", category: "ai", visibility: "public" },
  { key: "export_data", label: "Eksport danych", description: "Eksport historii i raportów treningowych.", category: "core", visibility: "public" },
  { key: "create_training_plan", label: "Tworzenie planów", description: "Tworzenie planów dla podopiecznych lub organizacji.", category: "trainer", visibility: "public" },
  { key: "assign_training_plan", label: "Przypisywanie planów", description: "Przypisywanie planów konkretnym klientom.", category: "trainer", visibility: "public" },
  { key: "view_client_workouts", label: "Treningi klientów", description: "Podgląd wykonanych treningów klientów.", category: "trainer", visibility: "public" },
  { key: "view_client_progress", label: "Progres klientów", description: "Analiza progresu podopiecznych.", category: "trainer", visibility: "public" },
  { key: "send_client_recommendations", label: "Notatki i rekomendacje", description: "Wysyłanie wiadomości, notatek i zaleceń klientom.", category: "trainer", visibility: "public" },
  { key: "manage_organization", label: "Organizacja", description: "Zarządzanie siłownią lub organizacją.", category: "organization", visibility: "public" },
  { key: "manage_trainers", label: "Trenerzy", description: "Dodawanie trenerów i zarządzanie ich uprawnieniami.", category: "organization", visibility: "public" },
  { key: "manage_gym_clients", label: "Klienci siłowni", description: "Przypisywanie klientów do trenerów.", category: "organization", visibility: "public" },
  { key: "view_organization_reports", label: "Raporty organizacji", description: "Podgląd aktywności trenerów i klientów.", category: "organization", visibility: "public" },
  { key: "manage_system", label: "Administracja systemem", description: "Operacje administracyjne platformy.", category: "admin", visibility: "public" },
  { key: "garmin_connect", label: "Garmin Connect", description: "Eksperymentalna integracja z Garmin Connect.", category: "integration", visibility: "hidden", experimental: true },
  { key: "apple_health_connect", label: "Apple Health", description: "Eksperymentalny import danych Apple Health przez iOS Skróty.", category: "integration", visibility: "hidden", experimental: true },
  { key: "experimental_features", label: "Eksperymenty", description: "Dostęp do funkcji ukrytych i eksperymentalnych.", category: "experimental", visibility: "hidden", experimental: true },
  { key: "hidden_dev_panel", label: "Panel developerski", description: "Wewnętrzne narzędzia diagnostyczne właścicieli aplikacji.", category: "experimental", visibility: "hidden", experimental: true },
] as const satisfies readonly FeatureDefinition[];

export const FEATURES_BY_KEY = Object.fromEntries(
  FEATURES.map((feature) => [feature.key, feature]),
) as Record<FeatureKey, FeatureDefinition>;

export const PLANS = [
  { id: "free", label: "Free", description: "Podstawowe funkcje dla użytkownika indywidualnego.", features: [...USER_CORE_FEATURES], maxTrainingPlans: 1, maxClients: 0, maxTrainers: 0 },
  { id: "basic", label: "Basic", description: "Więcej planów i historia postępów.", features: [...BASIC_FEATURES], maxTrainingPlans: 3, maxClients: 0, maxTrainers: 0 },
  { id: "pro", label: "Pro", description: "AI, statystyki i eksport danych.", features: [...PRO_FEATURES], maxTrainingPlans: 10, maxClients: 0, maxTrainers: 0 },
  { id: "premium", label: "Premium", description: "Pełny pakiet dla użytkownika indywidualnego.", features: [...PRO_FEATURES], maxTrainingPlans: null, maxClients: 0, maxTrainers: 0 },
  { id: "trainer", label: "Trainer", description: "Konto trenera do pracy z podopiecznymi.", features: [...TRAINER_FEATURES], maxTrainingPlans: null, maxClients: 50, maxTrainers: 0 },
  { id: "gym", label: "Gym", description: "Konto organizacji z trenerami, klientami i raportami.", features: [...GYM_FEATURES], maxTrainingPlans: null, maxClients: null, maxTrainers: null },
  { id: "developer", label: "Developer", description: "Wewnętrzny plan właścicieli aplikacji z pełnym dostępem.", features: [...GYM_FEATURES, "manage_system", "garmin_connect", "apple_health_connect", "experimental_features", "hidden_dev_panel"], maxTrainingPlans: null, maxClients: null, maxTrainers: null },
] as const satisfies readonly PlanDefinition[];

export const PLANS_BY_ID = Object.fromEntries(
  PLANS.map((plan) => [plan.id, plan]),
) as unknown as Record<PlanDefinition["id"], PlanDefinition>;

export const ROLE_FEATURES = {
  user: [] as FeatureKey[],
  trainer: ["create_training_plan", "assign_training_plan", "view_client_workouts", "view_client_progress", "send_client_recommendations"],
  gym_owner: ["manage_organization", "manage_trainers", "manage_gym_clients", "view_organization_reports"],
  admin: ["manage_system"],
  dev: ["experimental_features", "hidden_dev_panel", "garmin_connect", "apple_health_connect"],
} as const satisfies Record<AppAccessUser["role"], readonly FeatureKey[]>;

export const USERS = [
  { id: "user-free", email: "user@fitflow.test", role: "user", planId: "free" },
  { id: "trainer-anna", email: "anna.trener@fitflow.test", role: "trainer", planId: "trainer" },
  { id: "gym-owner", email: "owner@gym.test", role: "gym_owner", planId: "gym" },
  { id: "dev-owner", email: "dev@fitflow.test", role: "dev", planId: "developer" },
] as const satisfies readonly AppAccessUser[];

export const SUBSCRIPTIONS = [
  { id: "sub-user-free", userId: "user-free", planId: "free", status: "active", currentPeriodStart: "2026-05-01T00:00:00.000Z", currentPeriodEnd: null },
  { id: "sub-trainer", userId: "trainer-anna", planId: "trainer", status: "active", currentPeriodStart: "2026-05-01T00:00:00.000Z", currentPeriodEnd: null },
  { id: "sub-gym", userId: "gym-owner", planId: "gym", status: "active", currentPeriodStart: "2026-05-01T00:00:00.000Z", currentPeriodEnd: null },
  { id: "sub-dev", userId: "dev-owner", planId: "developer", status: "active", currentPeriodStart: "2026-05-01T00:00:00.000Z", currentPeriodEnd: null },
] as const satisfies readonly SubscriptionRecord[];

export const USER_FEATURES = [
  { userId: "dev-owner", feature: "garmin_connect", enabled: true, reason: "internal_owner" },
  { userId: "dev-owner", feature: "apple_health_connect", enabled: true, reason: "internal_owner" },
] as const;

export const TRAINER_CLIENTS = [
  { trainerId: "trainer-anna", clientId: "user-free", status: "active", assignedAt: "2026-05-10T10:00:00.000Z", organizationId: "org-fitflow-gym" },
] as const satisfies readonly TrainerClientRecord[];

export const ORGANIZATIONS = [
  { id: "org-fitflow-gym", name: "FitFlow Gym", ownerId: "gym-owner", planId: "gym", createdAt: "2026-05-01T00:00:00.000Z" },
] as const satisfies readonly OrganizationRecord[];

export const ORGANIZATION_MEMBERS = [
  { organizationId: "org-fitflow-gym", userId: "gym-owner", role: "owner", active: true, permissions: ["manage_organization", "manage_trainers", "manage_gym_clients", "view_organization_reports"], joinedAt: "2026-05-01T00:00:00.000Z" },
  { organizationId: "org-fitflow-gym", userId: "trainer-anna", role: "trainer", active: true, permissions: ["create_training_plan", "assign_training_plan", "view_client_progress"], joinedAt: "2026-05-02T00:00:00.000Z" },
  { organizationId: "org-fitflow-gym", userId: "user-free", role: "client", active: true, permissions: [], joinedAt: "2026-05-10T10:00:00.000Z" },
] as const satisfies readonly OrganizationMemberRecord[];

export const TRAINING_PLANS = [
  { id: "tp-strength-base", ownerId: "trainer-anna", organizationId: "org-fitflow-gym", title: "Baza siłowa", description: "Plan startowy dla podopiecznego.", status: "published", featureScope: ["create_training_plan", "assign_training_plan"], createdAt: "2026-05-11T08:00:00.000Z", updatedAt: "2026-05-11T08:00:00.000Z" },
] as const satisfies readonly TrainingPlanRecord[];

export const ASSIGNED_TRAINING_PLANS = [
  { id: "atp-user-free", trainingPlanId: "tp-strength-base", clientId: "user-free", assignedBy: "trainer-anna", organizationId: "org-fitflow-gym", status: "active", startsAt: "2026-05-12T00:00:00.000Z", endsAt: null },
] as const satisfies readonly AssignedTrainingPlanRecord[];

export const WORKOUT_RESULTS = [
  { id: "wr-user-free-1", userId: "user-free", assignedTrainingPlanId: "atp-user-free", workoutId: "workout-1", completedAt: "2026-05-13T18:30:00.000Z", durationMin: 55, volumeKg: 6200, notes: "Dobry zapas na ostatniej serii." },
] as const satisfies readonly WorkoutResultRecord[];
