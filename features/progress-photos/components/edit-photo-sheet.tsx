"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet";
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
import { buildMetaPatch, parseWeight } from "@/lib/progress-photos/meta-edit";
import { progressPhotoDraftSchema } from "@/lib/progress-photos/schema";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAuthStore, useProgressPhotosStore } from "@/store";
import {
  PROGRESS_POSES,
  type ProgressPhotoRecord,
  type ProgressPose,
} from "@/types";

interface EditPhotoSheetProps {
  record: ProgressPhotoRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save with the patch that was applied. */
  onSaved?: (poseChanged: boolean) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EditPhotoSheet({
  record,
  open,
  onOpenChange,
  onSaved,
}: EditPhotoSheetProps) {
  const t = useDictionary();
  const update = useProgressPhotosStore((s) => s.update);

  const [date, setDate] = useState("");
  const [pose, setPose] = useState<ProgressPose>("front");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Re-seed the form whenever a record is (re)opened — render-time state
  // adjustment instead of an effect, so there is no stale-frame flash.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (!open && seededFor !== null) {
    setSeededFor(null);
  } else if (open && record && seededFor !== record.id) {
    setSeededFor(record.id);
    setDate(record.takenAt);
    setPose(record.pose);
    setWeight(record.weightKg != null ? String(record.weightKg) : "");
    setNotes(record.notes ?? "");
    setFieldError(null);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setFieldError(null);

    const parsed = progressPhotoDraftSchema.safeParse({
      takenAt: date,
      pose,
      weightKg: parseWeight(weight),
      notes: notes.trim() === "" ? null : notes.trim(),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const code = issue?.message ?? "generic";
      const errs = t.progressPhotos.errors;
      const map: Record<string, string> = {
        format: errs.dateOutOfRange,
        outOfRange: errs.dateOutOfRange,
        weightRange: errs.weightRange,
        notesTooLong: errs.notesTooLong,
      };
      setFieldError(map[code] ?? errs.generic);
      return;
    }

    const patch = buildMetaPatch(record, parsed.data);
    if (Object.keys(patch).length === 0) {
      onOpenChange(false);
      return;
    }

    // store.update is a silent no-op without an authenticated user — surface it.
    if (!isSupabaseConfigured() || !useAuthStore.getState().user) {
      toast.error(t.progressPhotos.errors.authRequired);
      return;
    }

    setSaving(true);
    try {
      await update(record.id, patch);
      toast.success(t.progressPhotos.edit.saved);
      onOpenChange(false);
      onSaved?.(patch.pose !== undefined);
    } catch {
      toast.error(t.progressPhotos.errors.generic);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t.progressPhotos.edit.title}
      description={t.progressPhotos.edit.description}
      dismissOnDrag={!saving}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <BottomSheetBody className="grid gap-3">
          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="pp-edit-date">{t.progressPhotos.fields.date}</Label>
              <Input
                id="pp-edit-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="pp-edit-pose">{t.progressPhotos.fields.pose}</Label>
              <Select value={pose} onValueChange={(v) => setPose(v as ProgressPose)}>
                <SelectTrigger id="pp-edit-pose" className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_POSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t.progressPhotos.poses[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pp-edit-weight">{t.progressPhotos.fields.weight}</Label>
            <Input
              id="pp-edit-weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="400"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pp-edit-notes">{t.progressPhotos.fields.notes}</Label>
            <Input
              id="pp-edit-notes"
              value={notes}
              maxLength={500}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {fieldError ? (
            <p className="text-xs text-destructive">{fieldError}</p>
          ) : null}
        </BottomSheetBody>

        <BottomSheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={saving}>
            {t.progressPhotos.edit.submit}
          </Button>
        </BottomSheetFooter>
      </form>
    </BottomSheet>
  );
}
