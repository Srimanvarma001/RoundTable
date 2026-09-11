import { z } from "zod";
import { StructuredOutputError } from "./types";

export const ProposeSchema = z.object({
  proposals: z
    .array(
      z.object({
        title: z.string().max(80),
        description: z.string(),
        rationale: z.string(),
        feasibility_weeks: z.number().int().optional(),
      }),
    )
    .min(1)
    .max(2),
});

export const DebateSchema = z.object({
  critiques: z.array(
    z.object({
      target_title: z.string(),
      stance: z.enum(["support", "attack", "extend"]),
      comment: z.string().max(2000),
    }),
  ).min(1).max(3),
});

export const RefineSchema = z.object({
  refined: z
    .object({
      title: z.string().max(80),
      description: z.string(),
      rationale: z.string(),
      merges_proposal_titles: z.array(z.string()).default([]),
    })
    .nullable(),
});

export const VoteSchema = z.object({
  votes: z.array(
    z.object({
      proposal_title: z.string(),
      score: z.number().int().min(1).max(10),
      comment: z.string(),
    }),
  ),
});

export const RevealSchema = z.object({
  title: z.string(),
  description: z.string(),
  why_it_won: z.string(),
  first_steps: z.array(z.string()).min(1).max(6),
  risks: z.array(z.string()).min(1).max(6),
});

export const ProfileExtractSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum([
          "skill",
          "project",
          "taste",
          "experience",
          "constraint",
          "goal",
          "anti_pattern",
        ]),
        label: z.string().max(60),
        detail: z.string(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(12),
});

/** Extract first balanced JSON object from text (handles prose/fences), validate with zod. */
export function extractJson<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) throw new StructuredOutputError(text);
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else {
      if (c === '"') inStr = true;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          const slice = cleaned.slice(start, i + 1);
          const parsed = JSON.parse(slice);
          return schema.parse(parsed);
        }
      }
    }
  }
  throw new StructuredOutputError(text);
}

/** Parse with exactly one repair retry (caller supplies repair fn). */
export async function parseWithRepair<T>(
  text: string,
  schema: z.ZodType<T>,
  repair: (raw: string) => Promise<string>,
): Promise<T> {
  try {
    return extractJson(text, schema);
  } catch {
    const fixed = await repair(text);
    try {
      return extractJson(fixed, schema);
    } catch {
      throw new StructuredOutputError(text);
    }
  }
}
