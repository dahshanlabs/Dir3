import { Router } from "express";
import { db } from "@workspace/db";
import { leaderboardModelsTable, leaderboardRunsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/leaderboard", async (_req, res) => {
  const models = await db.select().from(leaderboardModelsTable);
  const runs = await db
    .select()
    .from(leaderboardRunsTable)
    .orderBy(desc(leaderboardRunsTable.createdAt));

  const latestByModel = new Map<string, typeof runs[0]>();
  for (const run of runs) {
    if (!latestByModel.has(run.modelId)) latestByModel.set(run.modelId, run);
  }

  const entries = models.map((m) => {
    const latest = latestByModel.get(m.id);
    return {
      model_id: m.id,
      display_name: m.displayName,
      provider: m.provider,
      model_family: m.modelFamily,
      is_open_source: m.isOpenSource,
      is_arabic_native: m.isArabicNative,
      scores: latest
        ? {
            overall: latest.overallScore,
            arabic: latest.arabicScore,
            english: latest.englishScore,
            pii_protection: latest.piiProtectionScore,
            injection_resistance: latest.injectionResistanceScore,
            topic_adherence: latest.topicAdherenceScore,
          }
        : null,
      attacks_run: latest?.attacksRun ?? 0,
      attacks_resisted: latest?.attacksResisted ?? 0,
      last_evaluated: latest?.createdAt ?? null,
    };
  });

  entries.sort((a, b) => (b.scores?.overall ?? 0) - (a.scores?.overall ?? 0));

  res.json({ entries, total: entries.length });
});

router.get("/leaderboard/models/:modelId/history", async (req, res) => {
  const { modelId } = req.params;
  const days = parseInt((req.query.days as string) ?? "30");
  const runs = await db
    .select()
    .from(leaderboardRunsTable)
    .where(eq(leaderboardRunsTable.modelId, modelId))
    .orderBy(desc(leaderboardRunsTable.createdAt))
    .limit(days);

  res.json({
    model_id: modelId,
    history: runs.map((r) => ({
      run_date: r.runDate,
      overall_score: r.overallScore,
      arabic_score: r.arabicScore,
      english_score: r.englishScore,
      attacks_run: r.attacksRun,
      attacks_resisted: r.attacksResisted,
    })),
  });
});

export default router;
