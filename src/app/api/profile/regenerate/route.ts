import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { config } from "@/lib/config";

const Body = z.object({ sources: z.array(z.string()).default(["github", "notes"]) });

export async function POST(req: Request) {
  const { sources } = Body.parse(await req.json());
  const base = new URL(req.url);
  const diffs = [];
  for (const s of sources) {
    const r = await fetch(new URL("/api/profile/ingest", base), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: s }),
    });
    diffs.push({ source: s, ...(await r.json()) });
  }
  void getDb;
  void profiles;
  void eq;
  void config;
  return NextResponse.json({ diff: diffs });
}
