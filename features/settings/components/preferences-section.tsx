"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/shared/form-field";
import { useDictionary } from "@/hooks/use-dictionary";
import { useProfileStore } from "@/store";
import type {
  ThemePreference,
  UnitsLength,
  UnitsWeight,
  UserProfile,
} from "@/types";

import { SectionCard } from "./section-card";
import { ThemeToggle } from "./theme-toggle";

interface PrefValues {
  unitsWeight: UnitsWeight;
  unitsLength: UnitsLength;
  themePreference: ThemePreference;
  notificationsEnabled: boolean;
  notificationsWorkoutReminders: boolean;
  notificationsProgressUpdates: boolean;
}

export function PreferencesSection({ profile }: { profile: UserProfile }) {
  const t = useDictionary();
  const update = useProfileStore((s) => s.update);
  const [values, setValues] = useState<PrefValues>({
    unitsWeight: profile.unitsWeight,
    unitsLength: profile.unitsLength,
    themePreference: profile.themePreference,
    notificationsEnabled: profile.notificationsEnabled,
    notificationsWorkoutReminders: profile.notificationsWorkoutReminders,
    notificationsProgressUpdates: profile.notificationsProgressUpdates,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const saved = await update(values);
      if (saved) toast.success(t.settings.saved);
      else toast.error(t.settings.saveFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SectionCard
      title={t.settings.preferencesSection.title}
      description={t.settings.preferencesSection.description}
      footer={
        <Button onClick={() => void handleSave()} disabled={submitting}>
          {submitting ? t.settings.saving : t.settings.saveCta}
        </Button>
      }
    >
      <FormField label={t.onboarding.units}>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={values.unitsWeight}
            onValueChange={(v) =>
              setValues((s) => ({ ...s, unitsWeight: v as UnitsWeight }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="lbs">lbs</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={values.unitsLength}
            onValueChange={(v) =>
              setValues((s) => ({ ...s, unitsLength: v as UnitsLength }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cm">cm</SelectItem>
              <SelectItem value="in">in</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </FormField>

      <FormField label={t.settings.preferencesSection.themeLabel}>
        <ThemeToggle
          value={values.themePreference}
          onChange={(v) => setValues((s) => ({ ...s, themePreference: v }))}
        />
      </FormField>

      <FormField label={t.settings.preferencesSection.notificationsLabel}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t.settings.preferencesSection.notificationsAll}
            </span>
            <Switch
              checked={values.notificationsEnabled}
              onCheckedChange={(v) =>
                setValues((s) => ({ ...s, notificationsEnabled: v }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t.settings.preferencesSection.notificationsReminders}
            </span>
            <Switch
              checked={values.notificationsWorkoutReminders}
              onCheckedChange={(v) =>
                setValues((s) => ({ ...s, notificationsWorkoutReminders: v }))
              }
              disabled={!values.notificationsEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              {t.settings.preferencesSection.notificationsProgress}
            </span>
            <Switch
              checked={values.notificationsProgressUpdates}
              onCheckedChange={(v) =>
                setValues((s) => ({ ...s, notificationsProgressUpdates: v }))
              }
              disabled={!values.notificationsEnabled}
            />
          </div>
        </div>
      </FormField>
    </SectionCard>
  );
}
