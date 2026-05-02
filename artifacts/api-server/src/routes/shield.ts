import { Router } from "express";
import { db } from "@workspace/db";
import { shieldGenerationsTable } from "@workspace/db/schema";
import { callLLM, parseJSON, MODELS } from "../lib/anthropic.js";
import { SHIELD_GENERATOR_PROMPT } from "../lib/prompts.js";

const router = Router();

interface ShieldResult {
  hardened_prompt: string;
  techniques_applied: string[];
  categories_now_resisted: string[];
  estimated_score_improvement: number;
  diff_summary_ar: string;
  diff_summary_en: string;
}

router.post("/shield/generate", async (req, res) => {
  const { prompt, level = "standard", domain } = req.body as {
    prompt: string;
    level?: string;
    domain?: string;
  };

  if (!prompt?.trim()) {
    return res.status(400).json({ error: "prompt is required" });
  }

  const validLevels = ["light", "standard", "paranoid"];
  const hardeningLevel = validLevels.includes(level) ? level : "standard";

  const userMsg = `INPUT PROMPT:\n${prompt}\n\nHARDENING LEVEL: ${hardeningLevel.toUpperCase()}\nDOMAIN: ${domain ?? "general"}\nLANGUAGES TO DEFEND: Arabic and English\n\nGenerate the hardened version.`;

  const raw = await callLLM(MODELS.OPUS, SHIELD_GENERATOR_PROMPT, userMsg, 4000);
  const result = parseJSON<ShieldResult>(raw);

  const saved = await db
    .insert(shieldGenerationsTable)
    .values({
      inputPrompt: prompt,
      outputPrompt: result.hardened_prompt,
      hardeningLevel,
      domain: domain ?? null,
      techniquesApplied: result.techniques_applied,
      categoriesNowResisted: result.categories_now_resisted,
      estimatedScoreImprovement: result.estimated_score_improvement,
      diffSummaryEn: result.diff_summary_en,
      diffSummaryAr: result.diff_summary_ar,
    })
    .returning();

  res.json({
    hardened_prompt: result.hardened_prompt,
    techniques_applied: result.techniques_applied,
    categories_now_resisted: result.categories_now_resisted,
    estimated_score_improvement: result.estimated_score_improvement,
    diff_summary_ar: result.diff_summary_ar,
    diff_summary_en: result.diff_summary_en,
    generation_id: saved[0].id,
  });
});

export default router;
