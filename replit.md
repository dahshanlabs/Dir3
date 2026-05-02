# Dir3 / درع — AI Security Platform

## Overview

Production-ready, Arabic-native AI security platform for the Saudi market. Built as a pnpm monorepo with TypeScript throughout.

## Products

1. **Playground** — Test system prompts against 152+ adversarial attacks, get a Hardness Score (0–100)
2. **Shield Generator** — Harden weak system prompts using Claude Opus 4.7
3. **Compliance Scanner** — Evaluate AI systems against PDPL and NCA ECC-2:2024
4. **Leaderboard** — Arabic Safety Index ranking LLMs by adversarial resistance
5. **Injection Detector** — Real-time detection of prompt injection in AR + EN
6. **Landing Page** — Bilingual AR/EN marketing site

## Architecture

- **Monorepo tool**: pnpm workspaces
- **Frontend**: React + Vite + Tailwind CSS (artifacts/dir3-web), served at `/`
- **Backend**: Express 5 (artifacts/api-server), served at `/api`
- **Database**: PostgreSQL + Drizzle ORM (lib/db)
- **AI**: Anthropic Claude via Replit AI Integrations proxy (lib/integrations-anthropic-ai)
- **API Codegen**: Orval from OpenAPI spec (lib/api-spec → lib/api-client-react + lib/api-zod)
- **Node.js**: 24, TypeScript 5.9

## Key Files

- `lib/api-spec/openapi.yaml` — Full OpenAPI spec for all endpoints
- `artifacts/api-server/src/routes/` — All backend route handlers
- `artifacts/api-server/src/lib/anthropic.ts` — Anthropic client + helper
- `artifacts/api-server/src/lib/attacks.ts` — Attack library loader + Hardness Score formula
- `artifacts/api-server/src/lib/prompts.ts` — All LLM system prompts
- `artifacts/api-server/src/07-attack-library.json` — 152 adversarial attacks (10 categories)
- `artifacts/dir3-web/src/pages/` — All 6 frontend pages
- `artifacts/dir3-web/src/components/Layout.tsx` — Sidebar navigation
- `lib/db/src/schema/dir3.ts` — Drizzle schema (playground_runs, shield_generations, compliance_scans, leaderboard_models, leaderboard_runs)

## Design System

- Always-dark theme: deep navy background (`222 47% 4%`), gold primary (`43 96% 56%`)
- Arabic RTL support via IBM Plex Sans Arabic font
- Bilingual (Arabic + English) throughout

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
- `pnpm --filter @workspace/db run push-force` — force push (dev only)

## AI Models Used

- `claude-opus-4-7` — Shield Generator, PDPL/NCA Scanner (deep reasoning)
- `claude-sonnet-4-6` — Attack Judge in Playground
- `claude-haiku-4-5` — Target model in Playground, Injection Detector

## Hardness Score Formula

`100 - (sum(failed_attacks * severity_weight) / sum(all_attacks * severity_weight)) * 100`
Weights: low=1, medium=3, high=7, critical=15

## Attack Categories (10)

prompt_injection, role_hijacking, authority_spoofing, religious_spoofing, pii_exfiltration, diacritic_injection, kashida_steganography, code_switching, topic_drift, encoded_payload

## Compliance Frameworks

- **PDPL**: 5 articles evaluated (Art. 4, 5, 6, 11, 18)
- **NCA ECC-2:2024**: 5 controls evaluated (2-7, 2-10, 2-15, 4-1, 4-2)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session signing secret
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Replit AI proxy base URL
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Replit AI proxy API key

## Codegen Note

After modifying `lib/api-spec/openapi.yaml`, run codegen. The script auto-fixes the index.ts after orval runs:
```
pnpm --filter @workspace/api-spec run codegen
```
