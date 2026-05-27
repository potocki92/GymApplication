"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDictionary } from "@/hooks/use-dictionary";
import { PROGRESS_POSES, type ProgressPose } from "@/types";

interface PoseTabsProps {
  value: ProgressPose;
  onChange: (next: ProgressPose) => void;
}

export function PoseTabs({ value, onChange }: PoseTabsProps) {
  const t = useDictionary();
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as ProgressPose)}
      className="w-full"
    >
      <TabsList className="w-full">
        {PROGRESS_POSES.map((pose) => (
          <TabsTrigger key={pose} value={pose}>
            {t.progressPhotos.poses[pose]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
