"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/hooks/use-dictionary";
import type { ThemePreference } from "@/types";

interface ThemeToggleProps {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
}

/**
 * Two-way binding: stored preference (server) <-> next-themes runtime.
 * When the stored value changes we push it into next-themes; user clicks update
 * both the local select state (via onChange) and the runtime theme.
 */
export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const t = useDictionary();
  const { setTheme, theme } = useTheme();

  useEffect(() => {
    if (value && theme !== value) {
      setTheme(value);
    }
  }, [value, theme, setTheme]);

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const next = v as ThemePreference;
        onChange(next);
        setTheme(next);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="dark">{t.settings.preferencesSection.themeDark}</SelectItem>
        <SelectItem value="light">{t.settings.preferencesSection.themeLight}</SelectItem>
        <SelectItem value="system">
          {t.settings.preferencesSection.themeSystem}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
