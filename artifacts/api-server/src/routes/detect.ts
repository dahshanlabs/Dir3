import { Router } from "express";
import { callLLM, parseJSON, MODELS } from "../lib/anthropic.js";
import { DETECT_PROMPT } from "../lib/prompts.js";

const router = Router();

interface DetectResult {
  is_injection: boolean;
  confidence: number;
  subcategory: string;
  language_detected: string;
  reasoning: string;
  highlighted_text: string | null;
}

router.post("/detect", async (req, res) => {
  const { text, language = "auto" } = req.body as { text: string; language?: string };

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const userMsg = `ANALYZE THIS INPUT:\n\n${text}`;
  const raw = await callLLM(MODELS.HAIKU, DETECT_PROMPT, userMsg, 300);
  const result = parseJSON<DetectResult>(raw);

  res.json({
    is_injection: result.is_injection,
    confidence: result.confidence,
    subcategory: result.subcategory,
    language_detected: result.language_detected,
    overall_risk: result.is_injection
      ? result.confidence > 0.8
        ? "high"
        : result.confidence > 0.5
          ? "medium"
          : "low"
      : "none",
    detections: result.is_injection
      ? [
          {
            type: result.subcategory,
            confidence: result.confidence,
            span: result.highlighted_text,
          },
        ]
      : [],
    reasoning: result.reasoning,
  });
});

export default router;
