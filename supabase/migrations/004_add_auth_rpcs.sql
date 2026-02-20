-- ============================================================
-- 004_add_auth_rpcs.sql
-- ApprovalGraph — RPC functions for auth and usage tracking
-- ============================================================

-- ─── 1. upsert_user ─────────────────────────────────────────
-- Creates or updates a user from Google OAuth profile data.
-- Returns the user row.
CREATE OR REPLACE FUNCTION upsert_user(
  p_google_id   TEXT,
  p_email       TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_avatar_url  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  google_id     TEXT,
  email         TEXT,
  display_name  TEXT,
  avatar_url    TEXT,
  plan          TEXT,
  created_at    TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO users (google_id, email, display_name, avatar_url, last_login_at)
  VALUES (p_google_id, p_email, p_display_name, p_avatar_url, now())
  ON CONFLICT (google_id) DO UPDATE
  SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    last_login_at = now()
  RETURNING
    users.id, users.google_id, users.email, users.display_name,
    users.avatar_url, users.plan, users.created_at, users.last_login_at;
END;
$$;

-- ─── 2. increment_usage ─────────────────────────────────────
-- Increments daily usage count for a user/mode combo.
-- Returns the updated count for the day.
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id UUID,
  p_mode    TEXT DEFAULT 'lite'
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO usage_tracking (user_id, usage_date, mode, count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, p_mode, 1, now())
  ON CONFLICT (user_id, usage_date, mode)
  DO UPDATE SET
    count = usage_tracking.count + 1,
    updated_at = now()
  RETURNING usage_tracking.count INTO v_count;

  RETURN v_count;
END;
$$;

-- ─── 3. get_daily_usage ─────────────────────────────────────
-- Returns today's usage count for a user/mode.
CREATE OR REPLACE FUNCTION get_daily_usage(
  p_user_id UUID,
  p_mode    TEXT DEFAULT 'lite'
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT count INTO v_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE
    AND mode = p_mode;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- ─── 4. check_usage_limit ───────────────────────────────────
-- Returns whether the user can still use the given mode today.
-- lite: 5/day for free plan, unlimited for pro/enterprise
-- pro: unlimited for pro/enterprise, 0 for free
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_mode    TEXT DEFAULT 'lite'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_plan  TEXT;
  v_count INT;
BEGIN
  -- Get user plan
  SELECT plan INTO v_plan FROM users WHERE id = p_user_id;

  IF v_plan IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Pro/enterprise users have unlimited access
  IF v_plan IN ('pro', 'enterprise') THEN
    RETURN TRUE;
  END IF;

  -- Free plan: lite mode has 5/day limit, pro mode not available
  IF p_mode = 'pro' THEN
    RETURN FALSE;
  END IF;

  -- Check lite usage
  SELECT count INTO v_count
  FROM usage_tracking
  WHERE user_id = p_user_id
    AND usage_date = CURRENT_DATE
    AND mode = 'lite';

  RETURN COALESCE(v_count, 0) < 5;
END;
$$;
