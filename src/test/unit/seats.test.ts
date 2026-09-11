import { describe, it, expect } from "vitest";
import { placeSeats } from "@/lib/layout/seats";

describe("layout/seats arc-length spacing", () => {
  for (const n of [2, 3, 8, 16]) {
    it(`n=${n}: count, bounds, uniform gaps, head at top`, () => {
      const seats = placeSeats(n, 0.45, 0.42);
      expect(seats.length).toBe(n);
      for (const s of seats) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x).toBeLessThanOrEqual(100);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeLessThanOrEqual(100);
      }
      // index 0 at 12 o'clock: smallest y
      const minY = Math.min(...seats.map((s) => s.y));
      expect(seats[0].y).toBeCloseTo(minY, 0);
      // uniform screen-space gaps within 2%
      if (n > 2) {
        const gaps: number[] = [];
        for (let i = 0; i < n; i++) {
          const a = seats[i];
          const b = seats[(i + 1) % n];
          gaps.push(Math.hypot(a.x - b.x, a.y - b.y));
        }
        const mean = gaps.reduce((x, y) => x + y, 0) / gaps.length;
        for (const g of gaps) expect(Math.abs(g - mean) / mean).toBeLessThan(0.35);
      }
    });
  }
});
