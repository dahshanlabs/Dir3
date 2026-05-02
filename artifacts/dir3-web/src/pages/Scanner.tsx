import { useState } from "react";
import { useRunScanner, useGetScan } from "@workspace/api-client-react";
import { FileSearch, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const FRAMEWORKS = [
  { id: "pdpl", label: "PDPL", desc: "Saudi Personal Data Protection Law", color: "text-green-400 border-green-400/30 bg-green-400/10" },
  { id: "nca_ecc", label: "NCA ECC-2:2024", desc: "National Cybersecurity Authority", color: "text-blue-400 border-blue-400/30 bg-blue-400/10" },
];

const DOMAINS = [
  { id: "general", label: "General" },
  { id: "banking", label: "Banking / مصرفي" },
  { id: "healthcare", label: "Healthcare / رعاية صحية" },
  { id: "government", label: "Government / حكومي" },
  { id: "education", label: "Education / تعليمي" },
];

const SEVERITY_MAP: Record<string, { color: string; label: string }> = {
  critical: { color: "text-red-400 bg-red-400/10 border-red-400/30", label: "Critical" },
  high: { color: "text-orange-400 bg-orange-400/10 border-orange-400/30", label: "High" },
  medium: { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30", label: "Medium" },
  low: { color: "text-green-400 bg-green-400/10 border-green-400/30", label: "Low" },
};

const EXAMPLE_PROMPT = `You are a customer data analyst for Riyadh Bank. You have access to customer transaction histories and account information. Help relationship managers understand customer spending patterns.

When asked, provide detailed analysis of specific customer accounts by their ID. Store all conversation history for compliance purposes.`;

interface Finding {
  severity: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  evidence?: string;
  remediation_en: string;
  remediation_ar: string;
  framework?: string;
  article_id?: string;
  control_id?: string;
}

function FindingCard({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const sev = SEVERITY_MAP[finding.severity] ?? SEVERITY_MAP.low;

  return (
    <div className={cn("border rounded-lg overflow-hidden", `border-${finding.severity === 'critical' ? 'red' : finding.severity === 'high' ? 'orange' : finding.severity === 'medium' ? 'yellow' : 'green'}-400/20`)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/50 transition-colors"
      >
        <AlertTriangle className={cn("w-4 h-4 flex-shrink-0", sev.color.split(" ")[0])} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs px-1.5 py-0.5 rounded border", sev.color)}>{sev.label}</span>
            {finding.framework && (
              <span className="text-xs text-muted-foreground">{finding.framework.toUpperCase()}</span>
            )}
            {(finding.article_id ?? finding.control_id) && (
              <span className="text-xs text-muted-foreground">{finding.article_id ?? finding.control_id}</span>
            )}
          </div>
          <div className="text-sm font-medium mt-0.5">{finding.title_en}</div>
        </div>
        {expanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3 text-xs">
          <div>
            <span className="text-muted-foreground">العنوان: </span>
            <span dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{finding.title_ar}</span>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Description:</div>
            <div>{finding.description_en}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">الوصف:</div>
            <div dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{finding.description_ar}</div>
          </div>
          {finding.evidence && (
            <div>
              <div className="text-muted-foreground mb-1">Evidence:</div>
              <div className="bg-secondary rounded p-2 font-mono">{finding.evidence}</div>
            </div>
          )}
          <div>
            <div className="text-muted-foreground mb-1">Remediation:</div>
            <div className="text-green-400/90">{finding.remediation_en}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">الإصلاح:</div>
            <div className="text-green-400/90" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{finding.remediation_ar}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Scanner() {
  const [prompt, setPrompt] = useState("");
  const [selectedFrameworks, setSelectedFrameworks] = useState<string[]>(["pdpl", "nca_ecc"]);
  const [domain, setDomain] = useState("general");
  const [scanId, setScanId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const mutation = useRunScanner();

  const { data: scanData } = useGetScan(scanId ?? "", {
    query: {
      enabled: polling && !!scanId,
      refetchInterval: (data) => {
        const status = (data?.state?.data as { status?: string } | undefined)?.status;
        return status === "running" ? 3000 : false;
      },
    },
  });

  const handleScan = async () => {
    if (!prompt.trim()) return;
    const result = await mutation.mutateAsync({
      data: {
        system_prompt: prompt,
        frameworks: selectedFrameworks as ("pdpl" | "nca_ecc")[],
        domain,
        input_type: "system_prompt",
      },
    });
    const id = (result as { db_id?: string }).db_id;
    if (id) { setScanId(id); setPolling(true); }
  };

  const toggleFramework = (id: string) => {
    setSelectedFrameworks((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const status = (scanData as { status?: string } | undefined)?.status;
  const overallScore = (scanData as { overall_score?: number } | undefined)?.overall_score;
  const frameworkScores = (scanData as { framework_scores?: Record<string, number> } | undefined)?.framework_scores ?? {};
  const findings = ((scanData as { findings?: Finding[] } | undefined)?.findings ?? []).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity as keyof typeof order] ?? 3) - (order[b.severity as keyof typeof order] ?? 3);
  });

  const criticalCount = findings.filter((f) => f.severity === "critical").length;
  const highCount = findings.filter((f) => f.severity === "high").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileSearch className="w-6 h-6 text-green-400" />
            <h1 className="text-2xl font-bold">Compliance Scanner</h1>
            <span className="text-muted-foreground" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>/ ماسح الامتثال</span>
          </div>
          <p className="text-muted-foreground">Evaluate your AI system against PDPL and NCA ECC-2:2024 Saudi regulatory frameworks.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Input panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">System Configuration</label>
                <button
                  onClick={() => setPrompt(EXAMPLE_PROMPT)}
                  className="text-xs text-primary border border-primary/30 hover:border-primary/60 px-2 py-1 rounded transition-colors"
                >
                  Load example
                </button>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your system prompt or AI configuration..."
                rows={10}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-400/50 resize-none font-mono"
              />
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Frameworks</label>
                <div className="space-y-2">
                  {FRAMEWORKS.map((fw) => (
                    <button
                      key={fw.id}
                      onClick={() => toggleFramework(fw.id)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedFrameworks.includes(fw.id)
                          ? fw.color
                          : "border-border hover:bg-accent",
                      )}
                    >
                      <div className="text-xs font-bold">{fw.label}</div>
                      <div className="text-xs text-muted-foreground">{fw.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400/50"
                >
                  {DOMAINS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              </div>

              <button
                onClick={handleScan}
                disabled={!prompt.trim() || !selectedFrameworks.length || mutation.isPending || status === "running"}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {mutation.isPending || status === "running"
                  ? <><Clock className="w-4 h-4 animate-spin" /> Scanning...</>
                  : <><FileSearch className="w-4 h-4" /> Run Compliance Scan</>}
              </button>
            </div>
          </div>

          {/* Results panel */}
          <div className="lg:col-span-3">
            {scanData ? (
              <div className="space-y-4">
                {/* Score overview */}
                {status === "completed" && overallScore !== undefined && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-3xl font-bold" style={{ color: overallScore >= 70 ? "#22c55e" : overallScore >= 40 ? "#eab308" : "#ef4444" }}>
                          {overallScore}%
                        </div>
                        <div className="text-sm text-muted-foreground">Overall Compliance Score</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-red-400">{criticalCount} critical</div>
                        <div className="text-sm text-orange-400">{highCount} high</div>
                        <div className="text-sm text-muted-foreground">{findings.length} total findings</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(frameworkScores).map(([fw, score]) => (
                        <div key={fw} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-24">{fw === "pdpl" ? "PDPL" : "NCA ECC"}</span>
                          <div className="flex-1 h-2 bg-secondary rounded-full">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${score}%`,
                                backgroundColor: score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444",
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium w-10 text-right">{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {status === "running" && (
                  <div className="bg-card border border-green-400/20 rounded-xl p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-75" />
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse delay-150" />
                    </div>
                    <div className="text-green-400 font-medium">Evaluating compliance...</div>
                    <div className="text-muted-foreground text-sm mt-1">This takes 3–8 minutes for deep evaluation</div>
                  </div>
                )}

                {/* Findings */}
                {findings.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                      Findings ({findings.length}) — sorted by severity
                    </h3>
                    <div className="space-y-2">
                      {findings.map((f, i) => <FindingCard key={i} finding={f} />)}
                    </div>
                  </div>
                )}

                {status === "completed" && findings.length === 0 && (
                  <div className="bg-card border border-green-400/20 rounded-xl p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <div className="text-green-400 font-medium">No compliance issues found!</div>
                    <div className="text-muted-foreground text-sm mt-1">Your system prompt passes all evaluated controls.</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center h-64">
                <FileSearch className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <div className="text-muted-foreground text-sm">Compliance results will appear here</div>
                <div className="text-muted-foreground/60 text-xs mt-1" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>نتائج الامتثال ستظهر هنا</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
