"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { useDictionary } from "@/hooks/use-dictionary";
import { profileSettingsSchema } from "@/lib/profile/schema";
import { useProfileStore } from "@/store";
import type { UserProfile } from "@/types";

import { SectionCard } from "./section-card";

const schema = profileSettingsSchema.pick({
  currentWeightKg: true,
  targetWeightKg: true,
});

type FormValues = {
  currentWeightKg?: number;
  targetWeightKg?: number;
};

export function WeightGoalSection({ profile }: { profile: UserProfile }) {
  const t = useDictionary();
  const update = useProfileStore((s) => s.update);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentWeightKg: profile.currentWeightKg ?? undefined,
      targetWeightKg: profile.targetWeightKg ?? undefined,
    },
  });

  useEffect(() => {
    form.reset({
      currentWeightKg: profile.currentWeightKg ?? undefined,
      targetWeightKg: profile.targetWeightKg ?? undefined,
    });
  }, [profile.currentWeightKg, profile.targetWeightKg, form]);

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
      title={t.settings.weightGoalSection.title}
      description={t.settings.weightGoalSection.description}
      footer={
        <Button onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? t.settings.saving : t.settings.saveCta}
        </Button>
      }
    >
      <FormField
        label={t.onboarding.currentWeight}
        htmlFor="currentWeightKg"
        description={t.settings.weightGoalSection.currentWeightHint}
      >
        <Input
          id="currentWeightKg"
          type="number"
          step="0.1"
          {...form.register("currentWeightKg", { valueAsNumber: true })}
        />
      </FormField>

      <FormField label={t.onboarding.targetWeight} htmlFor="targetWeightKg">
        <Input
          id="targetWeightKg"
          type="number"
          step="0.1"
          {...form.register("targetWeightKg", {
            setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
          })}
        />
      </FormField>
    </SectionCard>
  );
}
