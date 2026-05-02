import { useState } from "react";
import { useGenerateShield } from "@workspace/api-client-react";
import { Shield, Sparkles, Copy, CheckCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVELS = [
  { id: "light", label: "Light", labelAr: "خفيف", desc: "Minimal additions. For low-risk assistants." },
  { id: "standard", label: "Standard", labelAr: "قياسي", desc: "Comprehensive defenses. Recommended for production." },
  { id: "paranoid", label: "Paranoid", labelAr: "قصوى", desc: "Maximum hardening. For banking, healthcare, government." },
] as const;

const DOMAINS = [
  { id: "general", label: "General / عام" },
  { id: "banking", label: "Banking / مصرفي" },
  { id: "healthcare", label: "Healthcare / رعاية صحية" },
  { id: "government", label: "Government / حكومي" },
  { id: "education", label: "Education / تعليمي" },
  { id: "ecommerce", label: "E-commerce / تجارة إلكترونية" },
];

const EXAMPLES = [
  {
    label: "Simple chatbot",
    prompt: "You are a helpful assistant. Help users with their questions.",
  },
  {
    label: "Customer service (AR)",
    prompt: "أنت مساعد خدمة عملاء لشركة نكست سوفت. ساعد العملاء في مشكلاتهم التقنية فقط.",
  },
];

export default function ShieldPage() {
  const [prompt, setPrompt] = useState("");
  const [level, setLevel] = useState<"light" | "standard" | "paranoid">("standard");
  const [domain, setDomain] = useState("general");
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  const mutation = useGenerateShield();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    await mutation.mutateAsync({
      data: { prompt, level, domain },
    });
  };

  const result = mutation.data as {
    hardened_prompt?: string;
    techniques_applied?: string[];
    categories_now_resisted?: string[];
    estimated_score_improvement?: number;
    diff_summary_en?: string;
    diff_summary_ar?: string;
  } | undefined;

  const copyPrompt = () => {
    if (result?.hardened_prompt) {
      navigator.clipboard.writeText(result.hardened_prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-6 h-6 text-blue-400" />
            <h1 className="text-2xl font-bold">Shield Generator</h1>
            <span className="text-muted-foreground" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>/ مولّد الدرع</span>
          </div>
          <p className="text-muted-foreground">Harden your system prompt against adversarial attacks. Powered by Claude Opus 4.7.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input */}
          <div className="space-y-5">
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Original System Prompt</label>
                <div className="flex gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => setPrompt(ex.prompt)}
                      className="text-xs text-primary border border-primary/30 hover:border-primary/60 px-2 py-1 rounded transition-colors"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Paste your system prompt... / الصق system prompt هنا..."
                rows={10}
                className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-400/50 resize-none font-mono"
              />
            </div>

            {/* Options */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="text-sm font-medium mb-3 block">Hardening Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLevel(l.id)}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all",
                        level === l.id
                          ? "border-blue-400/50 bg-blue-400/10 text-blue-400"
                          : "border-border hover:border-border/80 hover:bg-accent",
                      )}
                    >
                      <div className="text-xs font-medium">{l.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{l.labelAr}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">{LEVELS.find((l) => l.id === level)?.desc}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                >
                  {DOMAINS.map((d) => (
                    <option key={d.id} value={d.id}>{d.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || mutation.isPending}
                className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {mutation.isPending
                  ? <><Clock className="w-4 h-4 animate-spin" /> Hardening...</>
                  : <><Sparkles className="w-4 h-4" /> Generate Shield</>}
              </button>

              {mutation.isError && (
                <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">
                  Error generating shield. Please try again.
                </div>
              )}
            </div>
          </div>

          {/* Output */}
          <div className="space-y-5">
            {result ? (
              <>
                {/* Stats */}
                <div className="bg-card border border-blue-400/20 rounded-xl p-5">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">+{result.estimated_score_improvement ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Est. score improvement</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{result.techniques_applied?.length ?? 0}</div>
                      <div className="text-xs text-muted-foreground">Techniques applied</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Summary:</div>
                      <div className="text-sm">{result.diff_summary_en}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">ملخص:</div>
                      <div className="text-sm" dir="rtl" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{result.diff_summary_ar}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Attack categories now resisted:</div>
                      <div className="flex flex-wrap gap-1">
                        {result.categories_now_resisted?.map((cat) => (
                          <span key={cat} className="text-xs bg-green-400/10 border border-green-400/20 text-green-400 px-2 py-0.5 rounded-full">{cat}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    className="w-full mt-4 text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 transition-colors"
                  >
                    {showDiff ? <><ChevronUp className="w-3 h-3" /> Hide techniques</> : <><ChevronDown className="w-3 h-3" /> Show techniques applied</>}
                  </button>

                  {showDiff && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {result.techniques_applied?.map((t) => (
                        <span key={t} className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hardened prompt */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      Hardened System Prompt
                    </label>
                    <button
                      onClick={copyPrompt}
                      className="text-xs border border-border rounded px-3 py-1.5 hover:bg-accent transition-colors flex items-center gap-1.5"
                    >
                      {copied ? <><CheckCircle className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                  <div className="bg-secondary rounded-lg px-4 py-3 text-sm font-mono text-foreground whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {result.hardened_prompt}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center text-center h-full min-h-64">
                <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <div className="text-muted-foreground text-sm">Your hardened prompt will appear here</div>
                <div className="text-muted-foreground/60 text-xs mt-1" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>سيظهر هنا الـ prompt المحصّن</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
