"use client";
import { useEffect } from "react";

/** Polling fallback when SSE unavailable: GET /api/runs/:id once per 3s. */
export function useRunPolling(runId: string | null, onSnap: (s: unknown) => void, enabled: boolean) {
  useEffect(() => {
    if (!runId || !enabled) return;
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/runs/${runId}`);
        if (r.ok) onSnap(await r.json());
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(t);
  }, [runId, enabled, onSnap]);
}
