import fs from "node:fs";

export async function extractCvText(filePath: string): Promise<string> {
  if (!fs.existsSync(filePath)) return "";
  if (filePath.endsWith(".pdf")) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdf = require("pdf-parse") as (b: Buffer) => Promise<{ text: string }>;
    const buf = fs.readFileSync(filePath);
    const out = await pdf(buf);
    return out.text.slice(0, 20000);
  }
  if (filePath.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const out = await mammoth.extractRawText({ path: filePath });
    return out.value.slice(0, 20000);
  }
  return fs.readFileSync(filePath, "utf8").slice(0, 20000);
}
