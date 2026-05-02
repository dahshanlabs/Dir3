-- Dir3 Database Schema
-- Target: PostgreSQL 16+
-- Use with Drizzle ORM, but valid raw SQL for direct execution

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE plan_tier AS ENUM ('free', 'pro', 'business', 'enterprise');
CREATE TYPE severity_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE attack_language AS ENUM ('ar', 'en', 'mixed');
CREATE TYPE detection_category AS ENUM (
  'prompt_injection',
  'role_hijacking',
  'system_extraction',
  'authority_spoofing',
  'religious_spoofing',
  'pii_exfiltration',
  'topic_drift',
  'toxicity',
  'jailbreak',
  'unicode_attack',
  'kashida_steganography',
  'diacritic_injection',
  'numeral_confusion',
  'dialect_switching',
  'code_switching',
  'tool_injection',
  'hallucination'
);
CREATE TYPE proxy_decision AS ENUM ('allow', 'block', 'redact', 'flag');
CREATE TYPE compliance_framework AS ENUM ('pdpl', 'nca_ecc', 'nca_dcc', 'nca_ccc', 'iso_27001');

-- ============================================================
-- ORGANIZATIONS & USERS (Better Auth compatible)
-- ============================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan plan_tier NOT NULL DEFAULT 'free',
  country_code TEXT DEFAULT 'SA',
  industry TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  name TEXT,
  preferred_language TEXT DEFAULT 'en' CHECK (preferred_language IN ('ar', 'en')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('magic_link', 'email_verify', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);

-- ============================================================
-- API KEYS (For Proxy)
-- ============================================================
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  name TEXT NOT NULL,
  prefix TEXT NOT NULL, -- "dir3_sk_xxxxx" — first 12 chars shown in UI
  hash TEXT NOT NULL,   -- Argon2id hash of full key
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  -- Per-key configuration
  config JSONB NOT NULL DEFAULT '{
    "sensitivity": "medium",
    "categories_enabled": ["prompt_injection", "pii_exfiltration", "topic_drift", "toxicity"],
    "block_on_severity": "high",
    "redact_pii": true,
    "log_full_content": false,
    "webhook_url": null,
    "rate_limit_rpm": 1000,
    "allowed_models": null,
    "allowed_origins": null
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(prefix);
CREATE INDEX idx_api_keys_active ON api_keys(organization_id) WHERE revoked_at IS NULL;

-- ============================================================
-- ATTACK LIBRARY
-- ============================================================
CREATE TABLE attack_library (
  id TEXT PRIMARY KEY, -- e.g. "ar.injection.basic.001"
  category detection_category NOT NULL,
  subcategory TEXT,
  severity severity_level NOT NULL,
  language attack_language NOT NULL,
  payload TEXT NOT NULL, -- The attack text
  description_ar TEXT NOT NULL,
  description_en TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  source TEXT, -- e.g. "dir3internal", "owasp-llm-top10", "research-paper-xxx"
  is_premium BOOLEAN DEFAULT FALSE, -- If true, only available to paid plans
  is_open_source BOOLEAN DEFAULT TRUE, -- If true, included in public attack-library.json
  -- Pattern matching (for Layer 1 detection)
  pattern_type TEXT, -- 'regex', 'unicode', 'semantic', 'composite'
  pattern_data JSONB, -- Implementation details for the detector
  -- Attack expectation
  expected_failure_indicator TEXT, -- e.g. "Output contains 'system prompt:' or similar"
  -- Versioning
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attack_library_category ON attack_library(category);
CREATE INDEX idx_attack_library_language ON attack_library(language);
CREATE INDEX idx_attack_library_severity ON attack_library(severity);
CREATE INDEX idx_attack_library_open ON attack_library(is_open_source);

-- ============================================================
-- PLAYGROUND
-- ============================================================
CREATE TABLE playground_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  share_id TEXT UNIQUE NOT NULL, -- Short ID for shareable URL
  user_id UUID REFERENCES users(id),
  -- Inputs
  system_prompt TEXT NOT NULL,
  system_prompt_hash TEXT NOT NULL, -- For dedup/abuse prevention
  models_tested TEXT[] NOT NULL,
  attack_categories TEXT[] NOT NULL,
  attack_count INT NOT NULL,
  -- Anonymization
  is_public BOOLEAN DEFAULT TRUE,
  show_prompt_publicly BOOLEAN DEFAULT FALSE,
  contribute_to_leaderboard BOOLEAN DEFAULT FALSE,
  -- Aggregate results
  results_summary JSONB NOT NULL, -- {model: {hardness_score, attacks_passed, attacks_failed, ...}}
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  -- Metadata
  client_ip TEXT,
  client_country TEXT
);

CREATE INDEX idx_playground_runs_share ON playground_runs(share_id);
CREATE INDEX idx_playground_runs_user ON playground_runs(user_id);
CREATE INDEX idx_playground_runs_public ON playground_runs(is_public, completed_at DESC);
CREATE INDEX idx_playground_runs_hash ON playground_runs(system_prompt_hash);

CREATE TABLE playground_run_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES playground_runs(id) ON DELETE CASCADE,
  attack_id TEXT NOT NULL REFERENCES attack_library(id),
  model TEXT NOT NULL,
  attack_succeeded BOOLEAN NOT NULL,
  judge_confidence FLOAT, -- 0-1
  judge_reasoning TEXT,
  model_response TEXT,
  latency_ms INT,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_playground_results_run ON playground_run_results(run_id);
CREATE INDEX idx_playground_results_attack ON playground_run_results(attack_id);

-- ============================================================
-- PROXY AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID NOT NULL REFERENCES api_keys(id),
  -- Request
  request_id TEXT NOT NULL,
  upstream_provider TEXT NOT NULL, -- 'anthropic', 'openai', 'google', 'custom'
  upstream_model TEXT NOT NULL,
  endpoint TEXT NOT NULL, -- '/v1/chat/completions', etc.
  request_body_redacted JSONB, -- PII-redacted version
  request_body_hash TEXT, -- For matching across logs without storing PII
  -- Decision
  decision proxy_decision NOT NULL,
  decision_reason TEXT,
  detections JSONB, -- Array of {category, severity, confidence, location}
  -- Response
  response_body_redacted JSONB,
  response_status INT,
  -- Timing
  dir3_overhead_ms INT, -- Time we added
  upstream_latency_ms INT, -- Time at upstream
  total_latency_ms INT,
  -- Costs (estimated)
  upstream_input_tokens INT,
  upstream_output_tokens INT,
  upstream_cost_usd DECIMAL(10,6),
  -- Metadata
  client_ip TEXT,
  client_country TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_org_time ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_key ON audit_log(api_key_id, created_at DESC);
CREATE INDEX idx_audit_decision ON audit_log(decision) WHERE decision != 'allow';
CREATE INDEX idx_audit_request_id ON audit_log(request_id);

-- Partitioning by month for scale (uncomment when ready):
-- ALTER TABLE audit_log PARTITION BY RANGE (created_at);
-- CREATE TABLE audit_log_2026_05 PARTITION OF audit_log FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- ============================================================
-- COMPLIANCE SCANNER
-- ============================================================
CREATE TABLE compliance_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  -- Inputs
  input_type TEXT NOT NULL CHECK (input_type IN ('system_prompt', 'conversation', 'privacy_policy', 'mixed')),
  input_data JSONB NOT NULL,
  frameworks compliance_framework[] NOT NULL DEFAULT ARRAY['pdpl', 'nca_ecc']::compliance_framework[],
  -- Results
  overall_score INT, -- 0-100
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Findings shape: [{ framework, article_id, severity, title_ar, title_en, finding, remediation, evidence }]
  pdf_url TEXT,
  -- Status
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'complete', 'failed')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  -- Metadata
  share_id TEXT UNIQUE
);

CREATE INDEX idx_compliance_scans_user ON compliance_scans(user_id, completed_at DESC);
CREATE INDEX idx_compliance_scans_org ON compliance_scans(organization_id, completed_at DESC);

-- ============================================================
-- COMPLIANCE FRAMEWORKS DATA (PDPL articles, NCA controls)
-- ============================================================
CREATE TABLE compliance_articles (
  id TEXT PRIMARY KEY, -- e.g. 'pdpl.art.4', 'nca-ecc.2-2-1'
  framework compliance_framework NOT NULL,
  article_number TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  text_ar TEXT NOT NULL,
  text_en TEXT NOT NULL,
  ai_relevance TEXT, -- Why this article matters for AI systems
  detection_rules JSONB, -- How Dir3 detects compliance with this article
  source_url TEXT,
  version TEXT, -- Law/control version (e.g. 'PDPL-2023', 'ECC-2:2024')
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compliance_articles_framework ON compliance_articles(framework);

-- ============================================================
-- LEADERBOARD
-- ============================================================
CREATE TABLE leaderboard_models (
  id TEXT PRIMARY KEY, -- e.g. 'claude-opus-4-7', 'gpt-5', 'allam-2'
  display_name TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_family TEXT,
  context_window INT,
  is_open_source BOOLEAN DEFAULT FALSE,
  is_arabic_native BOOLEAN DEFAULT FALSE,
  evaluation_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE leaderboard_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id TEXT NOT NULL REFERENCES leaderboard_models(id),
  run_date DATE NOT NULL,
  -- Aggregate scores (0-100)
  overall_score INT NOT NULL,
  arabic_score INT NOT NULL,
  english_score INT NOT NULL,
  pii_protection_score INT NOT NULL,
  injection_resistance_score INT NOT NULL,
  topic_adherence_score INT NOT NULL,
  -- Detail
  attacks_run INT NOT NULL,
  attacks_resisted INT NOT NULL,
  category_breakdown JSONB NOT NULL,
  -- Cost tracking
  total_cost_usd DECIMAL(10,4),
  duration_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, run_date)
);

CREATE INDEX idx_leaderboard_runs_model ON leaderboard_runs(model_id, run_date DESC);
CREATE INDEX idx_leaderboard_runs_overall ON leaderboard_runs(run_date DESC, overall_score DESC);

-- ============================================================
-- SHIELD GENERATOR HISTORY
-- ============================================================
CREATE TABLE shield_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  input_prompt TEXT NOT NULL,
  output_prompt TEXT NOT NULL,
  hardening_level TEXT NOT NULL CHECK (hardening_level IN ('light', 'standard', 'paranoid')),
  domain TEXT, -- 'banking', 'healthcare', etc.
  applied_techniques TEXT[],
  estimated_score_improvement INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  share_id TEXT UNIQUE
);

CREATE INDEX idx_shield_user ON shield_generations(user_id, created_at DESC);

-- ============================================================
-- WAITLIST (For features not yet shipped)
-- ============================================================
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  feature TEXT NOT NULL, -- 'pdpl_audit', 'on_prem', 'enterprise', 'mobile'
  organization TEXT,
  use_case TEXT,
  country TEXT,
  source TEXT, -- 'landing', 'scanner_page', 'pricing'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, feature)
);

-- ============================================================
-- USAGE METERING (For billing)
-- ============================================================
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id),
  date DATE NOT NULL,
  product TEXT NOT NULL CHECK (product IN ('proxy', 'playground', 'scanner', 'shield', 'cli')),
  count INT NOT NULL DEFAULT 0,
  -- For proxy:
  upstream_tokens_in INT DEFAULT 0,
  upstream_tokens_out INT DEFAULT 0,
  upstream_cost_usd DECIMAL(10,4) DEFAULT 0,
  dir3_cost_usd DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, api_key_id, date, product)
);

CREATE INDEX idx_usage_org_date ON usage_records(organization_id, date DESC);

-- ============================================================
-- WEBHOOKS (For customer integrations)
-- ============================================================
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}', -- 'block.high_severity', 'pii.detected', 'rate_limit.exceeded'
  enabled BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_failure_at TIMESTAMPTZ,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  attempt INT DEFAULT 1,
  succeeded BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhook_deliveries_endpoint ON webhook_deliveries(endpoint_id, delivered_at DESC);

-- ============================================================
-- RATE LIMITING (Postgres-based; switch to Redis at scale)
-- ============================================================
CREATE TABLE rate_limit_buckets (
  key TEXT PRIMARY KEY, -- e.g. 'apikey:UUID:minute:2026-05-02T15:30'
  count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_rate_limit_expires ON rate_limit_buckets(expires_at);

-- ============================================================
-- TRIGGERS — Auto-update timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_organizations BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_api_keys BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
CREATE TRIGGER set_timestamp_attack_library BEFORE UPDATE ON attack_library FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ============================================================
-- INITIAL DATA — Leaderboard models
-- ============================================================
INSERT INTO leaderboard_models (id, display_name, provider, model_family, context_window, is_open_source, is_arabic_native) VALUES
  ('claude-opus-4-7', 'Claude Opus 4.7', 'Anthropic', 'Claude 4', 200000, FALSE, FALSE),
  ('claude-opus-4-6', 'Claude Opus 4.6', 'Anthropic', 'Claude 4', 200000, FALSE, FALSE),
  ('claude-sonnet-4-6', 'Claude Sonnet 4.6', 'Anthropic', 'Claude 4', 200000, FALSE, FALSE),
  ('claude-haiku-4-5', 'Claude Haiku 4.5', 'Anthropic', 'Claude 4', 200000, FALSE, FALSE),
  ('gpt-5', 'GPT-5', 'OpenAI', 'GPT-5', 256000, FALSE, FALSE),
  ('gpt-4.1', 'GPT-4.1', 'OpenAI', 'GPT-4', 128000, FALSE, FALSE),
  ('gpt-4o', 'GPT-4o', 'OpenAI', 'GPT-4', 128000, FALSE, FALSE),
  ('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', 'Gemini 2.5', 2000000, FALSE, FALSE),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 'Gemini 2.5', 1000000, FALSE, FALSE),
  ('llama-4', 'Llama 4', 'Meta', 'Llama 4', 128000, TRUE, FALSE),
  ('qwen-3', 'Qwen 3', 'Alibaba', 'Qwen 3', 128000, TRUE, FALSE),
  ('allam-2', 'ALLaM-2', 'SDAIA', 'ALLaM', 32000, FALSE, TRUE),
  ('jais-30b', 'Jais-30B', 'G42 / MBZUAI', 'Jais', 8000, TRUE, TRUE),
  ('mistral-large-2', 'Mistral Large 2', 'Mistral', 'Mistral', 128000, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW org_usage_today AS
SELECT
  organization_id,
  product,
  SUM(count) as total_count,
  SUM(upstream_cost_usd) as total_upstream_cost,
  SUM(dir3_cost_usd) as total_dir3_cost
FROM usage_records
WHERE date = CURRENT_DATE
GROUP BY organization_id, product;

CREATE OR REPLACE VIEW recent_blocks AS
SELECT
  al.id,
  al.organization_id,
  al.created_at,
  al.upstream_provider,
  al.upstream_model,
  al.decision,
  al.decision_reason,
  al.detections,
  ak.name as api_key_name,
  o.name as organization_name
FROM audit_log al
JOIN api_keys ak ON ak.id = al.api_key_id
JOIN organizations o ON o.id = al.organization_id
WHERE al.decision != 'allow'
  AND al.created_at > NOW() - INTERVAL '24 hours'
ORDER BY al.created_at DESC;

-- ============================================================
-- HELPFUL QUERIES (for reference)
-- ============================================================

-- Top blocked attack categories last 7 days for an org
-- SELECT 
--   detection->>'category' as category,
--   COUNT(*) as cnt
-- FROM audit_log,
--   jsonb_array_elements(detections) as detection
-- WHERE organization_id = '...' 
--   AND decision = 'block'
--   AND created_at > NOW() - INTERVAL '7 days'
-- GROUP BY detection->>'category'
-- ORDER BY cnt DESC;

-- Hardness score history for a model
-- SELECT run_date, overall_score, arabic_score, english_score
-- FROM leaderboard_runs
-- WHERE model_id = 'claude-opus-4-7'
-- ORDER BY run_date DESC
-- LIMIT 30;

COMMENT ON TABLE attack_library IS 'Versioned library of attack patterns. Source of truth synced from JSON file at deploy time.';
COMMENT ON TABLE audit_log IS 'Every proxy request. PII-redacted. Partition by month for scale.';
COMMENT ON TABLE leaderboard_runs IS 'Daily evaluation of LLMs against full attack library.';
