import { useGetLeaderboard } from "@workspace/api-client-react";
import { Trophy, TrendingUp, Globe, Code, Star, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  model_id: string;
  display_name: string;
  provider: string;
  model_family?: string;
  is_open_source: boolean;
  is_arabic_native: boolean;
  scores?: {
    overall: number;
    arabic: number;
    english: number;
    pii_protection: number;
    injection_resistance: number;
    topic_adherence: number;
  };
  attacks_run: number;
  attacks_resisted: number;
  last_evaluated?: string;
}

function ScoreBadge({ score, size = "sm" }: { score?: number; size?: "sm" | "lg" }) {
  if (score === undefined) return <span className="text-muted-foreground text-xs">—</span>;
  const color = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";
  return (
    <span className={cn("font-bold", color, size === "lg" ? "text-3xl" : "text-sm")}>{score}</span>
  );
}

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm text-muted-foreground font-mono">{rank}</span>;
}

const SCORE_COLS = [
  { key: "overall", label: "Overall", labelAr: "الإجمالي" },
  { key: "arabic", label: "Arabic", labelAr: "عربي" },
  { key: "english", label: "English", labelAr: "إنجليزي" },
  { key: "pii_protection", label: "PII", labelAr: "البيانات" },
  { key: "injection_resistance", label: "Injection", labelAr: "الحقن" },
  { key: "topic_adherence", label: "Topic", labelAr: "الموضوع" },
];

export default function Leaderboard() {
  const { data, isLoading, refetch } = useGetLeaderboard();
  const entries = ((data as { entries?: LeaderboardEntry[] } | undefined)?.entries ?? []) as LeaderboardEntry[];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-6 h-6 text-purple-400" />
              <h1 className="text-2xl font-bold">Arabic Safety Leaderboard</h1>
            </div>
            <p className="text-muted-foreground">مؤشر الأمان العربي — Arabic Safety Index (ASI)</p>
            <p className="text-sm text-muted-foreground mt-1">
              Ranking LLMs by their resistance to Arabic and English adversarial attacks. Lower scores = more vulnerable.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 text-xs border border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading leaderboard...
          </div>
        ) : entries.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-16 text-center">
            <Trophy className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No evaluations yet</h2>
            <p className="text-muted-foreground mb-2">The leaderboard is empty. Run evaluations to populate it.</p>
            <p className="text-muted-foreground text-sm" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              لوحة الصدارة فارغة. قم بتشغيل التقييمات لملئها.
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 hero cards */}
            {entries.slice(0, 3).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {entries.slice(0, 3).map((entry, idx) => (
                  <div
                    key={entry.model_id}
                    className={cn(
                      "bg-card border rounded-xl p-5 text-center",
                      idx === 0
                        ? "border-yellow-400/40 bg-yellow-400/5"
                        : idx === 1
                          ? "border-gray-400/40"
                          : "border-amber-700/40",
                    )}
                  >
                    <div className="text-3xl mb-2">
                      {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                    </div>
                    <div className="font-bold text-lg">{entry.display_name}</div>
                    <div className="text-xs text-muted-foreground mb-3">{entry.provider}</div>
                    <ScoreBadge score={entry.scores?.overall} size="lg" />
                    <div className="text-xs text-muted-foreground mt-1">Overall Score</div>
                    <div className="mt-3 flex justify-center gap-3">
                      {entry.is_arabic_native && (
                        <span className="text-xs bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">Arabic Native</span>
                      )}
                      {entry.is_open_source && (
                        <span className="text-xs bg-secondary border border-border px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Code className="w-3 h-3" /> Open
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Full table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium w-10">#</th>
                      <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Model</th>
                      {SCORE_COLS.map((col) => (
                        <th key={col.key} className="text-center px-3 py-3 text-xs text-muted-foreground font-medium">
                          <div>{col.label}</div>
                          <div style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{col.labelAr}</div>
                        </th>
                      ))}
                      <th className="text-center px-3 py-3 text-xs text-muted-foreground font-medium">Attacks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={entry.model_id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                        <td className="px-4 py-3">
                          <MedalIcon rank={idx + 1} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{entry.display_name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <span>{entry.provider}</span>
                            {entry.model_family && <span>· {entry.model_family}</span>}
                            {entry.is_arabic_native && (
                              <span className="text-primary flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" /> AR
                              </span>
                            )}
                            {entry.is_open_source && (
                              <span className="text-muted-foreground flex items-center gap-0.5">
                                <Code className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                        </td>
                        {SCORE_COLS.map((col) => (
                          <td key={col.key} className="px-3 py-3 text-center">
                            <ScoreBadge score={entry.scores?.[col.key as keyof typeof entry.scores] as number | undefined} />
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                          {entry.attacks_run > 0 ? (
                            <span>
                              <span className="text-green-400">{entry.attacks_resisted}</span>
                              <span className="text-muted-foreground">/{entry.attacks_run}</span>
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center">
              Scores are on a 0–100 scale. Higher = more resistant to adversarial attacks.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
