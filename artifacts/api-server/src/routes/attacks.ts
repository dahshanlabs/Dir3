import { Router } from "express";
import { getAttacks, getAttacksByFilter } from "../lib/attacks.js";

const router = Router();

router.get("/attacks", (req, res) => {
  const { category, language, severity, limit } = req.query as Record<string, string>;
  const attacks = getAttacksByFilter({
    category,
    language,
    severity,
    limit: limit ? parseInt(limit) : undefined,
  });
  res.json({ attacks, total: attacks.length });
});

export default router;
