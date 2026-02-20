-- ============================================================
-- 002_create_rpcs.sql
-- ApprovalGraph — RPC functions for Supabase (PostgreSQL)
-- ============================================================

-- ─── 1. increment_rule_use_count ────────────────────────────
CREATE OR REPLACE FUNCTION increment_rule_use_count(rule_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE parser_rules
  SET use_count = use_count + 1
  WHERE id = rule_id;
END;
$$;

-- ─── 2. find_similar_documents_rpc ──────────────────────────
-- Alternative RPC-based similarity search (backup for client-side query)
CREATE OR REPLACE FUNCTION find_similar_documents_rpc(
  search_topics TEXT[],
  exclude_doc_id UUID DEFAULT NULL,
  max_results INT DEFAULT 5
)
RETURNS TABLE (
  id               UUID,
  subject          TEXT,
  doc_type         TEXT,
  summary          JSONB,
  coherence        JSONB,
  topics           TEXT[],
  analyzed_at      TIMESTAMPTZ,
  overlap_count    BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF array_length(search_topics, 1) IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    d.id,
    d.subject,
    d.doc_type,
    d.summary,
    d.coherence,
    d.topics,
    d.analyzed_at,
    (SELECT COUNT(*) FROM unnest(d.topics) t WHERE t = ANY(search_topics)) AS overlap_count
  FROM documents d
  WHERE d.analyzed_at IS NOT NULL
    AND d.topics && search_topics
    AND (exclude_doc_id IS NULL OR d.id != exclude_doc_id)
  ORDER BY overlap_count DESC, d.analyzed_at DESC
  LIMIT max_results;
END;
$$;

-- ─── 3. get_node_neighbors ──────────────────────────────────
CREATE OR REPLACE FUNCTION get_node_neighbors(
  target_node_id UUID,
  relation_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  edge_id             UUID,
  neighbor_node_id    UUID,
  neighbor_type       TEXT,
  neighbor_label      TEXT,
  neighbor_properties JSONB,
  relation_type       TEXT,
  weight              FLOAT,
  direction           TEXT,
  metadata            JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY

  -- Outgoing edges
  SELECT
    e.id, n.id, n.node_type, n.label, n.properties,
    e.relation_type, e.weight, 'outgoing'::TEXT, e.metadata
  FROM graph_edges e
  INNER JOIN graph_nodes n ON n.id = e.target_node_id
  WHERE e.source_node_id = target_node_id
    AND (relation_filter IS NULL OR e.relation_type = relation_filter)

  UNION ALL

  -- Incoming edges
  SELECT
    e.id, n.id, n.node_type, n.label, n.properties,
    e.relation_type, e.weight, 'incoming'::TEXT, e.metadata
  FROM graph_edges e
  INNER JOIN graph_nodes n ON n.id = e.source_node_id
  WHERE e.target_node_id = target_node_id
    AND (relation_filter IS NULL OR e.relation_type = relation_filter)

  ORDER BY weight DESC, neighbor_label ASC;
END;
$$;
