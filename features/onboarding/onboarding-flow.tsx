"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useDictionary } from "@/hooks/use-dictionary";
import {
  EQUIPMENT_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  GENDER_OPTIONS,
  TRAINING_DAYS_OPTIONS,
  TRAINING_GOAL_OPTIONS,
  WORKOUT_DURATION_OPTIONS,
  WORKOUT_TYPE_OPTIONS,
} from "@/lib/profile/options";
import { onboardingSchema, type OnboardingInput } from "@/lib/profile/schema";
import { useProfileStore } from "@/store";

import { ChipMultiSelect } from "./components/chip-multi-select";
import { OnboardingProgress } from "./components/onboarding-progress";
import { OptionCard } from "./components/option-card";
import { Segmented } from "./components/segmented";

const STEPS = ["welcome", "basics", "weightGoal", "experience", "schedule"] as const;
type StepKey = (typeof STEPS)[number];

const FIELDS_BY_STEP: Record<StepKey, (keyof OnboardingInput)[]> = {
  welcome: [],
  basics: ["gender", "birthDate", "heightCm", "unitsWeight", "unitsLength"],
  weightGoal: ["currentWeightKg", "targetWeightKg", "trainingGoal"],
  experience: [
    "experienceLevel",
    "availableEquipment",
    "preferredWorkoutTypes",
  ],
  schedule: ["trainingDaysPerWeek", "preferredWorkoutDurationMin"],
};

export function OnboardingFlow() {
  const t = useDictionary();
  const router = useRouter();
  const update = useProfileStore((s) => s.update);
  const markComplete = useProfileStore((s) => s.markOnboardingComplete);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    mode: "onTouched",
    defaultValues: {
      gender: undefined,
      birthDate: "",
      heightCm: undefined,
      currentWeightKg: undefined,
      targetWeightKg: undefined,
      trainingGoal: undefined,
      experienceLevel: undefined,
      availableEquipment: [],
      trainingDaysPerWeek: undefined,
      preferredWorkoutDurationMin: 60,
      preferredWorkoutTypes: [],
      unitsWeight: "kg",
      unitsLength: "cm",
    },
  });

  const step = STEPS[stepIndex];

  const goNext = async () => {
    const fields = FIELDS_BY_STEP[step];
    if (fields.length > 0) {
      const ok = await form.trigger(fields);
      if (!ok) return;
    }
    setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
  };

  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const finish = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const saved = await update({
        gender: values.gender,
        birthDate: values.birthDate,
        heightCm: values.heightCm,
        currentWeightKg: values.currentWeightKg,
        targetWeightKg: values.targetWeightKg ?? null,
        trainingGoal: values.trainingGoal,
        experienceLevel: values.experienceLevel,
        availableEquipment: values.availableEquipment,
        trainingDaysPerWeek: values.trainingDaysPerWeek,
        preferredWorkoutDurationMin: values.preferredWorkoutDurationMin,
        preferredWorkoutTypes: values.preferredWorkoutTypes,
        unitsWeight: values.unitsWeight,
        unitsLength: values.unitsLength,
      });
      if (!saved) {
        const storeError = useProfileStore.getState().error;
        toast.error(storeError ?? t.onboarding.error);
        return;
      }
      const done = await markComplete();
      if (!done) {
        const storeError = useProfileStore.getState().error;
        toast.error(storeError ?? t.onboarding.error);
        return;
      }
      toast.success(t.onboarding.completed);
      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  });

  const stepLabel = (() => {
    switch (step) {
      case "basics":
        return t.onboarding.stepBasics;
      case "weightGoal":
        return t.onboarding.stepWeightGoal;
      case "experience":
        return t.onboarding.stepExperience;
      case "schedule":
        return t.onboarding.stepSchedule;
      default:
        return "";
    }
  })();

  const errors = form.formState.errors;
  const errorMessage = (key: keyof OnboardingInput): string | undefined => {
    const msg = errors[key]?.message;
    if (typeof msg !== "string") return undefined;
    const map = t.onboarding.validation;
    if (msg in map) return map[msg as keyof typeof map];
    return msg;
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="space-y-3">
        {step !== "welcome" ? (
          <OnboardingProgress
            current={stepIndex - 1}
            total={STEPS.length - 1}
            label={t.onboarding.stepOf
              .replace("{current}", String(stepIndex))
              .replace("{total}", String(STEPS.length - 1))}
          />
        ) : null}
        {step !== "welcome" ? (
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {stepLabel}
          </h1>
        ) : null}
      </header>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {step === "welcome" ? (
          <div className="space-y-3 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight">
              {t.onboarding.welcomeTitle}
            </h1>
            <p className="text-muted-foreground">{t.onboarding.welcomeSub}</p>
          </div>
        ) : null}

        {step === "basics" ? (
          <div className="space-y-5">
            <FormField label={t.onboarding.gender} error={errorMessage("gender")} required>
              <Controller
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {GENDER_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        icon={opt.icon}
                        selected={field.value === opt.value}
                        onSelect={() => field.onChange(opt.value)}
                      />
                    ))}
                  </div>
                )}
              />
            </FormField>

            <FormField
              label={t.onboarding.birthDate}
              htmlFor="birthDate"
              error={errorMessage("birthDate")}
              required
            >
              <Input
                id="birthDate"
                type="date"
                {...form.register("birthDate")}
                aria-invalid={Boolean(errors.birthDate)}
              />
            </FormField>

            <FormField
              label={t.onboarding.height}
              htmlFor="heightCm"
              error={errorMessage("heightCm")}
              required
            >
              <Input
                id="heightCm"
                type="number"
                step="0.5"
                min={80}
                max={260}
                placeholder="180"
                {...form.register("heightCm", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.heightCm)}
              />
            </FormField>

            <FormField label={t.onboarding.units}>
              <Controller
                control={form.control}
                name="unitsWeight"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-2">
                    <OptionCard
                      label={t.onboarding.metric}
                      selected={field.value === "kg"}
                      onSelect={() => {
                        field.onChange("kg");
                        form.setValue("unitsLength", "cm");
                      }}
                    />
                    <OptionCard
                      label={t.onboarding.imperial}
                      selected={field.value === "lbs"}
                      onSelect={() => {
                        field.onChange("lbs");
                        form.setValue("unitsLength", "in");
                      }}
                    />
                  </div>
                )}
              />
            </FormField>
          </div>
        ) : null}

        {step === "weightGoal" ? (
          <div className="space-y-5">
            <FormField
              label={t.onboarding.currentWeight}
              htmlFor="currentWeightKg"
              error={errorMessage("currentWeightKg")}
              required
            >
              <Input
                id="currentWeightKg"
                type="number"
                step="0.1"
                min={25}
                max={400}
                placeholder="78.5"
                {...form.register("currentWeightKg", { valueAsNumber: true })}
                aria-invalid={Boolean(errors.currentWeightKg)}
              />
            </FormField>

            <FormField
              label={t.onboarding.targetWeight}
              htmlFor="targetWeightKg"
              error={errorMessage("targetWeightKg")}
            >
              <Input
                id="targetWeightKg"
                type="number"
                step="0.1"
                min={25}
                max={400}
                placeholder="75"
                {...form.register("targetWeightKg", {
                  setValueAs: (v) =>
                    v === "" || v == null ? undefined : Number(v),
                })}
                aria-invalid={Boolean(errors.targetWeightKg)}
              />
            </FormField>

            <FormField
              label={t.onboarding.trainingGoal}
              error={errorMessage("trainingGoal")}
              required
            >
              <Controller
                control={form.control}
                name="trainingGoal"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {TRAINING_GOAL_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        icon={opt.icon}
                        selected={field.value === opt.value}
                        onSelect={() => field.onChange(opt.value)}
                      />
                    ))}
                  </div>
                )}
              />
            </FormField>
          </div>
        ) : null}

        {step === "experience" ? (
          <div className="space-y-5">
            <FormField
              label={t.onboarding.experienceLevel}
              error={errorMessage("experienceLevel")}
              required
            >
              <Controller
                control={form.control}
                name="experienceLevel"
                render={({ field }) => (
                  <div className="grid grid-cols-1 gap-2">
                    {EXPERIENCE_LEVEL_OPTIONS.map((opt) => (
                      <OptionCard
                        key={opt.value}
                        label={opt.label}
                        description={opt.description}
                        selected={field.value === opt.value}
                        onSelect={() => field.onChange(opt.value)}
                      />
                    ))}
                  </div>
                )}
              />
            </FormField>

            <FormField
              label={t.onboarding.availableEquipment}
              description={t.onboarding.availableEquipmentDesc}
              error={errorMessage("availableEquipment")}
              required
            >
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

            <FormField
              label={t.onboarding.workoutTypes}
              description={t.onboarding.workoutTypesDesc}
              error={errorMessage("preferredWorkoutTypes")}
              required
            >
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
          </div>
        ) : null}

        {step === "schedule" ? (
          <div className="space-y-5">
            <FormField
              label={t.onboarding.trainingDays}
              error={errorMessage("trainingDaysPerWeek")}
              required
            >
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

            <FormField
              label={t.onboarding.workoutDuration}
              error={errorMessage("preferredWorkoutDurationMin")}
              required
            >
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
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          {step !== "welcome" ? (
            <Button type="button" variant="ghost" onClick={goBack} disabled={submitting}>
              {t.onboarding.back}
            </Button>
          ) : (
            <span />
          )}

          {step !== STEPS[STEPS.length - 1] ? (
            <Button type="button" onClick={goNext} disabled={submitting}>
              {step === "welcome" ? t.onboarding.start : t.onboarding.next}
            </Button>
          ) : (
            <Button type="button" onClick={() => void finish()} disabled={submitting}>
              {submitting ? t.onboarding.saving : t.onboarding.finish}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
