"use client";

import { useEffect, useRef, useState } from "react";

export type CameraFacing = "user" | "environment";
export type CameraError =
  | "permissionDenied"
  | "noCamera"
  | "unsupported"
  | "generic";

function mapError(err: unknown): CameraError {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      return "permissionDenied";
    }
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      return "noCamera";
    }
  }
  return "generic";
}

/**
 * getUserMedia plumbing for the in-app camera: starts the stream while
 * `active`, attaches it to `videoRef`, stops every track on flip/close/unmount.
 */
export function useCameraStream(active: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>("user");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const start = async () => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setError("unsupported");
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
          });
        } catch (err) {
          // Desktops often lack an "environment" camera — retry unconstrained
          // before declaring failure.
          if (err instanceof DOMException && err.name === "OverconstrainedError") {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } else {
            throw err;
          }
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setReady(true);
      } catch (err) {
        if (!cancelled) setError(mapError(err));
      }
    };

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      // Reset for the next run (flip/reopen) — initial state is already false/null.
      setReady(false);
      setError(null);
    };
  }, [active, facing]);

  const flip = () =>
    setFacing((f) => (f === "user" ? "environment" : "user"));

  return { videoRef, facing, flip, ready, error };
}
