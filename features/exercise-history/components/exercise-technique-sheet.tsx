"use client";

import { useEffect, useId, type ReactNode } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { AlertTriangle, ArrowRight, Dumbbell, Lightbulb, X } from "lucide-react";

import { ExerciseIcon } from "@/components/shared/exercise-icon";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import type { Exercise, ExerciseTechniqueStep } from "@/types";

interface ExerciseTechniqueSheetProps {
  exercise: Exercise;
  isOpen: boolean;
  onClose: () => void;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|ogg)$/i.test(url);
}

function TechniquePreview({ exercise }: { exercise: Exercise }) {
  const t = useDictionary();
  const frames = exercise.animationFrames?.length
    ? exercise.animationFrames
    : exercise.animationUrl
      ? [exercise.animationUrl]
      : exercise.image
        ? [exercise.image]
        : [];
  const startFrame = frames[0];
  const endFrame = frames[frames.length - 1] ?? startFrame;

  return (
    <section className="space-y-3" aria-labelledby="technique-preview-title">
      <p
        id="technique-preview-title"
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {t.exercises.detail.techniqueSheet.preview}
      </p>
      <div className="overflow-hidden rounded-2xl bg-background ring-1 ring-foreground/10">
        {exercise.animationUrl && isVideo(exercise.animationUrl) ? (
          <video
            src={exercise.animationUrl}
            className="aspect-video w-full bg-muted object-contain"
            autoPlay
            muted
            loop
            playsInline
            poster={exercise.image}
            aria-label={exercise.name}
          />
        ) : startFrame ? (
          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 p-3">
            <MovementFrame
              label={t.exercises.detail.techniqueSheet.start}
              src={startFrame}
              exercise={exercise}
            />
            <div className="flex items-center justify-center text-primary">
              <ArrowRight className="size-5" aria-hidden="true" />
            </div>
            <MovementFrame
              label={t.exercises.detail.techniqueSheet.end}
              src={endFrame}
              exercise={exercise}
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted/50 p-8">
            <ExerciseIcon
              muscleGroup={exercise.muscleGroup}
              category={exercise.category}
              name={exercise.name}
              className="size-24"
            />
          </div>
        )}
      </div>
    </section>
  );
}

function MovementFrame({
  label,
  src,
  exercise,
}: {
  label: string;
  src: string;
  exercise: Exercise;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-muted/50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${exercise.name} — ${label}`}
        className="aspect-[4/5] w-full object-cover"
        draggable={false}
      />
      <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[0.65rem] font-bold tracking-wide text-primary ring-1 ring-primary/30">
        {label}
      </span>
    </div>
  );
}

function useTechniqueSteps(exercise: Exercise): ExerciseTechniqueStep[] {
  const t = useDictionary();
  return (
    exercise.instructions ?? [
      {
        title: t.exercises.detail.techniqueSheet.stepTitles.start,
        description: t.exercises.detail.techniqueSheet.defaultSteps.start,
      },
      {
        title: t.exercises.detail.techniqueSheet.stepTitles.movement,
        description: t.exercises.detail.techniqueSheet.defaultSteps.movement,
      },
      {
        title: t.exercises.detail.techniqueSheet.stepTitles.return,
        description: t.exercises.detail.techniqueSheet.defaultSteps.return,
      },
      {
        title: t.exercises.detail.techniqueSheet.stepTitles.breathing,
        description: t.exercises.detail.techniqueSheet.defaultSteps.breathing,
      },
    ]
  );
}

export function ExerciseTechniqueSheet({
  exercise,
  isOpen,
  onClose,
}: ExerciseTechniqueSheetProps) {
  const t = useDictionary();
  const titleId = useId();
  const dragControls = useDragControls();
  const steps = useTechniqueSteps(exercise);
  const primaryMuscles =
    exercise.muscles?.primary ?? [t.muscleGroups[exercise.muscleGroup]];
  const secondaryMuscles =
    exercise.muscles?.secondary ??
    exercise.secondaryMuscles?.map((muscle) => t.muscleGroups[muscle]) ??
    [t.exercises.detail.techniqueSheet.stabilizers];
  const tips = exercise.tips ?? t.exercises.detail.techniqueSheet.defaultTips;
  const mistakes =
    exercise.mistakes ?? t.exercises.detail.techniqueSheet.defaultMistakes;

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-end bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[88dvh] w-full overflow-hidden rounded-t-3xl border border-border bg-background text-foreground shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 360 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 96 || info.velocity.y > 700) onClose();
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="cursor-grab touch-none px-4 pt-3 active:cursor-grabbing"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 id={titleId} className="font-heading text-lg font-bold">
                {t.exercises.detail.techniqueSheet.title}
              </h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                aria-label={t.exercises.detail.techniqueSheet.close}
              >
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>

            <div className="max-h-[calc(88dvh-5.5rem)] space-y-5 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-4 overscroll-contain">
              <TechniquePreview exercise={exercise} />

              <section className="space-y-3" aria-labelledby="technique-steps-title">
                <h3
                  id="technique-steps-title"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t.exercises.detail.techniqueSheet.steps}
                </h3>
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <article
                      key={`${step.title}-${index}`}
                      className="rounded-2xl bg-card p-3 ring-1 ring-foreground/10"
                    >
                      <div className="flex gap-3">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25">
                          {index + 1}
                        </span>
                        <div className="min-w-0 space-y-1">
                          <h4 className="font-heading text-sm font-semibold">
                            {step.title}
                          </h4>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="space-y-3" aria-labelledby="technique-muscles-title">
                <h3
                  id="technique-muscles-title"
                  className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {t.exercises.detail.techniqueSheet.muscles}
                </h3>
                <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="mb-4 flex items-center justify-center rounded-2xl bg-primary/10 py-5 text-primary ring-1 ring-primary/20">
                    <Dumbbell className="size-12" aria-hidden="true" />
                  </div>
                  <MuscleList
                    title={t.exercises.detail.techniqueSheet.primaryMuscles}
                    items={primaryMuscles}
                    highlighted
                  />
                  {secondaryMuscles.length > 0 ? (
                    <MuscleList
                      title={t.exercises.detail.techniqueSheet.secondaryMuscles}
                      items={secondaryMuscles}
                    />
                  ) : null}
                </div>
              </section>

              <InfoListCard
                icon={<Lightbulb className="size-4" aria-hidden="true" />}
                title={t.exercises.detail.techniqueSheet.tips}
                items={tips}
              />

              <InfoListCard
                icon={<AlertTriangle className="size-4" aria-hidden="true" />}
                title={t.exercises.detail.techniqueSheet.mistakes}
                items={mistakes}
                warning
              />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function MuscleList({
  title,
  items,
  highlighted = false,
}: {
  title: string;
  items: readonly string[];
  highlighted?: boolean;
}) {
  return (
    <div className="space-y-2 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-xs font-medium text-muted-foreground">{title}:</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={
              highlighted
                ? "rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/25"
                : "rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-foreground/10"
            }
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function InfoListCard({
  icon,
  title,
  items,
  warning = false,
}: {
  icon: ReactNode;
  title: string;
  items: readonly string[];
  warning?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="mb-3 flex items-center gap-2">
        <span
          className={
            warning
              ? "flex size-8 items-center justify-center rounded-full bg-destructive/10 text-destructive"
              : "flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"
          }
        >
          {icon}
        </span>
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
      </div>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="flex gap-2 leading-6">
            <span
              className={
                warning
                  ? "mt-2 size-1.5 shrink-0 rounded-full bg-destructive"
                  : "mt-2 size-1.5 shrink-0 rounded-full bg-primary"
              }
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
