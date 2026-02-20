import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@shared/constants';
import type {
  ParseRule,
  ParsedDocument,
  UserProfile,
  AnalysisMode,
  LiteAnalysisResult,
  AnalysisResult,
  UsageInfo,
  CareerGoal,
  CareerMetric,
  HistoryEntry,
  CareerDocument,
} from '@shared/types';

/**
 * Cached Supabase client instance (singleton per service worker lifecycle).
 */
let clientInstance: SupabaseClient | null = null;

/**
 * Retrieves or creates a Supabase client.
 * Reads URL/key from chrome.storage.local first, falling back to
 * compile-time environment variables.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (clientInstance) {
    return clientInstance;
  }

  let url = SUPABASE_URL;
  let anonKey = SUPABASE_ANON_KEY;

  // Attempt to read from chrome.storage.local
  try {
    const stored = await chrome?.storage?.local?.get([
      'supabaseUrl',
      'supabaseAnonKey',
    ]);

    if (stored?.supabaseUrl) {
      url = stored.supabaseUrl;
    }
    if (stored?.supabaseAnonKey) {
      anonKey = stored.supabaseAnonKey;
    }
  } catch {
    // chrome.storage not available — use fallback values
  }

  if (!url || !anonKey) {
    throw new Error(
      'Supabase URL 또는 Anon Key가 설정되지 않았습니다. ' +
        '확장 프로그램 설정에서 Supabase 정보를 입력하세요.',
    );
  }

  clientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return clientInstance;
}

/**
 * Looks up a cached parse rule for the given DOM hash and groupware type.
 * Returns null if no matching rule is found.
 */
export async function getParserRule(
  domHash: string,
  groupwareType: string,
): Promise<{ id: string; selectors: ParseRule } | null> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('parser_rules')
    .select('id, selectors')
    .eq('dom_hash', domHash)
    .eq('groupware_type', groupwareType)
    .order('use_count', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[ApprovalGraph] getParserRule error:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    selectors: data.selectors as ParseRule,
  };
}

/**
 * Saves a new parse rule to Supabase for future reuse.
 */
export async function saveParserRule(
  domHash: string,
  groupwareType: string,
  selectors: ParseRule,
): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client.from('parser_rules').insert({
    dom_hash: domHash,
    groupware_type: groupwareType,
    selectors,
    use_count: 1,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[ApprovalGraph] saveParserRule error:', error.message);
  }
}

/**
 * Increments the use_count for a specific parse rule.
 */
export async function incrementRuleUseCount(ruleId: string): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client.rpc('increment_rule_use_count', {
    rule_id: ruleId,
  });

  // Fallback: if RPC doesn't exist, try a manual update
  if (error) {
    const { data } = await client
      .from('parser_rules')
      .select('use_count')
      .eq('id', ruleId)
      .single();

    if (data) {
      await client
        .from('parser_rules')
        .update({ use_count: (data.use_count || 0) + 1 })
        .eq('id', ruleId);
    }
  }
}

/**
 * Saves a parsed document to Supabase.
 * Returns the generated document ID.
 */
export async function saveDocument(
  doc: ParsedDocument,
  userId?: string | null,
): Promise<{ id: string }> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('documents')
    .insert({
      doc_type: doc.doc_type || null,
      subject: doc.subject || null,
      body: doc.body || null,
      requester_name: doc.requester_name || null,
      requester_dept: doc.requester_dept || null,
      approval_line: doc.approval_line,
      created_at_doc: doc.created_at || null,
      groupware: doc.groupware || null,
      user_id: userId || null,
      inserted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`문서 저장 실패: ${error.message}`);
  }

  return { id: data.id };
}

/**
 * Updates a document record with analysis results.
 */
export async function updateDocumentAnalysis(
  docId: string,
  analysis: any,
): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client
    .from('documents')
    .update({
      summary: analysis.summary || null,
      coherence: analysis.coherence || null,
      recommendation: analysis.recommendation || null,
      topics: analysis.topics || [],
      similar_docs_insight: analysis.similar_docs_insight || null,
      analyzed_at: new Date().toISOString(),
    })
    .eq('id', docId);

  if (error) {
    console.error(
      '[ApprovalGraph] updateDocumentAnalysis error:',
      error.message,
    );
  }
}

/**
 * Finds documents with overlapping topics, excluding a specific document.
 * Returns up to 5 most relevant similar documents.
 */
export async function findSimilarDocuments(
  topics: string[],
  excludeId?: string,
): Promise<any[]> {
  if (!topics || topics.length === 0) {
    return [];
  }

  const client = await getSupabaseClient();

  let query = client
    .from('documents')
    .select(
      'id, subject, doc_type, coherence, summary, topics, analyzed_at',
    )
    .not('analyzed_at', 'is', null)
    .overlaps('topics', topics)
    .order('analyzed_at', { ascending: false })
    .limit(5);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      '[ApprovalGraph] findSimilarDocuments error:',
      error.message,
    );
    return [];
  }

  return (data || []).map((doc) => {
    // Calculate a simple topic overlap score
    const docTopics: string[] = doc.topics || [];
    const overlap = topics.filter((t) => docTopics.includes(t)).length;
    const maxTopics = Math.max(topics.length, docTopics.length, 1);

    return {
      id: doc.id,
      subject: doc.subject || '',
      doc_type: doc.doc_type || '',
      status: doc.coherence?.overall_score >= 70 ? 'approved' : 'pending',
      similarity_score: Math.round((overlap / maxTopics) * 100) / 100,
      coherence_score: doc.coherence?.overall_score ?? 0,
      summary: doc.summary || { request: '', basis: '', expected_effect: '' },
      insight: '',
    };
  });
}

/**
 * Retrieves coherence rules from Supabase.
 * These are organization-specific validation rules.
 */
export async function getCoherenceRules(): Promise<any[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('coherence_rules')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    // Table may not exist yet — return empty array
    console.warn('[ApprovalGraph] getCoherenceRules:', error.message);
    return [];
  }

  return data || [];
}

// ═══════════════════════════════════════════════════════════
// User Management
// ═══════════════════════════════════════════════════════════

/**
 * Upserts a user from Google OAuth profile data.
 * Uses the upsert_user RPC function.
 */
export async function upsertUser(
  googleId: string,
  email: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<UserProfile> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('upsert_user', {
    p_google_id: googleId,
    p_email: email,
    p_display_name: displayName || null,
    p_avatar_url: avatarUrl || null,
  });

  if (error) {
    throw new Error(`사용자 등록 실패: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new Error('사용자 등록 응답이 비어있습니다.');
  }

  return {
    id: row.id,
    googleId: row.google_id,
    email: row.email,
    displayName: row.display_name || email.split('@')[0],
    avatarUrl: row.avatar_url || '',
    plan: row.plan as 'free' | 'pro' | 'enterprise',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

// ═══════════════════════════════════════════════════════════
// Analysis Record Management
// ═══════════════════════════════════════════════════════════

/**
 * Saves an analysis record to the analyses table.
 * Returns the generated analysis record ID.
 */
export async function saveAnalysisRecord(params: {
  userId: string | null;
  documentId: string;
  mode: AnalysisMode;
  liteResult?: LiteAnalysisResult | null;
  proResult?: AnalysisResult | null;
  overallScore?: number | null;
  checksRun?: string[];
  modelUsed?: string | null;
  costKrw?: number;
}): Promise<{ id: string }> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('analyses')
    .insert({
      user_id: params.userId,
      document_id: params.documentId,
      mode: params.mode,
      lite_result: params.liteResult || null,
      pro_result: params.proResult || null,
      overall_score: params.overallScore ?? null,
      checks_run: params.checksRun || [],
      model_used: params.modelUsed || null,
      cost_krw: params.costKrw || 0,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`분석 기록 저장 실패: ${error.message}`);
  }

  return { id: data.id };
}

// ═══════════════════════════════════════════════════════════
// Usage Tracking
// ═══════════════════════════════════════════════════════════

/**
 * Increments the daily usage count for a user/mode.
 * Returns the updated count for today.
 */
export async function incrementUsage(
  userId: string,
  mode: AnalysisMode = 'lite',
): Promise<number> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('increment_usage', {
    p_user_id: userId,
    p_mode: mode,
  });

  if (error) {
    console.error('[ApprovalGraph] incrementUsage error:', error.message);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

/**
 * Gets today's usage count for a user/mode.
 */
export async function getDailyUsage(
  userId: string,
  mode: AnalysisMode = 'lite',
): Promise<number> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('get_daily_usage', {
    p_user_id: userId,
    p_mode: mode,
  });

  if (error) {
    console.error('[ApprovalGraph] getDailyUsage error:', error.message);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

/**
 * Checks whether a user can still use the given mode today.
 */
export async function checkUsageLimit(
  userId: string,
  mode: AnalysisMode = 'lite',
): Promise<boolean> {
  const client = await getSupabaseClient();

  const { data, error } = await client.rpc('check_usage_limit', {
    p_user_id: userId,
    p_mode: mode,
  });

  if (error) {
    console.error('[ApprovalGraph] checkUsageLimit error:', error.message);
    // Default to allowing usage if the check fails
    return true;
  }

  return data === true;
}

/**
 * Gets the full usage info for a user for today.
 * Includes lite usage count, limit, and pro availability.
 */
// ═══════════════════════════════════════════════════════════
// Career: Goals
// ═══════════════════════════════════════════════════════════

export async function getGoals(userId: string): Promise<CareerGoal[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ApprovalGraph] getGoals:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description || '',
    deadline: row.deadline,
    progress: row.progress,
    source: row.source,
    relatedDocIds: row.related_doc_ids || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function upsertGoal(
  userId: string,
  goal: CareerGoal,
): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client.from('goals').upsert({
    id: goal.id,
    user_id: userId,
    title: goal.title,
    description: goal.description,
    deadline: goal.deadline,
    progress: goal.progress,
    source: goal.source,
    related_doc_ids: goal.relatedDocIds,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[ApprovalGraph] upsertGoal:', error.message);
  }
}

export async function deleteGoal(goalId: string): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client.from('goals').delete().eq('id', goalId);

  if (error) {
    console.error('[ApprovalGraph] deleteGoal:', error.message);
  }
}

// ═══════════════════════════════════════════════════════════
// Career: Metrics
// ═══════════════════════════════════════════════════════════

export async function getMetrics(userId: string): Promise<CareerMetric[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('metrics')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ApprovalGraph] getMetrics:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    currentValue: row.current_value,
    targetValue: row.target_value,
    source: row.source,
    linkedGoalId: row.linked_goal_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

// ═══════════════════════════════════════════════════════════
// Career: Analysis History
// ═══════════════════════════════════════════════════════════

export async function getAnalysisHistory(
  userId: string,
  limit = 50,
): Promise<HistoryEntry[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('analyses')
    .select('id, document_id, mode, overall_score, created_at, documents(subject, doc_type)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[ApprovalGraph] getAnalysisHistory:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    subject: row.documents?.subject || '',
    docType: row.documents?.doc_type || '',
    mode: row.mode,
    overallScore: row.overall_score,
    createdAt: row.created_at,
  }));
}

export async function getUsageInfo(userId: string): Promise<UsageInfo> {
  const [liteUsed, proAllowed] = await Promise.all([
    getDailyUsage(userId, 'lite'),
    checkUsageLimit(userId, 'pro'),
  ]);

  return {
    liteUsedToday: liteUsed,
    liteLimit: 5,
    proAvailable: proAllowed,
  };
}

// ═══════════════════════════════════════════════════════════
// Career: Generated Documents
// ═══════════════════════════════════════════════════════════

export async function saveCareerDocument(
  userId: string,
  doc: CareerDocument,
): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client.from('career_documents').insert({
    id: doc.id,
    user_id: userId,
    title: doc.title,
    content: doc.content,
    prompt: doc.prompt,
    history_count: doc.historyCount,
    created_at: doc.createdAt,
  });

  if (error) {
    console.error('[ApprovalGraph] saveCareerDocument:', error.message);
  }
}

export async function getCareerDocuments(
  userId: string,
): Promise<CareerDocument[]> {
  const client = await getSupabaseClient();

  const { data, error } = await client
    .from('career_documents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[ApprovalGraph] getCareerDocuments:', error.message);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    prompt: row.prompt || '',
    historyCount: row.history_count || 0,
    createdAt: row.created_at,
  }));
}

export async function deleteCareerDocument(docId: string): Promise<void> {
  const client = await getSupabaseClient();

  const { error } = await client
    .from('career_documents')
    .delete()
    .eq('id', docId);

  if (error) {
    console.error('[ApprovalGraph] deleteCareerDocument:', error.message);
  }
}
