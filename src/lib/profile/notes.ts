import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function sourceHash(parts: string[]): string {
  return createHash("sha256").update(parts.join("\n")).digest("hex");
}

export function readTasteNotes(): string {
  const p = path.join(process.cwd(), "data", "notes", "taste.md");
  if (!fs.existsSync(p)) return "";
  return fs.readFileSync(p, "utf8");
}

export function writeTasteNotes(md: string): void {
  const p = path.join(process.cwd(), "data", "notes", "taste.md");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, md);
}

export interface RawSource {
  github?: string;
  cv?: string;
  localScan?: string;
  notes?: string;
}

export function hashSources(raw: RawSource): string {
  return sourceHash([raw.github ?? "", raw.cv ?? "", raw.localScan ?? "", raw.notes ?? ""]);
}
