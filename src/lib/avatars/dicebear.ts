import { createAvatar } from "@dicebear/core";
import { shapes, rings, glass } from "@dicebear/collection";

const STYLES = { shapes, rings, glass } as const;
export type DiceStyle = keyof typeof STYLES;
const BANNED = ["avataaars", "personas", "notionists", "adventurer"];

/** Abstract generative SVG only — photographic/human styles are banned. */
export function renderAvatarSvg(opts: {
  style: DiceStyle;
  seed: string;
  accent: string;
}): string {
  if ((BANNED as string[]).includes(opts.style)) {
    throw new Error(`Banned avatar style: ${opts.style}`);
  }
  return createAvatar(STYLES[opts.style] as never, {
    seed: opts.seed,
    size: 128,
    backgroundColor: [],
    shape1Color: [opts.accent.replace("#", "")],
    shape3Color: [opts.accent.replace("#", "")],
  } as never).toString();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
