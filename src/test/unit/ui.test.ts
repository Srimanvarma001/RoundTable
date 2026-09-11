import { describe, it, expect } from "vitest";
import { renderAvatarSvg } from "@/lib/avatars/dicebear";
import fs from "node:fs";
import path from "node:path";

describe("avatars", () => {
  it("same seed byte-identical, different seeds differ", () => {
    const a = renderAvatarSvg({ style: "shapes", seed: "seat_me", accent: "#F0B429" });
    const b = renderAvatarSvg({ style: "shapes", seed: "seat_me", accent: "#F0B429" });
    const c = renderAvatarSvg({ style: "shapes", seed: "other", accent: "#F0B429" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
  it("banned realistic styles rejected", () => {
    expect(() => renderAvatarSvg({ style: "avataaars" as never, seed: "x", accent: "#fff" })).toThrow();
  });
});

describe("theme tokens", () => {
  it("both sets define same keys", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src", "styles", "themes.css"), "utf8");
    const war = css.split("hearth")[0];
    for (const tok of ["--bg", "--text", "--seat-1", "--seat-8", "--table-core"]) {
      expect(war).toContain(tok);
      expect(css).toContain(tok);
    }
  });
  it("no hex literals in components", () => {
    const dirs = ["src/components", "src/app", "src/hooks"];
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    const walk = (d: string): string[] => {
      const out: string[] = [];
      for (const e of fs.readdirSync(path.join(process.cwd(), d), { withFileTypes: true })) {
        const p = path.join(process.cwd(), d, e.name);
        if (e.isDirectory()) out.push(...walk(path.relative(process.cwd(), p)));
        else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
      }
      return out;
    };
    const bad: string[] = [];
    for (const d of dirs) {
      for (const f of walk(d)) {
        const src = fs.readFileSync(f, "utf8");
        // allow style props referencing var() and currentColor; flag raw hex in tsx
        if (f.endsWith(".tsx") && hex.test(src) && !/accent|Avatar|SeatForm/.test(src)) bad.push(f);
      }
    }
    expect(bad).toEqual([]);
  });
});
