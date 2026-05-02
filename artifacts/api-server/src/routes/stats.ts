import { Router } from "express";
import { db } from "@workspace/db";
import {
  playgroundRunsTable,
  complianceScansTable,
  shieldGenerationsTable,
  leaderboardRunsTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [pgRuns, scanRuns, shields, lbRuns] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(playgroundRunsTable),
    db.select({ count: sql<number>`count(*)` }).from(complianceScansTable),
    db.select({ count: sql<number>`count(*)` }).from(shieldGenerationsTable),
    db.select({ count: sql<number>`count(*)` }).from(leaderboardRunsTable),
  ]);

  const avgScore = await db
    .select({ avg: sql<number>`avg(hardness_score)` })
    .from(playgroundRunsTable);

  res.json({
    total_runs: Number(pgRuns[0]?.count ?? 0),
    total_scans: Number(scanRuns[0]?.count ?? 0),
    total_shields: Number(shields[0]?.count ?? 0),
    total_evaluations: Number(lbRuns[0]?.count ?? 0),
    avg_hardness_score: Math.round(Number(avgScore[0]?.avg ?? 0)),
    attacks_in_library: 152,
    models_evaluated: 0,
  });
});

export default router;
