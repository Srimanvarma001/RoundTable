import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { profileItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const Patch = z.object({
  kind: z.string().optional(), label: z.string().optional(), detail: z.string().optional(),
  source: z.string().optional(), confidence: z.number().optional(), locked: z.boolean().optional(),
  keepSource: z.boolean().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Patch.parse(await req.json());
  const db = getDb();
  const patch: Record<string, unknown> = { updatedAt: Date.now() };
  if (body.kind !== undefined) patch.kind = body.kind;
  if (body.label !== undefined) patch.label = body.label;
  if (body.detail !== undefined) patch.detail = body.detail;
  if (body.confidence !== undefined) patch.confidence = body.confidence;
  if (body.locked !== undefined) patch.locked = body.locked ? 1 : 0;
  // editing sets source=manual unless keepSource
  if (!body.keepSource && (body.label !== undefined || body.detail !== undefined)) patch.source = "manual";
  else if (body.source !== undefined) patch.source = body.source;
  await db.update(profileItems).set(patch).where(eq(profileItems.id, id));
  const rows = await db.select().from(profileItems).where(eq(profileItems.id, id));
  return NextResponse.json({ item: rows[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  await db.delete(profileItems).where(eq(profileItems.id, id));
  return new NextResponse(null, { status: 204 });
}
