"use client";

import type { ComponentType, SVGProps } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

interface OptionCardProps {
  label: string;
  description?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  selected: boolean;
  onSelect: () => void;
  multi?: boolean;
}

export function OptionCard({
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
  multi = false,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all",
        "hover:border-primary/60 hover:bg-card/80",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border",
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md border bg-background text-foreground transition-colors",
            selected ? "border-primary/60 text-primary" : "border-border",
          )}
        >
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{label}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {selected ? (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      ) : null}
    </button>
  );
}
