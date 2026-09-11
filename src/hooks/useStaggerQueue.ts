"use client";
import { useCallback, useRef, useState } from "react";

/** Release buffered deltas on a cadence in order_index order; HWM accelerates. */
export function useStaggerQueue(cadenceMs = 45, highWater = 4000) {
  const buffers = useRef(new Map<string, string>());
  const [, tick] = useState(0);
  const push = useCallback((seatId: string, text: string) => {
    buffers.current.set(seatId, (buffers.current.get(seatId) ?? "") + text);
    tick((x) => x + 1);
  }, []);
  const drain = useCallback(() => {
    const out: Array<{ seatId: string; text: string }> = [];
    for (const [k, v] of buffers.current) {
      if (!v) continue;
      const big = v.length > highWater;
      const slice = big ? v : cadenceMs === 0 ? v : v.slice(0, 200);
      out.push({ seatId: k, text: slice });
      buffers.current.set(k, v.slice(slice.length));
    }
    return out;
  }, [cadenceMs, highWater]);
  const flush = useCallback(() => {
    const out: Array<{ seatId: string; text: string }> = [];
    for (const [k, v] of buffers.current) {
      if (v) out.push({ seatId: k, text: v });
      buffers.current.delete(k);
    }
    return out;
  }, []);
  return { push, drain, flush };
}
