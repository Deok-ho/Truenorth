-- ============================================================
-- Truenorth: Combined SQL Migration
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/bqczjqfeehsyplneejdt/sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 001: Core Tables
-- ══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parser_rules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  groupware_type TEXT        NOT NULL,
  dom_hash       TEXT        NOT NULL,
  selectors      JSONB       NOT NULL DEFAULT '{}',
  use_count      INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_parser_rules_type_hash UNIQUE (groupware_type, dom_hash)
);
CREATE INDEX IF NOT EXISTS idx_parser_rules_groupware ON parser_rules (groupware_type);
CREATE INDEX IF NOT EXISTS idx_parser_rules_dom_hash ON parser_rules (dom_hash);

CREATE TABLE IF NOT EXISTS documents (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type            TEXT,
  subject             TEXT,
  body                TEXT,
  requester_name      TEXT,
  requester_dept      TEXT,
  approval_line       JSONB       NOT NULL DEFAULT '[]',
  created_at_doc      TEXT,
  groupware           TEXT,
  summary             JSONB,
  coherence           JSONB,
  recommendation      TEXT,
  topics              TEXT[]      DEFAULT '{}',
  similar_docs_insight TEXT,
  analyzed_at         TIMESTAMPTZ,
  inserted_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_topics ON documents USING GIN (topics);
CREATE INDEX IF NOT EXISTS idx_documents_analyzed_at ON documents (analyzed_at DESC) WHERE analyzed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_groupware ON documents (groupware);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents (doc_type);

CREATE TABLE IF NOT EXISTS coherence_rules (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name        TEXT        NOT NULL,
  rule_description TEXT,
  category         TEXT,
  priority         INT         NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coherence_rules_active ON coherence_rules (is_active, priority);

CREATE TABLE IF NOT EXISTS graph_nodes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type  TEXT        NOT NULL CHECK (node_type IN ('document', 'topic', 'person', 'rule')),
  label      TEXT        NOT NULL,
  properties JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_graph_nodes_type_label UNIQUE (node_type, label)
);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes (node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON graph_nodes (label);

CREATE TABLE IF NOT EXISTS graph_edges (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id  UUID        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relation_type   TEXT        NOT NULL CHECK (relation_type IN ('SIMILAR_TO','ABOUT','AUTHORED_BY','REVIEWED_BY','VIOLATES','PASSES')),
  weight          FLOAT       NOT NULL DEFAULT 1.0,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges (target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON graph_edges (relation_type);

-- ══════════════════════════════════════════════════════════════
-- 002: RPC Functions
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_rule_use_count(rule_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  UPDATE parser_rules SET use_count = use_count + 1 WHERE id = rule_id;
END; $$;

CREATE OR REPLACE FUNCTION find_similar_documents_rpc(
  search_topics TEXT[], exclude_doc_id UUID DEFAULT NULL, max_results INT DEFAULT 5
) RETURNS TABLE (
  id UUID, subject TEXT, doc_type TEXT, summary JSONB, coherence JSONB,
  topics TEXT[], analyzed_at TIMESTAMPTZ, overlap_count BIGINT
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  IF array_length(search_topics, 1) IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT d.id, d.subject, d.doc_type, d.summary, d.coherence, d.topics, d.analyzed_at,
    (SELECT COUNT(*) FROM unnest(d.topics) t WHERE t = ANY(search_topics)) AS overlap_count
  FROM documents d
  WHERE d.analyzed_at IS NOT NULL AND d.topics && search_topics
    AND (exclude_doc_id IS NULL OR d.id != exclude_doc_id)
  ORDER BY overlap_count DESC, d.analyzed_at DESC LIMIT max_results;
END; $$;

CREATE OR REPLACE FUNCTION get_node_neighbors(
  target_node_id UUID, relation_filter TEXT DEFAULT NULL
) RETURNS TABLE (
  edge_id UUID, neighbor_node_id UUID, neighbor_type TEXT, neighbor_label TEXT,
  neighbor_properties JSONB, relation_type TEXT, weight FLOAT, direction TEXT, metadata JSONB
) LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, n.id, n.node_type, n.label, n.properties, e.relation_type, e.weight, 'outgoing'::TEXT, e.metadata
  FROM graph_edges e INNER JOIN graph_nodes n ON n.id = e.target_node_id
  WHERE e.source_node_id = target_node_id AND (relation_filter IS NULL OR e.relation_type = relation_filter)
  UNION ALL
  SELECT e.id, n.id, n.node_type, n.label, n.properties, e.relation_type, e.weight, 'incoming'::TEXT, e.metadata
  FROM graph_edges e INNER JOIN graph_nodes n ON n.id = e.source_node_id
  WHERE e.target_node_id = target_node_id AND (relation_filter IS NULL OR e.relation_type = relation_filter)
  ORDER BY weight DESC, neighbor_label ASC;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- 003: Users, Analyses, Usage Tracking
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id       TEXT        UNIQUE NOT NULL,
  email           TEXT        NOT NULL,
  display_name    TEXT,
  avatar_url      TEXT,
  plan            TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE TABLE IF NOT EXISTS analyses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  document_id     UUID        REFERENCES documents(id) ON DELETE CASCADE,
  mode            TEXT        NOT NULL DEFAULT 'pro' CHECK (mode IN ('lite', 'pro')),
  lite_result     JSONB,
  pro_result      JSONB,
  overall_score   INT,
  checks_run      TEXT[]      DEFAULT '{}',
  model_used      TEXT,
  cost_krw        NUMERIC(10,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_document_id ON analyses (document_id);
CREATE INDEX IF NOT EXISTS idx_analyses_mode ON analyses (mode);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses (created_at DESC);

CREATE TABLE IF NOT EXISTS usage_tracking (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  mode            TEXT        NOT NULL DEFAULT 'lite' CHECK (mode IN ('lite', 'pro')),
  count           INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_usage_user_date_mode UNIQUE (user_id, usage_date, mode)
);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_date ON usage_tracking (user_id, usage_date);

ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='users' AND policyname='Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='analyses' AND policyname='Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON analyses FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usage_tracking' AND policyname='Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON usage_tracking FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════
-- 004: Auth & Usage RPC Functions
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION upsert_user(
  p_google_id TEXT, p_email TEXT, p_display_name TEXT DEFAULT NULL, p_avatar_url TEXT DEFAULT NULL
) RETURNS TABLE (
  id UUID, google_id TEXT, email TEXT, display_name TEXT, avatar_url TEXT,
  plan TEXT, created_at TIMESTAMPTZ, last_login_at TIMESTAMPTZ
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  INSERT INTO users (google_id, email, display_name, avatar_url, last_login_at)
  VALUES (p_google_id, p_email, p_display_name, p_avatar_url, now())
  ON CONFLICT (google_id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    last_login_at = now()
  RETURNING users.id, users.google_id, users.email, users.display_name,
    users.avatar_url, users.plan, users.created_at, users.last_login_at;
END; $$;

CREATE OR REPLACE FUNCTION increment_usage(p_user_id UUID, p_mode TEXT DEFAULT 'lite')
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_count INT;
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, mode, count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_mode, 1, now())
  ON CONFLICT (user_id, usage_date, mode) DO UPDATE SET
    count = usage_tracking.count + 1, updated_at = now()
  RETURNING usage_tracking.count INTO v_count;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION get_daily_usage(p_user_id UUID, p_mode TEXT DEFAULT 'lite')
RETURNS INT LANGUAGE plpgsql STABLE AS $$
DECLARE v_count INT;
BEGIN
  SELECT count INTO v_count FROM usage_tracking
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE AND mode = p_mode;
  RETURN COALESCE(v_count, 0);
END; $$;

CREATE OR REPLACE FUNCTION check_usage_limit(p_user_id UUID, p_mode TEXT DEFAULT 'lite')
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE v_plan TEXT; v_count INT;
BEGIN
  SELECT plan INTO v_plan FROM users WHERE id = p_user_id;
  IF v_plan IS NULL THEN RETURN FALSE; END IF;
  IF v_plan IN ('pro', 'enterprise') THEN RETURN TRUE; END IF;
  IF p_mode = 'pro' THEN RETURN FALSE; END IF;
  SELECT count INTO v_count FROM usage_tracking
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE AND mode = 'lite';
  RETURN COALESCE(v_count, 0) < 5;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- 005: Career Management Tables (Goals, Metrics)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS goals (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  description     TEXT        DEFAULT '',
  deadline        DATE,
  progress        INT         NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  source          TEXT        NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  related_doc_ids UUID[]      DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals (user_id);

CREATE TABLE IF NOT EXISTS metrics (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  current_value   TEXT        NOT NULL DEFAULT '0',
  target_value    TEXT        NOT NULL DEFAULT '0',
  source          TEXT        NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual')),
  linked_goal_id  UUID        REFERENCES goals(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_metrics_user_id ON metrics (user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='goals' AND policyname='Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON goals FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metrics' AND policyname='Allow all for anon') THEN
    CREATE POLICY "Allow all for anon" ON metrics FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
