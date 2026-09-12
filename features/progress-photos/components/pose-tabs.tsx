"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { useDictionary } from "@/hooks/use-dictionary";
import { PROGRESS_POSES, type ProgressPose } from "@/types";

interface PoseTabsProps {
  value: ProgressPose;
  onChange: (next: ProgressPose) => void;
}

export function PoseTabs({ value, onChange }: PoseTabsProps) {
  const t = useDictionary();

  return (
    <SegmentedControl
      value={value}
      onValueChange={onChange}
      aria-label={t.progressPhotos.poseLabel}
      size="sm"
      options={PROGRESS_POSES.map((pose) => ({
        value: pose,
        label: t.progressPhotos.poses[pose],
      }))}
    />
  );
}
