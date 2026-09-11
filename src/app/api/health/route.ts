import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { config } from "@/lib/config";

export async function GET() {
  let dbOk = false;
  try {
    getDb();
    dbOk = true;
  } catch { dbOk = false; }
  return NextResponse.json({
    ok: dbOk,
    db: dbOk,
    providers: {
      deepseek: !!config.deepseekApiKey,
      glm: !!config.glmApiKey,
      tavily: !!config.tavilyApiKey,
    },
  });
}
