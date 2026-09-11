import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import { config } from "@/lib/config";

export async function GET() {
  const db = getDb();
  const rows = await db.select().from(settings);
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; }
  }
  return NextResponse.json({
    settings: { theme: out.theme ?? "warroom", ...out },
    providers: { deepseek: !!config.deepseekApiKey, glm: !!config.glmApiKey, tavily: !!config.tavilyApiKey },
  });
}

export async function PUT(req: Request) {
  const db = getDb();
  const body = (await req.json()) as Record<string, unknown>;
  for (const [k, v] of Object.entries(body)) {
    const existing = await db.select().from(settings).where(
      (await import("drizzle-orm")).eq(settings.key, k),
    );
    if (existing.length) {
      await db.update(settings).set({ value: JSON.stringify(v), updatedAt: Date.now() }).where(
        (await import("drizzle-orm")).eq(settings.key, k),
      );
    } else {
      await db.insert(settings).values({ key: k, value: JSON.stringify(v), updatedAt: Date.now() });
    }
  }
  return NextResponse.json({ ok: true });
}
