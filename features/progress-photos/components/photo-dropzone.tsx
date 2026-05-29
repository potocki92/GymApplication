"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDictionary } from "@/hooks/use-dictionary";
import { cn } from "@/lib/utils";

interface PhotoDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  hasFile?: boolean;
}

export function PhotoDropzone({ onFile, disabled, hasFile }: PhotoDropzoneProps) {
  const t = useDictionary();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const openPicker = () => {
    inputRef.current?.click();
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-border bg-card/40 p-5 text-center transition-colors",
        dragOver && "border-primary/60 bg-primary/5",
        disabled && "opacity-60 pointer-events-none",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
    >
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        // Do not set `capture`: on iOS Safari it can force the camera instead of
        // presenting the system picker with the photo library option.
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          // Reset so picking the same file twice still triggers onChange.
          e.target.value = "";
        }}
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-2">
        <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ImagePlus className="size-5" />
        </span>
        <Button type="button" variant="outline" size="sm" onClick={openPicker}>
          {hasFile ? t.progressPhotos.upload.replace : t.progressPhotos.upload.chooseFile}
        </Button>
        <p className="text-xs text-muted-foreground">{t.progressPhotos.upload.orDrag}</p>
      </div>
    </div>
  );
}
