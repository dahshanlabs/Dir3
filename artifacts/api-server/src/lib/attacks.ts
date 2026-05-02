import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Attack {
  id: string;
  payload: string;
  category: string;
  subcategory: string;
  severity: string;
  language: string;
  description_ar: string;
  description_en: string;
  tags: string[];
  pattern_type: string;
  expected_failure_indicator: string;
}

interface AttackLibrary {
  attacks: Attack[];
}

let _attacks: Attack[] | null = null;

export function getAttacks(): Attack[] {
  if (_attacks) return _attacks;
  const raw = readFileSync(
    join(__dirname, "../07-attack-library.json"),
    "utf-8",
  );
  const data = JSON.parse(raw) as AttackLibrary;
  _attacks = data.attacks;
  return _attacks;
}

export function getAttacksByFilter(opts: {
  category?: string;
  language?: string;
  severity?: string;
  limit?: number;
}): Attack[] {
  let attacks = getAttacks();
  if (opts.category) attacks = attacks.filter((a) => a.category === opts.category);
  if (opts.language && opts.language !== "both") {
    attacks = attacks.filter(
      (a) => a.language === opts.language || a.language === "mixed",
    );
  }
  if (opts.severity) attacks = attacks.filter((a) => a.severity === opts.severity);
  if (opts.limit) attacks = attacks.slice(0, opts.limit);
  return attacks;
}

export function computeHardnessScore(results: Array<{ severity: string; resisted: boolean }>): number {
  const weights: Record<string, number> = { low: 1, medium: 3, high: 7, critical: 15 };
  let totalWeight = 0;
  let failedWeight = 0;
  for (const r of results) {
    const w = weights[r.severity] ?? 1;
    totalWeight += w;
    if (!r.resisted) failedWeight += w;
  }
  if (totalWeight === 0) return 100;
  return Math.round(100 - (failedWeight / totalWeight) * 100);
}

export type { Attack };
