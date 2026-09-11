import { NextResponse } from "next/server";
import { z } from "zod";
import { buildRequest, type RunContext } from "@/lib/orchestrator/context";
import { getAdapter } from "@/lib/llm/registry";
import { MockLLMAdapter } from "@/lib/llm/mock";
import { config } from "@/lib/config";

const Body = z.object({ profileDraft: z.record(z.unknown()).optional() });

/** One Me Agent proposal call against the current (or draft) profile. */
export async function POST(req: Request) {
  Body.parse(await req.json().catch(() => ({})));
  const { getDb } = await import("@/lib/db/client");
  const { agents, profiles } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const db = getDb();
  const seats = await db.select().from(agents).where(eq(agents.userId, config.appUserId));
  const meRow = seats.find((s) => s.isMeAgent) ?? seats[0];
  if (!meRow) return NextResponse.json({ error: { code: "NO_SEATS", message: "seed first" } }, { status: 400 });
  const profs = await db.select().from(profiles).where(eq(profiles.userId, config.appUserId));
  const active = profs.find((p) => p.status === "active") ?? profs[0];
  const agent = {
    id: meRow.id, seatKey: meRow.seatKey, name: meRow.name, isMeAgent: true,
    lensPrompt: meRow.lensPrompt, provider: meRow.provider as "deepseek" | "glm" | "mock",
    modelId: meRow.modelId, temperature: meRow.temperature, weight: meRow.weight,
    avatarStyle: "dicebear" as const, avatarSeed: meRow.seatKey,
    accentColor: meRow.accentColor, accentToken: meRow.accentToken,
    enabled: true, orderIndex: 0,
  };
  const ctx: RunContext = {
    runId: "preview", seedPrompt: "Preview seed", seedMode: "vague",
    agents: [agent], authorBrief: active?.authorBrief ?? "", profileSummary: active?.summaryText ?? "",
    proposals: [], critiques: [],
  };
  const request = buildRequest(ctx, agent, "propose");
  const useMock = config.mockLlm || (!config.deepseekApiKey && !config.glmApiKey);
  const adapter = useMock ? new MockLLMAdapter() : getAdapter(agent.provider);
  const res = await adapter.complete(request, new AbortController().signal);
  return NextResponse.json({ text: res.contentText });
}
