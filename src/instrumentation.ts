export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDb } = await import("@/lib/db/client");
    await ensureDb();
    // sweep orphaned running rows from a hard restart
    try {
      const { getDb } = await import("@/lib/db/client");
      const { runs } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      const db = getDb();
      await db
        .update(runs)
        .set({ status: "failed", errorCode: "PROCESS_RESTART", errorMessage: "server restarted mid-run", completedAt: Date.now() })
        .where(eq(runs.status, "running"));
    } catch { /* ignore */ }
  }
}
