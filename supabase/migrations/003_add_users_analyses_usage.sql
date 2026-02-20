-- ============================================================
-- 003_add_users_analyses_usage.sql
-- ApprovalGraph — Users, Analyses, Usage Tracking
-- Supports lite/pro mode, Google OAuth users, daily usage limits
-- ============================================================

-- ─── 1. users ────────────────────────────────────────────────
-- Stores Google OAuth user profiles.
-- The id matches auth.users.id when using Supabase Auth,
-- or a stable Google sub identifier for anonymous tracking.
CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id       TEXT        UNIQUE NOT NULL,
  email           TEXT        NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  plan            TEXT        NOT NULL DEFAULT 'free'
                    CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ─── 2. analyses ─────────────────────────────────────────────
-- Stores individual analysis runs with mode (lite/pro) tracking.
-- Links to both the user who ran it and the source document.
CREATE TABLE IF NOT EXISTS analyses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  document_id     UUID        REFERENCES documents(id) ON DELETE CASCADE,
  mode            TEXT        NOT NULL DEFAULT 'pro'
                    CHECK (mode IN ('lite', 'pro')),
  -- Lite mode results (subset of checks)
  lite_result     JSONB,
  -- Full pro mode results
  pro_result      JSONB,
  -- Overall score for quick display
  overall_score   INT,
  -- Which checks were run
  checks_run      TEXT[]      DEFAULT '{}',
  -- Model used for analysis
  model_used      TEXT,
  -- Cost tracking (approximate token cost in KRW)
  cost_krw        NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_document_id ON analyses (document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_mode ON analyses (mode);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

-- ─── 3. usage_tracking ──────────────────────────────────────
-- Tracks daily usage per user per mode for rate limiting.
-- lite mode: 5 free uses per day
CREATE TABLE IF NOT EXISTS usage_tracking (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  mode            TEXT        NOT NULL DEFAULT 'lite'
                    CHECK (mode IN ('lite', 'pro')),
  count           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_usage_user_date_mode UNIQUE (user_id, usage_date, mode)
);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking (user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_mode ON usage_tracking (mode);

-- ─── 4. Add user_id to existing documents table ─────────────
-- Links documents to the user who uploaded/analyzed them.
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);

-- ─── 5. RLS Policies ────────────────────────────────────────
-- Enable Row Level Security on all user-facing tables.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations through the anon key
-- (the extension handles auth at the application level).
-- In production, these should be scoped to authenticated users.
CREATE POLICY "Allow all for anon" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON analyses
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON usage_tracking
  FOR ALL USING (true) WITH CHECK (true);
