"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Award, Camera, GitCompareArrows, Medal, Star, Trophy } from "lucide-react";

import { useDictionary } from "@/hooks/use-dictionary";
import {
  buildPhotoMilestones,
  type MilestoneKind,
} from "@/lib/progress-photos/streak-utils";
import { cn } from "@/lib/utils";
import type { ProgressPhotoRecord } from "@/types";

const ICONS: Record<MilestoneKind, typeof Star> = {
  first: Camera,
  count5: Star,
  count10: Medal,
  count25: Award,
  count50: Trophy,
  firstComparison: GitCompareArrows,
};

interface MilestoneBadgesProps {
  records: ProgressPhotoRecord[];
}

export function MilestoneBadges({ records }: MilestoneBadgesProps) {
  const t = useDictionary();
  const reduceMotion = useReducedMotion();
  const achieved = useMemo(() => buildPhotoMilestones(records), [records]);

  if (achieved.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-semibold tracking-tight">
        {t.progressPhotos.milestones.title}
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {achieved.map((m, i) => {
          const Icon = ICONS[m.kind];
          return (
            <motion.div
              key={m.kind}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.05, duration: 0.25 }}
              className={cn(
                "flex items-center gap-2.5 rounded-xl bg-card p-3 ring-1 ring-primary/20",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-4" />
              </span>
              <span className="min-w-0 truncate text-sm font-medium">
                {t.progressPhotos.milestones[m.kind]}
              </span>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
