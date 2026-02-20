-- ============================================================
-- 001_create_tables.sql
-- ApprovalGraph — Core schema for Supabase (PostgreSQL)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. parser_rules ──────────────────────────────────────────
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

-- ─── 2. documents ─────────────────────────────────────────────
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
  -- Analysis results (populated after AI analysis)
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

-- ─── 3. coherence_rules ───────────────────────────────────────
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

-- ─── 4. graph_nodes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_nodes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  node_type  TEXT        NOT NULL
               CHECK (node_type IN ('document', 'topic', 'person', 'rule')),
  label      TEXT        NOT NULL,
  properties JSONB       NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_graph_nodes_type_label UNIQUE (node_type, label)
);

CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes (node_type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_label ON graph_nodes (label);

-- ─── 5. graph_edges ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS graph_edges (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_node_id  UUID        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_node_id  UUID        NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relation_type   TEXT        NOT NULL
                    CHECK (relation_type IN (
                      'SIMILAR_TO', 'ABOUT', 'AUTHORED_BY',
                      'REVIEWED_BY', 'VIOLATES', 'PASSES'
                    )),
  weight          FLOAT       NOT NULL DEFAULT 1.0,
  metadata        JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges (source_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges (target_node_id);
CREATE INDEX IF NOT EXISTS idx_graph_edges_relation ON graph_edges (relation_type);
