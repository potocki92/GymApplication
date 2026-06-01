"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/hooks/use-dictionary";
import { WEEKDAY_ORDER, WORKOUT_TYPE_OPTIONS } from "@/lib/constants";
import { useWorkoutDraftStore } from "@/store";
import type { Weekday, WorkoutType } from "@/types";

export function WorkoutForm() {
  const t = useDictionary();
  const name = useWorkoutDraftStore((s) => s.name);
  const type = useWorkoutDraftStore((s) => s.type);
  const weekday = useWorkoutDraftStore((s) => s.weekday);
  const setName = useWorkoutDraftStore((s) => s.setName);
  const setType = useWorkoutDraftStore((s) => s.setType);
  const setWeekday = useWorkoutDraftStore((s) => s.setWeekday);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="workout-name">{t.workoutForm.nameLabel}</Label>
        <Input
          id="workout-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.workoutForm.namePlaceholder}
          className="h-11 sm:h-10"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout-type">{t.workoutForm.typeLabel}</Label>
        <Select value={type} onValueChange={(v) => setType(v as WorkoutType)}>
          <SelectTrigger id="workout-type" className="h-11 w-full sm:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORKOUT_TYPE_OPTIONS.map((wt) => (
              <SelectItem key={wt} value={wt}>
                {t.workoutForm.types[wt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="workout-day">{t.workoutForm.dayLabel}</Label>
        <Select value={weekday} onValueChange={(v) => setWeekday(v as Weekday)}>
          <SelectTrigger id="workout-day" className="h-11 w-full sm:h-10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEEKDAY_ORDER.map((wd) => (
              <SelectItem key={wd} value={wd}>
                {t.weekdays.full[wd]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
