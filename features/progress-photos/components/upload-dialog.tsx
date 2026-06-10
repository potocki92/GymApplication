"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetBody,
  BottomSheetFooter,
} from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/hooks/use-dictionary";
import { nearestMetricOnOrBefore } from "@/lib/metrics-utils";
import { parseWeight } from "@/lib/progress-photos/meta-edit";
import {
  progressPhotoDraftSchema,
  validateUploadFile,
} from "@/lib/progress-photos/schema";
import {
  selectPhotosByPose,
  useMetricsStore,
  useProgressPhotosStore,
} from "@/store";
import { PROGRESS_POSES, type ProgressPose } from "@/types";

import { CameraCapture } from "./camera-capture";
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

// SSR-safe getUserMedia detection: false on the server, the real answer after
// hydration. The value never changes at runtime, so no subscription is needed.
const noopSubscribe = () => () => {};
function useCameraSupported(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );
}

export function UploadDialog({ open, onOpenChange, defaultPose }: UploadDialogProps) {
  const t = useDictionary();
  const add = useProgressPhotosStore((s) => s.add);
  const records = useProgressPhotosStore((s) => s.records);
  const uploading = useProgressPhotosStore((s) => s.uploading);
  const uploadPhase = useProgressPhotosStore((s) => s.uploadPhase);
  const uploadProgress = useProgressPhotosStore((s) => s.uploadProgress);

  const phaseLabel =
    uploadPhase === "compressing"
      ? t.progressPhotos.upload.processing
      : uploadPhase === "saving"
        ? t.progressPhotos.upload.saving
        : t.progressPhotos.upload.uploading;

  const defaultDate = useMemo(() => todayISO(), []);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [pose, setPose] = useState<ProgressPose>(defaultPose ?? "front");
  const [weight, setWeight] = useState("");
  const [weightTouched, setWeightTouched] = useState(false);
  const [weightAutofilled, setWeightAutofilled] = useState(false);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraSupported = useCameraSupported();

  // Latest photo of the selected pose — the camera alignment ghost.
  const ghostRecord = useMemo(
    () => selectPhotosByPose(records, pose)[0] ?? null,
    [records, pose],
  );

  const metricRecords = useMetricsStore((s) => s.records);

  // Prefill the weight from the body-metric log (nearest entry up to 3 days
  // back) until the user types their own value.
  const autofillWeight = (forDate: string) => {
    if (weightTouched) return;
    const found = nearestMetricOnOrBefore(metricRecords, forDate, 3);
    if (found) {
      setWeight(found.weightKg.toFixed(1));
      setWeightAutofilled(true);
    } else if (weightAutofilled) {
      setWeight("");
      setWeightAutofilled(false);
    }
  };

  // Render-time adjustment: seed the autofill once per dialog opening.
  const [prevOpen, setPrevOpen] = useState(false);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open && !weightTouched && weight === "") {
      const found = nearestMetricOnOrBefore(metricRecords, date, 3);
      if (found) {
        setWeight(found.weightKg.toFixed(1));
        setWeightAutofilled(true);
      }
    }
  }

  const reset = () => {
    setFile(null);
    setDate(defaultDate);
    setPose(defaultPose ?? "front");
    setWeight("");
    setWeightTouched(false);
    setWeightAutofilled(false);
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
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(10);
      }
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
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t.progressPhotos.upload.title}
      description={t.progressPhotos.upload.description}
      dismissOnDrag={!uploading}
    >
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <BottomSheetBody className="grid gap-3">
          <PhotoDropzone
            onFile={handleFile}
            disabled={uploading}
            hasFile={!!file}
            onOpenCamera={cameraSupported ? () => setCameraOpen(true) : undefined}
          />
          {file ? <PhotoPreview file={file} /> : null}

          <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="pp-date">{t.progressPhotos.fields.date}</Label>
              <Input
                id="pp-date"
                type="date"
                value={date}
                max={todayISO()}
                onChange={(e) => {
                  setDate(e.target.value);
                  autofillWeight(e.target.value);
                }}
                required
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="pp-pose">{t.progressPhotos.fields.pose}</Label>
              <Select value={pose} onValueChange={(v) => setPose(v as ProgressPose)}>
                <SelectTrigger id="pp-pose" className="w-full min-w-0">
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
              onChange={(e) => {
                setWeight(e.target.value);
                setWeightTouched(true);
                setWeightAutofilled(false);
              }}
            />
            {weightAutofilled ? (
              <p className="text-[11px] text-muted-foreground">
                {t.progressPhotos.fields.weightAutofilled}
              </p>
            ) : null}
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
        </BottomSheetBody>

        <BottomSheetFooter>
          {uploading ? (
            <div className="flex w-full flex-col gap-1.5 sm:mr-auto sm:max-w-[14rem]">
              <Progress
                value={uploadProgress}
                aria-label={t.progressPhotos.upload.progressLabel}
              />
              <p className="text-[11px] text-muted-foreground">{phaseLabel}</p>
            </div>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {t.common.cancel}
          </Button>
          <Button type="submit" disabled={!file || uploading}>
            {uploading ? phaseLabel : t.progressPhotos.upload.submit}
          </Button>
        </BottomSheetFooter>
      </form>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        ghostRecord={ghostRecord}
        onCapture={handleFile}
      />
    </BottomSheet>
  );
}
