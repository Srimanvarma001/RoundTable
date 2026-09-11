import type { StepName } from "@/shared/constants";

export function TableSurface({ step }: { step: StepName }) {
  void step;
  return (
    <svg viewBox="0 0 1000 620" className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="surface" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="var(--table-core)" />
          <stop offset="70%" stopColor="var(--table-mid)" />
          <stop offset="100%" stopColor="var(--table-edge)" />
        </radialGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--rim-hi)" stopOpacity="0.50" />
          <stop offset="45%" stopColor="var(--rim-hi)" stopOpacity="0.05" />
          <stop offset="100%" stopColor="var(--rim-lo)" stopOpacity="0.32" />
        </linearGradient>
        <radialGradient id="pool" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="var(--table-pool)" stopOpacity="0.42" />
          <stop offset="100%" stopColor="var(--table-pool)" stopOpacity="0" />
        </radialGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <ellipse cx="500" cy="336" rx="432" ry="256" fill="var(--table-shadow)" filter="url(#soft)" />
      <ellipse cx="500" cy="310" rx="432" ry="256" fill="url(#rim)" />
      <ellipse cx="500" cy="310" rx="414" ry="241" fill="url(#surface)" />
      <ellipse cx="500" cy="300" rx="300" ry="168" fill="url(#pool)" />
      <ellipse cx="500" cy="310" rx="378" ry="218" fill="none" stroke="var(--table-ring)" strokeWidth="1" opacity="0.35" />
      <ellipse cx="500" cy="310" rx="392" ry="228" fill="none" stroke="var(--table-ring)" strokeWidth="0.5" opacity="0.18" />
    </svg>
  );
}
