"use client";

import { Flame, Sparkles, ThumbsUp, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { MotivationMessage } from "@/lib/stats-utils";
import { cn } from "@/lib/utils";

const TONE_ICON = {
  success: Sparkles,
  info: TrendingUp,
  warning: Flame,
  neutral: ThumbsUp,
} as const;

const TONE_RING = {
  success: "ring-success/40",
  info: "ring-primary/40",
  warning: "ring-warning/40",
  neutral: "ring-border",
} as const;

const TONE_ICON_BG = {
  success: "bg-success/15 text-success",
  info: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function MotivationalBanner({
  message,
}: {
  message: MotivationMessage;
}) {
  const Icon = TONE_ICON[message.tone];

  return (
    <Card className={cn("ring-2", TONE_RING[message.tone])}>
      <CardContent className="flex items-start gap-4 py-1">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            TONE_ICON_BG[message.tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base font-semibold leading-tight">
            {message.title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{message.body}</p>
        </div>
      </CardContent>
    </Card>
  );
}
