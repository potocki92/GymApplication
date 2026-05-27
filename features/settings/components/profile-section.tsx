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
import { GENDER_OPTIONS } from "@/lib/profile/options";
import { profileSettingsSchema } from "@/lib/profile/schema";
import { useProfileStore } from "@/store";
import type { Gender, UserProfile } from "@/types";

import { SectionCard } from "./section-card";

const schema = profileSettingsSchema.pick({
  gender: true,
  birthDate: true,
  heightCm: true,
});

type FormValues = {
  gender?: Gender;
  birthDate?: string;
  heightCm?: number;
};

export function ProfileSection({ profile }: { profile: UserProfile }) {
  const t = useDictionary();
  const update = useProfileStore((s) => s.update);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: profile.gender ?? undefined,
      birthDate: profile.birthDate ?? undefined,
      heightCm: profile.heightCm ?? undefined,
    },
  });

  useEffect(() => {
    form.reset({
      gender: profile.gender ?? undefined,
      birthDate: profile.birthDate ?? undefined,
      heightCm: profile.heightCm ?? undefined,
    });
  }, [profile.gender, profile.birthDate, profile.heightCm, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const saved = await update({
        gender: values.gender,
        birthDate: values.birthDate,
        heightCm: values.heightCm,
      });
      if (saved) toast.success(t.settings.saved);
      else toast.error(t.settings.saveFailed);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <SectionCard
      title={t.settings.profileSection.title}
      description={t.settings.profileSection.description}
      footer={
        <Button onClick={() => void onSubmit()} disabled={submitting}>
          {submitting ? t.settings.saving : t.settings.saveCta}
        </Button>
      }
    >
      <FormField label={t.onboarding.gender}>
        <Controller
          control={form.control}
          name="gender"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FormField>

      <FormField label={t.onboarding.birthDate} htmlFor="birthDate">
        <Input
          id="birthDate"
          type="date"
          {...form.register("birthDate")}
        />
      </FormField>

      <FormField label={t.onboarding.height} htmlFor="heightCm">
        <Input
          id="heightCm"
          type="number"
          step="0.5"
          {...form.register("heightCm", { valueAsNumber: true })}
        />
      </FormField>
    </SectionCard>
  );
}
