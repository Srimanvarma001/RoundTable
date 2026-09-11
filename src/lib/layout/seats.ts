export interface SeatPlacement {
  /** Percentage of container width, 0 to 100. */
  x: number;
  /** Percentage of container height, 0 to 100. */
  y: number;
  /** Ellipse parameter in radians. Used to orient the seat's rim highlight. */
  t: number;
}

/** Arc length of the ellipse (a·cos t, b·sin t) from 0 to t, by Simpson's rule. */
export function arcLength(a: number, b: number, t: number, steps = 128): number {
  const dt = t / steps;
  const speed = (u: number) => Math.hypot(-a * Math.sin(u), b * Math.cos(u));
  let sum = 0;
  for (let i = 0; i < steps; i++) {
    const t0 = i * dt;
    const tm = t0 + dt / 2;
    const t1 = t0 + dt;
    sum += (dt / 6) * (speed(t0) + 4 * speed(tm) + speed(t1));
  }
  return sum;
}

/** Invert arc length: the parameter t at which the arc length equals target. */
export function tAtArcLength(a: number, b: number, target: number): number {
  let lo = 0;
  let hi = Math.PI * 2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (arcLength(a, b, mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Place n seats at equal arc-length spacing around an ellipse.
 * Index 0 is the Me Agent at 12 o'clock; rest proceed clockwise.
 */
export function placeSeats(n: number, radiusX: number, radiusY: number): SeatPlacement[] {
  if (n <= 0) return [];
  const total = arcLength(radiusX, radiusY, Math.PI * 2);
  const step = total / n;
  const head = total * 0.75; // t = 3π/2 is 12 o'clock when y grows downward
  return Array.from({ length: n }, (_, i) => {
    const target = (head + i * step) % total;
    const t = tAtArcLength(radiusX, radiusY, target);
    return {
      x: 50 + radiusX * 100 * Math.cos(t),
      y: 50 + radiusY * 100 * Math.sin(t),
      t,
    };
  });
}

export const RADIUS_X = 0.45;
export const RADIUS_Y = 0.42;
