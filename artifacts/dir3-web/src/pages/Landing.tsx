import { Link } from "wouter";
import { Shield, Zap, FileSearch, Trophy, Radar, ArrowRight, Globe, Lock, ChevronRight } from "lucide-react";
import { useGetStats } from "@workspace/api-client-react";

const features = [
  {
    icon: Zap,
    title: "Playground",
    titleAr: "الملعب",
    desc: "Test your LLM system prompt against 152+ Arabic and English adversarial attacks. Get a Hardness Score instantly.",
    href: "/playground",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 border-yellow-400/20",
  },
  {
    icon: Shield,
    title: "Shield Generator",
    titleAr: "مولّد الدرع",
    desc: "Paste your weak system prompt and get a hardened version with built-in defenses against injection, roleplay, and authority spoofing.",
    href: "/shield",
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
  },
  {
    icon: FileSearch,
    title: "Compliance Scanner",
    titleAr: "ماسح الامتثال",
    desc: "Evaluate your AI system against PDPL and NCA ECC-2:2024 frameworks. Get actionable findings for Saudi regulators.",
    href: "/scanner",
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/20",
  },
  {
    icon: Trophy,
    title: "Leaderboard",
    titleAr: "لوحة الصدارة",
    desc: "Arabic Safety Index — see which LLMs perform best against Arabic adversarial attacks. Updated continuously.",
    href: "/leaderboard",
    color: "text-purple-400",
    bg: "bg-purple-400/10 border-purple-400/20",
  },
  {
    icon: Radar,
    title: "Injection Detector",
    titleAr: "كاشف الحقن",
    desc: "Real-time detection of prompt injection in Arabic and English. Supports diacritics, kashida steganography, and dialect attacks.",
    href: "/detect",
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/20",
  },
];

const attackCategories = [
  { id: "prompt_injection", label: "Prompt Injection", labelAr: "حقن البرومبت", count: 24 },
  { id: "role_hijacking", label: "Role Hijacking", labelAr: "اختطاف الدور", count: 18 },
  { id: "authority_spoofing", label: "Authority Spoofing", labelAr: "انتحال السلطة", count: 16 },
  { id: "religious_spoofing", label: "Religious Spoofing", labelAr: "الانتحال الديني", count: 14 },
  { id: "pii_exfiltration", label: "PII Exfiltration", labelAr: "تسريب البيانات", count: 20 },
  { id: "diacritic_injection", label: "Diacritic Injection", labelAr: "حقن التشكيل", count: 15 },
  { id: "kashida_steganography", label: "Kashida Steganography", labelAr: "إخفاء الكشيدة", count: 12 },
  { id: "code_switching", label: "Code Switching", labelAr: "تبديل الكود", count: 13 },
  { id: "topic_drift", label: "Topic Drift", labelAr: "انجراف الموضوع", count: 11 },
  { id: "encoded_payload", label: "Encoded Payload", labelAr: "الحمولة المشفرة", count: 9 },
];

export default function Landing() {
  const { data: stats } = useGetStats();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex items-center">
              <span className="font-bold text-lg">Dir3</span>
              <span className="mx-2 text-muted-foreground">/</span>
              <span className="font-bold text-lg text-primary" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>درع</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground border border-border rounded-full px-3 py-1">
              <Globe className="w-3 h-3" />
              <span>AR / EN</span>
            </div>
            <Link
              href="/playground"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              Get Started <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-24 pb-20 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/5 blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-medium px-4 py-2 rounded-full mb-8">
            <Lock className="w-3 h-3" />
            Arabic-Native AI Security Platform — منصة أمان الذكاء الاصطناعي العربية
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Secure your AI{" "}
            <span className="text-primary">before</span>{" "}
            it's deployed
          </h1>
          <p className="text-xl md:text-2xl font-bold mb-4 text-foreground" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>
            احمِ نظامك قبل أن تطلقه — باللغة العربية أولاً
          </p>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-12">
            The first AI red-teaming platform purpose-built for Arabic language attacks, Saudi regulatory compliance (PDPL, NCA ECC), and Arabic-specific threat vectors.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mb-12">
            {[
              { value: stats?.attacks_in_library ?? 152, label: "Attack Vectors", labelAr: "متجه هجوم" },
              { value: `${stats?.total_runs ?? "0"}+`, label: "Runs Completed", labelAr: "اختبار مكتمل" },
              { value: "10", label: "Attack Categories", labelAr: "فئة هجوم" },
              { value: "2", label: "Compliance Frameworks", labelAr: "إطار امتثال" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-primary">{s.value}</div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="text-xs text-muted-foreground/60" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{s.labelAr}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/playground"
              className="bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 text-lg"
            >
              Test Your Prompt <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/leaderboard"
              className="border border-border bg-card text-foreground px-8 py-3 rounded-lg font-semibold hover:bg-accent transition-colors text-lg"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Six tools. One platform.</h2>
          <p className="text-muted-foreground text-center mb-12 text-lg" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
            ستة أدوات. منصة واحدة.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={`block rounded-xl border p-6 hover:scale-[1.02] transition-all group bg-card ${f.bg}`}
              >
                <div className={`w-10 h-10 rounded-lg ${f.bg} border flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg text-foreground">{f.title}</h3>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>{f.titleAr}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Attack Categories */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">152 Arabic-aware attack vectors</h2>
          <p className="text-muted-foreground text-center mb-12">
            Covering threats unique to Arabic language AI deployment in the Saudi market
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {attackCategories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 bg-secondary border border-border rounded-full px-4 py-2 text-sm">
                <span className="text-foreground font-medium">{cat.label}</span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>{cat.labelAr}</span>
                <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-bold mb-4">Start testing in 30 seconds</h2>
          <p className="text-muted-foreground text-lg mb-4">
            Paste your system prompt. Get your Hardness Score. Ship with confidence.
          </p>
          <p className="text-muted-foreground mb-8" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", direction: "rtl" }}>
            الصق system prompt الخاص بك. احصل على درجة الصلابة. انشر بثقة.
          </p>
          <Link
            href="/playground"
            className="bg-primary text-primary-foreground px-10 py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors text-lg inline-flex items-center gap-3"
          >
            <Zap className="w-5 h-5" />
            Open Playground
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
        <p>Dir3 / درع — AI Security for the Arabic Web</p>
        <p className="mt-1 text-xs">Built for PDPL · NCA ECC-2:2024 · Arabic-first</p>
      </footer>
    </div>
  );
}
