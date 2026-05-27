"use client";

import { useEffect, useMemo } from "react";

interface PhotoPreviewProps {
  file: File | null;
}

/**
 * Local preview rendered from a Blob URL — no server round-trip, no upload yet.
 * The URL is revoked on cleanup so we don't leak object URLs as the user picks
 * different files.
 */
export function PhotoPreview({ file }: PhotoPreviewProps) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  if (!url) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="preview"
        className="max-h-[40vh] w-full object-contain"
      />
    </div>
  );
}
