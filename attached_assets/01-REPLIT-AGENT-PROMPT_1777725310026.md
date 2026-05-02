# THE REPLIT AGENT MEGA-PROMPT

> **How to use:** Paste the section below into Replit Agent at hour 0. 
> Then attach files 02–09 as context. Replit Agent 4 supports file uploads.
> If it doesn't accept all at once, paste in chunks following the priority order.

---

## PASTE THIS (verbatim) INTO REPLIT AGENT

```
You are building Dir3 (Arabic: درع, "Shield") — a production-ready, Arabic-native AI security platform for the Saudi Arabian market.

# WHAT TO BUILD

A unified web platform with these 6 products sharing a core detection engine:

1. **Playground** — Public web app where anyone can paste a system prompt + select LLM models (Claude, GPT, Gemini, Qwen) and run our attack library against them. Bring-your-own-key (BYOK). Shows live results with explanations. Generates a "Hardness Score." Shareable URLs.

2. **Proxy** — Drop-in OpenAI/Anthropic-compatible API endpoint at /v1/chat/completions and /v1/messages. Filters every request and response through our detection engine. Stores audit logs. Customer dashboard shows usage, blocked threats, latency.

3. **Compliance Scanner** — User uploads system prompts or sample conversations. We map findings to Saudi PDPL articles and NCA ECC-2:2024 controls. Generate downloadable PDF report (bilingual).

4. **Shield Generator** — User pastes weak system prompt. We return hardened version with explanations of what we changed and which attacks it now resists.

5. **Leaderboard** — Public page ranking all major LLMs on our Arabic Safety Index. Auto-updated daily by running our attack library against each model.

6. **CLI** — Published to npm as `dir3`. Command: `npx dir3 test ./prompt.txt`. Returns JSON or pretty output.

# TECH STACK (use exactly this)

- **Monorepo:** Turborepo + pnpm workspaces
- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript + TailwindCSS + shadcn/ui
- **i18n:** next-intl with Arabic (ar) + English (en), RTL support
- **Backend:** Hono on Node.js (lightweight, Edge-ready)
- **Database:** PostgreSQL with Drizzle ORM
- **Auth:** Better Auth (email + magic link, no social yet)
- **LLM SDKs:** @anthropic-ai/sdk, openai, @google/generative-ai
- **PDF generation:** @react-pdf/renderer
- **Charts:** Recharts
- **Deployment:** Replit Reserved VM (always-on)

# REPOSITORY STRUCTURE

```
/
├── apps/
│   ├── web/              # Main Next.js app (Playground, Scanner, Shield, Leaderboard, Dashboard)
│   ├── api/              # Hono API (Proxy + internal endpoints)
│   ├── docs/             # Mintlify-style docs site (can use Nextra)
│   └── landing/          # Marketing site (separate for SEO)
├── packages/
│   ├── core-engine/      # Detection logic — THE MOAT
│   ├── attack-library/   # Attack JSON + loader
│   ├── compliance/       # PDPL/NCA mapping engine
│   ├── shield-gen/       # Prompt hardening logic
│   ├── ui/               # Shared shadcn components
│   ├── db/               # Drizzle schema + migrations
│   └── cli/              # npm package
├── infra/
│   └── replit/           # Replit deployment configs
└── docs/
    └── (PRD, attack-library.json, etc — uploaded as context)
```

# BUILD ORDER (STRICT — DO NOT REORDER)

## PHASE 1: Foundation (target: 3 hours)
1. Initialize monorepo with Turborepo + pnpm
2. Setup TypeScript with strict mode
3. Setup Drizzle + Postgres connection (Replit Postgres)
4. Run schema migrations (use the SQL in 04-database-schema.sql)
5. Setup Better Auth with email magic link
6. Build `packages/core-engine` with these functions:
   - `detectPromptInjection(text: string, lang: 'ar' | 'en' | 'auto'): DetectionResult`
   - `detectPII(text: string): PIIResult` (Saudi-specific patterns)
   - `detectTopicDrift(systemPrompt: string, response: string): DriftResult` (LLM-based)
   - `detectToxicity(text: string, lang: 'ar' | 'en' | 'auto'): ToxicityResult`
   - `analyzeAll(input: AnalyzeInput): FullAnalysisResult`
7. Load 07-attack-library.json into `packages/attack-library`
8. Build skeleton Next.js app with bilingual layout (RTL/LTR switch)

## PHASE 2: Playground (target: 5 hours)
1. Page at `/playground` (public, no auth required for basic use)
2. UI: 
   - Left panel: System prompt textarea, model selector (multi-select for comparison), API key inputs (saved to localStorage encrypted)
   - Right panel: Run button → streaming results table
3. Backend route `/api/playground/run`:
   - Receives system prompt + model list + user's API keys
   - For each model: iterates through attack library, calls model with attack as user input
   - Streams results via Server-Sent Events
   - For each attack: judge with our judge prompt (see 06-SYSTEM-PROMPTS.md) whether the attack succeeded
4. Hardness Score calculation: `100 - (successful_attacks / total_attacks * 100)`, weighted by attack severity
5. Shareable URL: store run results in DB with public ID, page at `/playground/r/[id]`
6. Comparison mode: side-by-side scores across selected models
7. Export results as JSON/PDF

## PHASE 3: Proxy (target: 5 hours)
1. Hono routes:
   - `POST /v1/chat/completions` (OpenAI-compatible)
   - `POST /v1/messages` (Anthropic-compatible)
   - Both accept upstream provider in `X-Dir3-Provider` header
2. Authentication via `Authorization: Bearer dir3_sk_...`
3. Flow per request:
   a. Extract system + user messages
   b. Run pre-checks (injection, PII in user input)
   c. If blocked: return error with reason in `dir3_metadata`
   d. Forward to upstream LLM
   e. Run post-checks on response (PII leak, topic drift, toxicity)
   f. If response flagged: redact/replace and add `dir3_metadata`
   g. Log full request/response/decisions to audit_log table
4. Customer dashboard at `/dashboard`:
   - List of API keys (create/revoke)
   - Recent requests with filters
   - Charts: requests/hour, blocks/hour, top attack categories
   - Settings: per-key rules (allow/deny lists, sensitivity)
5. Webhook config: Slack/Teams URL for high-severity blocks

## PHASE 4: Compliance Scanner (target: 4 hours)
1. Page at `/scanner`
2. Upload UI: paste system prompt OR upload conversation JSON OR upload PDF privacy policy
3. Backend: 
   - Parse input
   - Run against compliance ruleset (use 08-pdpl-articles.json + 09-nca-ecc-controls.json)
   - Each rule: LLM-based evaluation with our compliance system prompt
4. Result UI: 
   - Compliance score (% per category)
   - List of findings with severity, citation, remediation suggestion
   - "Generate PDF Report" button → bilingual PDF via @react-pdf/renderer
5. Save scan to user account if authenticated

## PHASE 5: Shield Generator + Leaderboard + CLI (target: 3 hours)
1. **Shield Generator** at `/shield`:
   - Paste weak prompt → click "Harden"
   - Backend: uses Shield system prompt (in 06-SYSTEM-PROMPTS.md) with Claude Opus 4.7
   - Returns hardened prompt + diff view + list of attack categories now resisted
2. **Leaderboard** at `/leaderboard`:
   - Public page showing all evaluated LLMs ranked by Arabic Safety Index
   - Daily cron job re-runs attack library against each model
   - Historical chart per model
   - Categories: Overall, Arabic-specific resistance, English resistance, PII protection, Topic adherence
3. **CLI** in `packages/cli`:
   - `dir3 test <file>` — run attack library against a system prompt file
   - `dir3 scan <file>` — compliance scan
   - `dir3 shield <file>` — harden a prompt
   - Pretty terminal output with chalk + ora
   - JSON output flag: `--json`
   - Publish to npm as `dir3`

## PHASE 6: Polish (target: 2 hours)
1. Bilingual review: every page works perfectly in Arabic with RTL
2. Mobile responsive
3. Loading states, error states, empty states
4. SEO meta tags (OG images for shareable URLs)
5. Documentation site with quickstart for each product
6. Demo videos: 30-second Loom for each product

## PHASE 7: Ship (target: 2 hours)
1. Deploy to Replit Reserved VM
2. Verify all routes work in production
3. Push GitHub repo (open-source pieces only — see ARCHITECTURE.md)
4. npm publish for CLI
5. Tweet thread (template in 11-PITCH-DEMO.md)
6. Buildathon submission

# CRITICAL DESIGN PRINCIPLES

1. **Arabic is first-class, not translated.** Every UI element designed RTL-first. Every prompt tested in Arabic before English.
2. **No fake demos.** Every feature must work end-to-end. If we can't ship something properly, mark it "Coming Soon" — don't fake it.
3. **Type safety everywhere.** No `any`. Use Zod for all API boundaries.
4. **Server components by default.** Use client components only for interactivity.
5. **Streaming over polling.** Long-running attacks stream results via SSE.
6. **Privacy by default.** Never log user API keys. Audit logs redact PII before storage.
7. **Mobile-first.** The Playground must work on phones — engineers will demo it from their phones.

# DETECTION ENGINE INTERNALS (most important code)

The detection engine in `packages/core-engine` must work as follows:

```typescript
// Each attack pattern from attack-library.json
type AttackPattern = {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  language: 'ar' | 'en' | 'mixed';
  pattern_type: 'regex' | 'semantic' | 'unicode_check';
  pattern: string;          // regex source OR semantic description
  examples: string[];
  description_ar: string;
  description_en: string;
};

// Detection runs in two modes:
// MODE A: User attempts to attack the LLM (input scanning)
// MODE B: LLM response leaks something (output scanning)

// Three layers of detection:
// 1. Fast regex/unicode (sub-millisecond)
// 2. Semantic (small LLM call: Haiku 4.5 or Gemini Flash) — for nuanced attacks
// 3. Deep (Opus 4.7 or GPT-4) — only when explicitly requested

// PII patterns are Saudi-specific:
// - National ID: 10 digits, starts with 1 (citizen) or 2 (resident)
// - IBAN: SA + 22 digits
// - Iqama: 10 digits starting with 2
// - Saudi phone: +966 5XXXXXXXX or 05XXXXXXXX
// - Crescent number (military): specific format

// Arabic-specific Unicode checks:
// - Mixed script direction in suspicious patterns
// - Excessive kashida (ـ) used as steganography
// - Diacritic-heavy text used to evade tokenization
// - Arabic-Indic numerals (٠-٩) mixed with Western (0-9)
```

# SECRETS YOU NEED (set in Replit Secrets)

- DATABASE_URL (auto-set by Replit Postgres)
- ANTHROPIC_API_KEY (for our internal judge calls)
- OPENAI_API_KEY (for our internal judge calls)
- GOOGLE_AI_API_KEY (for our internal judge calls)
- AUTH_SECRET (random 32 bytes)
- RESEND_API_KEY (for magic links — get free tier)
- BASE_URL (https://dir3.replit.app or custom domain)

# WHAT TO DO IF STUCK

- If a feature blocks for >30 minutes: skip it, mark TODO, move on. We can come back.
- If TypeScript errors pile up: don't disable, fix them. Use proper types.
- If the UI looks generic: it's OK for now. Ship functionality first, polish in Phase 6.
- If you don't understand a requirement: read 02-PRD-FULL.md for the detailed spec.
- If you need a system prompt I haven't given you: check 06-SYSTEM-PROMPTS.md.

# BEGIN

Read these files in this order before writing code:
1. 03-ARCHITECTURE.md
2. 04-database-schema.sql  
3. 06-SYSTEM-PROMPTS.md
4. 07-attack-library.json (skim — you'll load it programmatically)
5. 02-PRD-FULL.md (reference)

Then start Phase 1. Confirm setup is working by deploying a "Hello Dir3" page in both Arabic and English with proper RTL support before moving on.

Build aggressively. Skip nothing in Phases 1-3. Cut from Phase 5 if needed.

GO.
```

---

## TIPS FOR USING THE PROMPT WITH REPLIT AGENT

1. **Start with the prompt above + files 03, 04, 06.** That's the minimum context for Phase 1.
2. **After Phase 1 ships:** add 07 (attack library) for Phase 2.
3. **For Phase 4:** add 08 + 09 for compliance.
4. **Keep prompt small per turn.** Replit Agent context window has limits.
5. **Commit every 30 minutes.** Use Git tab in Replit to push to GitHub.
6. **If Agent goes off-track:** stop, tell it explicitly "Return to Phase X step Y" and re-paste the relevant section of this prompt.

---

## FALLBACK PROMPT (if main prompt is too long)

If Replit Agent rejects the prompt for length, use this minimal version:

```
Build Dir3 — an Arabic-native AI guardrails platform with Playground, Proxy, Compliance Scanner, Shield Generator, Leaderboard, and CLI.

Tech: Next.js 15 + Hono + Postgres + Drizzle + TailwindCSS + shadcn + TypeScript + Turborepo.

Read the attached PRD (02-PRD-FULL.md) for complete spec. Build in this order: Foundation → Playground → Proxy → Scanner → Shield/Leaderboard/CLI → Polish → Ship.

Start by setting up the monorepo and core detection engine in packages/core-engine. Then build a "Hello Dir3" bilingual landing page to verify everything works.

GO.
```
