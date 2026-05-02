import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { complianceScansTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { callLLM, parseJSON, MODELS } from "../lib/anthropic.js";
import { PDPL_EVALUATOR_PROMPT, NCA_EVALUATOR_PROMPT } from "../lib/prompts.js";

const router = Router();

const PDPL_ARTICLES = [
  { id: "pdpl.art.4", text_en: "Data Subject Rights - access, correction, deletion, restriction", text_ar: "حقوق صاحب البيانات - الوصول والتصحيح والحذف والتقييد" },
  { id: "pdpl.art.5", text_en: "Lawful Basis for Processing - consent, contract, legal obligation", text_ar: "الأساس القانوني للمعالجة - الموافقة، العقد، الالتزام القانوني" },
  { id: "pdpl.art.6", text_en: "Consent Requirements - explicit, informed, freely given", text_ar: "متطلبات الموافقة - صريحة، مستنيرة، طوعية" },
  { id: "pdpl.art.11", text_en: "Purpose Limitation - collect only what is necessary", text_ar: "تحديد الغرض - جمع البيانات الضرورية فقط" },
  { id: "pdpl.art.18", text_en: "Security Measures - protect against unauthorized access", text_ar: "الإجراءات الأمنية - الحماية من الوصول غير المصرح به" },
];

const NCA_CONTROLS = [
  { id: "nca-ecc.2-7", text_en: "Data and Information Protection - classify and protect sensitive data", text_ar: "حماية البيانات والمعلومات - تصنيف وحماية البيانات الحساسة" },
  { id: "nca-ecc.2-10", text_en: "Vulnerability Management - identify and remediate vulnerabilities", text_ar: "إدارة الثغرات - تحديد الثغرات ومعالجتها" },
  { id: "nca-ecc.2-15", text_en: "Web Application Security - OWASP controls for AI APIs", text_ar: "أمان تطبيقات الويب - ضوابط OWASP لواجهات برمجة الذكاء الاصطناعي" },
  { id: "nca-ecc.4-1", text_en: "Third-Party Cybersecurity - foreign LLM providers", text_ar: "أمن الأطراف الثالثة - مزودو نماذج اللغة الأجنبية" },
  { id: "nca-ecc.4-2", text_en: "Cloud Computing Security - data sovereignty and hosting", text_ar: "أمن الحوسبة السحابية - سيادة البيانات والاستضافة" },
];

interface FindingResult {
  severity: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  evidence: string;
  remediation_ar: string;
  remediation_en: string;
}

interface EvalResult {
  article_id?: string;
  control_id?: string;
  compliance_status: string;
  confidence: number;
  findings: FindingResult[];
  summary_ar: string;
  summary_en: string;
}

router.post("/scanner/run", async (req, res) => {
  const { system_prompt, frameworks = ["pdpl", "nca_ecc"], domain, input_type = "system_prompt" } = req.body as {
    system_prompt: string;
    frameworks?: string[];
    domain?: string;
    input_type?: string;
  };

  if (!system_prompt?.trim()) {
    return res.status(400).json({ error: "system_prompt is required" });
  }

  const scanId = randomUUID().replace(/-/g, "").slice(0, 12);

  const scan = await db
    .insert(complianceScansTable)
    .values({
      systemPrompt: system_prompt,
      inputType: input_type,
      frameworks,
      domain: domain ?? null,
      status: "running",
    })
    .returning();

  res.json({ scan_id: scanId, db_id: scan[0].id, status: "running" });

  void runScanAsync(scan[0].id, system_prompt, frameworks, domain ?? "general");
});

async function runScanAsync(
  scanDbId: string,
  systemPrompt: string,
  frameworks: string[],
  domain: string,
) {
  const allFindings: FindingResult[] = [];
  const frameworkScores: Record<string, number> = {};

  if (frameworks.includes("pdpl")) {
    const pdplFindings: FindingResult[] = [];
    let pdplCompliant = 0;
    for (const article of PDPL_ARTICLES) {
      try {
        const userMsg = `PDPL ARTICLE TO EVALUATE:\n${article.id}: ${article.text_en}\n${article.text_ar}\n\nSYSTEM CONFIGURATION:\n${systemPrompt}\n\nSAMPLE CONVERSATIONS: None provided\n\nDOMAIN CONTEXT: ${domain}`;
        const raw = await callLLM(MODELS.OPUS, PDPL_EVALUATOR_PROMPT, userMsg, 2000);
        const result = parseJSON<EvalResult>(raw);
        pdplFindings.push(...result.findings.map((f) => ({ ...f, framework: "pdpl", article_id: article.id })));
        if (result.compliance_status === "compliant") pdplCompliant++;
      } catch { /* skip */ }
    }
    allFindings.push(...pdplFindings);
    frameworkScores["pdpl"] = Math.round((pdplCompliant / PDPL_ARTICLES.length) * 100);
  }

  if (frameworks.includes("nca_ecc")) {
    const ncaFindings: FindingResult[] = [];
    let ncaCompliant = 0;
    for (const control of NCA_CONTROLS) {
      try {
        const userMsg = `CONTROL TO EVALUATE:\n${control.id}: ${control.text_en}\n${control.text_ar}\n\nSYSTEM CONFIGURATION:\n${systemPrompt}\n\nDOMAIN: ${domain}`;
        const raw = await callLLM(MODELS.OPUS, NCA_EVALUATOR_PROMPT, userMsg, 2000);
        const result = parseJSON<EvalResult>(raw);
        ncaFindings.push(...result.findings.map((f) => ({ ...f, framework: "nca_ecc", control_id: control.id })));
        if (result.compliance_status === "compliant") ncaCompliant++;
      } catch { /* skip */ }
    }
    allFindings.push(...ncaFindings);
    frameworkScores["nca_ecc"] = Math.round((ncaCompliant / NCA_CONTROLS.length) * 100);
  }

  const scores = Object.values(frameworkScores);
  const overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  await db
    .update(complianceScansTable)
    .set({
      status: "completed",
      overallScore,
      frameworkScores,
      findings: allFindings,
      completedAt: new Date(),
    })
    .where(eq(complianceScansTable.id, scanDbId));
}

router.get("/scanner/scans/:scanId", async (req, res) => {
  const { scanId } = req.params;
  const rows = await db
    .select()
    .from(complianceScansTable)
    .where(eq(complianceScansTable.id, scanId))
    .limit(1);
  if (!rows.length) return res.status(404).json({ error: "Scan not found" });
  const scan = rows[0];
  res.json({
    scan_id: scan.id,
    status: scan.status,
    overall_score: scan.overallScore,
    framework_scores: scan.frameworkScores,
    findings: scan.findings,
    started_at: scan.startedAt,
    completed_at: scan.completedAt,
  });
});

export default router;
