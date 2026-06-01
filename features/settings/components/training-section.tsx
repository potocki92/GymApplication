"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useDictionary } from "@/hooks/use-dictionary";
import { ChipMultiSelect } from "@/features/onboarding/components/chip-multi-select";
import { Segmented } from "@/features/onboarding/components/segmented";
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  TRAINING_GOAL_OPTIONS,
  WORKOUT_DURATION_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "@/lib/profile/options";
import { profileSettingsSchema } from "@/lib/profile/schema";
import { useProfileStore } from "@/store";
import type {
  Equipment,
  ExperienceLevel,
  PreferredWorkoutType,
  TrainingGoalKey,
  UserProfile,
} from "@/types";

import { SectionCard } from "./section-card";

const schema = profileSettingsSchema.pick({
  trainingGoal: true,
  experienceLevel: true,
  trainingDaysPerWeek: true,
  preferredWorkoutDurationMin: true,
  preferredWorkoutTypes: true,
  availableEquipment: true,
  programStartDate: true,
  programWeeks: true,
});

type FormValues = {
  trainingGoal?: TrainingGoalKey;
  experienceLevel?: ExperienceLevel;
  trainingDaysPerWeek?: number;
  preferredWorkoutDurationMin?: number;
  preferredWorkoutTypes?: PreferredWorkoutType[];
  availableEquipment?: Equipment[];
  programStartDate?: string;
  programWeeks?: number;
};

export function TrainingSection({ profile }: { profile: UserProfile }) {
  const t = useDictionary();
  const update = useProfileStore((s) => s.update);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      trainingGoal: profile.trainingGoal ?? undefined,
      experienceLevel: profile.experienceLevel ?? undefined,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? undefined,
      preferredWorkoutDurationMin: profile.preferredWorkoutDurationMin ?? undefined,
      preferredWorkoutTypes: profile.preferredWorkoutTypes,
      availableEquipment: profile.availableEquipment,
      programStartDate: profile.programStartDate ?? undefined,
      programWeeks: profile.programWeeks ?? undefined,
    },
  });

  useEffect(() => {
    form.reset({
      trainingGoal: profile.trainingGoal ?? undefined,
      experienceLevel: profile.experienceLevel ?? undefined,
      trainingDaysPerWeek: profile.trainingDaysPerWeek ?? undefined,
      preferredWorkoutDurationMin: profile.preferredWorkoutDurationMin ?? undefined,
      preferredWorkoutTypes: profile.preferredWorkoutTypes,
      availableEquipment: profile.availableEquipment,
      programStartDate: profile.programStartDate ?? undefined,
      programWeeks: profile.programWeeks ?? undefined,
    });
  }, [profile, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const saved = await update(values);
      if (saved) toast.success(t.settings.saved);
      else toast.error(t.settings.saveFailed);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SectionCard
      title={t.settings.trainingSection.title}
      description={t.settings.trainingSection.description}
      footer={
        <Button onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? t.settings.saving : t.settings.saveCta}
        </Button>
      }
    >
      <FormField label={t.onboarding.trainingGoal}>
        <Controller
          control={form.control}
          name="trainingGoal"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {TRAINING_GOAL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label={t.onboarding.experienceLevel}>
        <Controller
          control={form.control}
          name="experienceLevel"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label={t.onboarding.trainingDays}>
        <Controller
          control={form.control}
          name="trainingDaysPerWeek"
          render={({ field }) => (
            <Segmented
              options={TRAINING_DAYS_OPTIONS}
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(Number(v))}
            />
          )}
        />
      </FormField>

      <FormField label={t.onboarding.workoutDuration}>
        <Controller
          control={form.control}
          name="preferredWorkoutDurationMin"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {WORKOUT_DURATION_OPTIONS.map((opt) => {
                const num = Number(opt.value);
                const selected = field.value === num;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => field.onChange(num)}
                    className={
                      selected
                        ? "h-10 rounded-md border border-primary bg-primary text-sm font-medium text-primary-foreground"
                        : "h-10 rounded-md border border-border bg-card text-sm font-medium text-foreground hover:bg-muted"
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t.onboarding.programStart} htmlFor="programStartDate">
          <Input
            id="programStartDate"
            type="date"
            {...form.register("programStartDate", {
              setValueAs: (v) => (v === "" || v == null ? undefined : String(v)),
            })}
          />
        </FormField>

        <FormField label={t.onboarding.programWeeks} htmlFor="programWeeks">
          <Input
            id="programWeeks"
            type="number"
            min={1}
            max={52}
            {...form.register("programWeeks", {
              setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
            })}
          />
        </FormField>
      </div>

      <FormField label={t.onboarding.workoutTypes}>
        <Controller
          control={form.control}
          name="preferredWorkoutTypes"
          render={({ field }) => (
            <ChipMultiSelect
              options={WORKOUT_TYPE_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>

      <FormField label={t.onboarding.availableEquipment}>
        <Controller
          control={form.control}
          name="availableEquipment"
          render={({ field }) => (
            <ChipMultiSelect
              options={EQUIPMENT_OPTIONS}
              value={field.value ?? []}
              onChange={field.onChange}
            />
          )}
        />
      </FormField>
    </SectionCard>
  );
}
