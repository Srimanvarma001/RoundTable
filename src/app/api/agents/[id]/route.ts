import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const Patch = z.object({
  name: z.string().optional(),
  lensPrompt: z.string().optional(),
  lens_prompt: z.string().optional(),
  provider: z.enum(["deepseek", "glm", "mock"]).optional(),
  modelId: z.string().optional(),
  model_id: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  weight: z.number().min(0).max(1).optional(),
  avatarStyle: z.enum(["dicebear", "lucide", "initials"]).optional(),
  avatarSeed: z.string().optional(),
  accentColor: z.string().optional(),
  enabled: z.boolean().optional(),
  orderIndex: z.number().int().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = Patch.parse(await req.json());
  const db = getDb();
  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.lensPrompt !== undefined) patch.lensPrompt = body.lensPrompt;
  if (body.lens_prompt !== undefined) patch.lensPrompt = body.lens_prompt;
  if (body.provider !== undefined) patch.provider = body.provider;
  if (body.modelId !== undefined) patch.modelId = body.modelId;
  if (body.model_id !== undefined) patch.modelId = body.model_id;
  if (body.temperature !== undefined) patch.temperature = body.temperature;
  if (body.weight !== undefined) patch.weight = body.weight;
  if (body.avatarStyle !== undefined) patch.avatarStyle = body.avatarStyle;
  if (body.avatarSeed !== undefined) patch.avatarSeed = body.avatarSeed;
  if (body.accentColor !== undefined) patch.accentColor = body.accentColor;
  if (body.enabled !== undefined) patch.enabled = body.enabled ? 1 : 0;
  if (body.orderIndex !== undefined) patch.orderIndex = body.orderIndex;
  (patch as { updatedAt: number }).updatedAt = Date.now();
  await db.update(agents).set(patch).where(eq(agents.id, id));
  const rows = await db.select().from(agents).where(eq(agents.id, id));
  return NextResponse.json({ agent: rows[0] });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const rows = await db.select().from(agents).where(eq(agents.id, id));
  if (rows[0]?.isMeAgent) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Cannot delete the Me Agent seat" } }, { status: 400 });
  }
  await db.delete(agents).where(eq(agents.id, id));
  return new NextResponse(null, { status: 204 });
}
