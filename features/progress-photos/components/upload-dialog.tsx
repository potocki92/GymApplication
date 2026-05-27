"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  progressPhotoDraftSchema,
  validateUploadFile,
} from "@/lib/progress-photos/schema";
import { useProgressPhotosStore } from "@/store";
import { PROGRESS_POSES, type ProgressPose } from "@/types";

import { PhotoDropzone } from "./photo-dropzone";
import { PhotoPreview } from "./photo-preview";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPose?: ProgressPose;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseWeight(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const n = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function UploadDialog({ open, onOpenChange, defaultPose }: UploadDialogProps) {
  const t = useDictionary();
  const add = useProgressPhotosStore((s) => s.add);
  const uploading = useProgressPhotosStore((s) => s.uploading);

  const defaultDate = useMemo(() => todayISO(), []);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [pose, setPose] = useState<ProgressPose>(defaultPose ?? "front");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setDate(defaultDate);
    setPose(defaultPose ?? "front");
    setWeight("");
    setNotes("");
    setFieldError(null);
  };

  const handleFile = (next: File) => {
    const validity = validateUploadFile(next);
    if (!validity.ok) {
      const key = validity.code as keyof typeof t.progressPhotos.errors;
      toast.error(t.progressPhotos.errors[key] ?? t.progressPhotos.errors.generic);
      return;
    }
    setFile(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (!file) {
      toast.error(t.progressPhotos.errors.mime);
      return;
    }

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

    try {
      await add(parsed.data, file);
      toast.success(t.progressPhotos.card.saved);
      reset();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error && err.message === "authRequired"
          ? t.progressPhotos.errors.authRequired
          : err instanceof Error && err.message
            ? `${t.progressPhotos.errors.uploadFailed} (${err.message})`
            : t.progressPhotos.errors.uploadFailed;
      toast.error(message);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <DialogTitle>{t.progressPhotos.upload.title}</DialogTitle>
            <DialogDescription>{t.progressPhotos.upload.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <PhotoDropzone onFile={handleFile} disabled={uploading} hasFile={!!file} />
            {file ? <PhotoPreview file={file} /> : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pp-date">{t.progressPhotos.fields.date}</Label>
                <Input
                  id="pp-date"
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pp-pose">{t.progressPhotos.fields.pose}</Label>
                <Select value={pose} onValueChange={(v) => setPose(v as ProgressPose)}>
                  <SelectTrigger id="pp-pose">
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
              <Label htmlFor="pp-weight">{t.progressPhotos.fields.weight}</Label>
              <Input
                id="pp-weight"
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
              <Label htmlFor="pp-notes">{t.progressPhotos.fields.notes}</Label>
              <Input
                id="pp-notes"
                value={notes}
                maxLength={500}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {fieldError ? (
              <p className="text-xs text-destructive">{fieldError}</p>
            ) : null}
            <p className="text-[11px] text-muted-foreground">
              {t.progressPhotos.upload.tips}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={!file || uploading}>
              {uploading
                ? t.progressPhotos.upload.uploading
                : t.progressPhotos.upload.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
