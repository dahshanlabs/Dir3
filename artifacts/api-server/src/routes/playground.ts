import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { playgroundRunsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { callLLM, parseJSON, MODELS } from "../lib/anthropic.js";
import { getAttacksByFilter, computeHardnessScore, type Attack } from "../lib/attacks.js";
import { ATTACK_JUDGE_PROMPT } from "../lib/prompts.js";

const router = Router();

interface JudgeResult {
  verdict: "ATTACK_SUCCEEDED" | "ATTACK_RESISTED";
  confidence: number;
  reasoning_en: string;
  reasoning_ar: string;
  evidence: string;
}

async function judgeAttack(
  systemPrompt: string,
  attack: Attack,
  targetResponse: string,
): Promise<JudgeResult> {
  const userMsg = `TARGET SYSTEM PROMPT:\n${systemPrompt}\n\nATTACK CATEGORY: ${attack.category}\nATTACK SEVERITY: ${attack.severity}\nEXPECTED FAILURE INDICATOR: ${attack.expected_failure_indicator}\n\nATTACK PAYLOAD:\n${attack.payload}\n\nTARGET RESPONSE:\n${targetResponse}\n\nProvide your verdict.`;
  const raw = await callLLM(MODELS.SONNET, ATTACK_JUDGE_PROMPT, userMsg, 500);
  return parseJSON<JudgeResult>(raw);
}

async function getTargetResponse(systemPrompt: string, attackPayload: string): Promise<string> {
  const response = await callLLM(MODELS.HAIKU, systemPrompt, attackPayload, 800);
  return response;
}

router.post("/playground/run", async (req, res) => {
  const { system_prompt, language_filter = "both", max_attacks = 20 } = req.body as {
    system_prompt: string;
    language_filter?: string;
    max_attacks?: number;
  };

  if (!system_prompt?.trim()) {
    return res.status(400).json({ error: "system_prompt is required" });
  }

  const shareId = randomUUID().replace(/-/g, "").slice(0, 12);
  const attacks = getAttacksByFilter({
    language: language_filter,
    limit: Math.min(Number(max_attacks), 50),
  });

  const run = await db
    .insert(playgroundRunsTable)
    .values({
      shareId,
      systemPrompt: system_prompt,
      status: "running",
      totalAttacks: attacks.length,
    })
    .returning();

  res.json({ run_id: shareId, status: "running", total_attacks: attacks.length });

  // Run attacks asynchronously
  void runAttacksAsync(shareId, system_prompt, attacks);
});

async function runAttacksAsync(shareId: string, systemPrompt: string, attacks: Attack[]) {
  const results: Array<{
    attack_id: string;
    category: string;
    severity: string;
    language: string;
    payload: string;
    target_response: string;
    verdict: string;
    confidence: number;
    reasoning_en: string;
    reasoning_ar: string;
    evidence: string;
    resisted: boolean;
  }> = [];

  let resisted = 0;
  let failed = 0;

  for (const attack of attacks) {
    try {
      const targetResponse = await getTargetResponse(systemPrompt, attack.payload);
      const judgment = await judgeAttack(systemPrompt, attack, targetResponse);
      const didResist = judgment.verdict === "ATTACK_RESISTED";
      if (didResist) resisted++;
      else failed++;
      results.push({
        attack_id: attack.id,
        category: attack.category,
        severity: attack.severity,
        language: attack.language,
        payload: attack.payload,
        target_response: targetResponse,
        verdict: judgment.verdict,
        confidence: judgment.confidence,
        reasoning_en: judgment.reasoning_en,
        reasoning_ar: judgment.reasoning_ar,
        evidence: judgment.evidence,
        resisted: didResist,
      });
    } catch {
      failed++;
    }
  }

  const hardnessScore = computeHardnessScore(
    results.map((r) => ({ severity: r.severity, resisted: r.resisted })),
  );

  const categoryBreakdown: Record<string, { resisted: number; failed: number }> = {};
  for (const r of results) {
    if (!categoryBreakdown[r.category]) categoryBreakdown[r.category] = { resisted: 0, failed: 0 };
    if (r.resisted) categoryBreakdown[r.category].resisted++;
    else categoryBreakdown[r.category].failed++;
  }

  await db
    .update(playgroundRunsTable)
    .set({
      status: "completed",
      hardnessScore,
      attacksResisted: resisted,
      attacksFailed: failed,
      results,
      categoryBreakdown,
      completedAt: new Date(),
    })
    .where(eq(playgroundRunsTable.shareId, shareId));
}

router.get("/playground/runs/:shareId", async (req, res) => {
  const { shareId } = req.params;
  const rows = await db
    .select()
    .from(playgroundRunsTable)
    .where(eq(playgroundRunsTable.shareId, shareId))
    .limit(1);
  if (!rows.length) return res.status(404).json({ error: "Run not found" });
  const run = rows[0];
  res.json({
    run_id: run.shareId,
    status: run.status,
    hardness_score: run.hardnessScore,
    attacks_resisted: run.attacksResisted,
    attacks_failed: run.attacksFailed,
    total_attacks: run.totalAttacks,
    results: run.results,
    category_breakdown: run.categoryBreakdown,
    started_at: run.startedAt,
    completed_at: run.completedAt,
  });
});

router.get("/playground/recent", async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? "10"), 50);
  const rows = await db
    .select()
    .from(playgroundRunsTable)
    .orderBy(playgroundRunsTable.startedAt)
    .limit(limit);
  res.json({
    runs: rows.map((r) => ({
      run_id: r.shareId,
      status: r.status,
      hardness_score: r.hardnessScore,
      attacks_resisted: r.attacksResisted,
      attacks_failed: r.attacksFailed,
      total_attacks: r.totalAttacks,
      started_at: r.startedAt,
    })),
  });
});

export default router;
