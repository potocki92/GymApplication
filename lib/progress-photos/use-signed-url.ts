"use client";

import { useEffect, useState } from "react";

import { getSignedPhotoUrl } from "@/lib/supabase-progress-photos";

/**
 * Signed URLs live for 1h on Supabase's side; we cache them for 50min so they
 * never expire mid-render. The cache is shared across components and the
 * in-flight promises are deduplicated so N thumbnails for the same path = 1
 * network round-trip.
 */
const SIGNED_URL_TTL_MS = 50 * 60 * 1000;

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function readCache(path: string): string | null {
  const entry = cache.get(path);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(path);
    return null;
  }
  return entry.url;
}

async function fetchUrl(path: string): Promise<string | null> {
  const cached = readCache(path);
  if (cached) return cached;

  const existing = inflight.get(path);
  if (existing) return existing;

  const p = (async () => {
    const url = await getSignedPhotoUrl(path);
    if (url) {
      cache.set(path, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
    }
    return url;
  })().finally(() => {
    inflight.delete(path);
  });
  inflight.set(path, p);
  return p;
}

/**
 * Returns a signed-storage URL for `path`. Derived from the module cache, so
 * we never call setState synchronously inside an effect — the effect only
 * triggers a fetch and writes the resolved value to the cache, then bumps a
 * tick to re-derive.
 */
export function useSignedUrl(path: string | null): {
  url: string | null;
  loading: boolean;
} {
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    if (readCache(path)) return;
    let cancelled = false;
    void fetchUrl(path).then(() => {
      if (cancelled) return;
      setTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const url = path ? readCache(path) : null;
  const loading = path != null && url == null;
  return { url, loading };
}

/** Manually clears the signed-URL cache — used on sign-out. */
export function clearSignedUrlCache(): void {
  cache.clear();
  inflight.clear();
}
