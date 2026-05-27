"use client";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeader } from "@/components/shared/section-header";
import { AccountCard } from "@/features/auth/account-card";
import { useDictionary } from "@/hooks/use-dictionary";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useProfileStore } from "@/store";

import { PreferencesSection } from "./components/preferences-section";
import { ProfileSection } from "./components/profile-section";
import { TrainingSection } from "./components/training-section";
import { WeightGoalSection } from "./components/weight-goal-section";

export function SettingsView() {
  const t = useDictionary();
  const profile = useProfileStore((s) => s.profile);
  const hydrated = useProfileStore((s) => s.hydrated);
  const supabaseReady = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <SectionHeader title={t.settings.title} />

      {!supabaseReady ? (
        <p className="rounded-md border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground">
          {t.settings.notConfigured}
        </p>
      ) : null}

      {supabaseReady && !hydrated ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : null}

      {supabaseReady && hydrated && profile ? (
        <Tabs defaultValue="profile">
          <TabsList className="flex w-full flex-wrap gap-1">
            <TabsTrigger value="profile">{t.settings.tabs.profile}</TabsTrigger>
            <TabsTrigger value="training">{t.settings.tabs.training}</TabsTrigger>
            <TabsTrigger value="weightGoal">
              {t.settings.tabs.weightGoal}
            </TabsTrigger>
            <TabsTrigger value="preferences">
              {t.settings.tabs.preferences}
            </TabsTrigger>
            <TabsTrigger value="account">{t.settings.tabs.account}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <ProfileSection profile={profile} />
          </TabsContent>
          <TabsContent value="training">
            <TrainingSection profile={profile} />
          </TabsContent>
          <TabsContent value="weightGoal">
            <WeightGoalSection profile={profile} />
          </TabsContent>
          <TabsContent value="preferences">
            <PreferencesSection profile={profile} />
          </TabsContent>
          <TabsContent value="account">
            <AccountCard />
          </TabsContent>
        </Tabs>
      ) : null}

      {/* Local-only mode still shows the account card placeholder */}
      {!supabaseReady ? <AccountCard /> : null}
    </div>
  );
}
