// ─── User Profile (Google OAuth) ───
export interface UserProfile {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
  lastLoginAt: string;
}

// ─── Usage Info ───
export interface UsageInfo {
  liteUsedToday: number;
  liteLimit: number;
  proAvailable: boolean;
}

// ─── Analysis Record (stored in Supabase analyses table) ───
export interface AnalysisRecord {
  id: string;
  userId: string | null;
  documentId: string;
  mode: AnalysisMode;
  liteResult: LiteAnalysisResult | null;
  proResult: AnalysisResult | null;
  overallScore: number | null;
  checksRun: string[];
  modelUsed: string | null;
  costKrw: number;
  createdAt: string;
}

// ─── Parse Rule: CSS selectors for DOM parsing ───
export interface ParseRule {
  subject: string;
  body: string;
  doc_type: string;
  requester_name: string;
  requester_dept: string;
  approval_line: string;
  created_at: string;
}

// ─── Groupware Detection ───
export interface GroupwareSignature {
  urlPatterns: RegExp[];
  domSignatures: string[];
}

export type GroupwareType =
  | 'bizbox_alpha'
  | 'hiworks'
  | 'daou_office'
  | 'flow'
  | 'amaranth10'
  | 'unknown';

// ─── Parsed Document ───
export interface ParsedDocument {
  doc_type: string;
  subject: string;
  body: string;
  requester_name: string;
  requester_dept: string;
  approval_line: ApprovalLineItem[];
  created_at: string;
  groupware?: GroupwareType;
  attachments?: AttachmentMeta[];
  /** Base64 data URLs of images found in the document body (tables, charts, etc.) */
  bodyImages?: string[];
  /** Markdown representation of HTML tables in the document body */
  tableMarkdown?: string;
  /** Raw text content extracted from page for fallback parsing */
  rawText?: string;
}

export interface AttachmentMeta {
  name: string;
  size: string;
  type: 'pdf' | 'excel' | 'image' | 'link' | 'other';
  url?: string;
}

export interface ApprovalLineItem {
  name: string;
  position: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ─── Causal Chain (legacy, kept for backward compat) ───
export interface CausalChain {
  keyword: string;
  chain: string[];
  kpis: string[];
  impact: 'high' | 'medium' | 'low';
}

// ─── Value Hierarchy: 사업목표 → KPI → 기안/Task ───
export interface ValueHierarchy {
  businessGoal: string;
  goalDescription: string;
  kpis: KpiNode[];
  valueChain: string[];
  impactScore: 'high' | 'medium' | 'low';
}

export interface KpiNode {
  name: string;
  current: string;
  target: string;
  relevance: 'high' | 'medium' | 'low';
}

// ─── Analysis Mode ───
export type AnalysisMode = 'pro' | 'lite';

// ─── Analysis Result ───
export interface AnalysisResult {
  docId: string;
  mode?: AnalysisMode;
  summary: DocumentSummary;
  coherence: CoherenceResult;
  similarDocs: SimilarDocument[];
  recommendation: string;
  topics: string[];
  causalChains: CausalChain[];
  valueHierarchy: ValueHierarchy | null;
  analyzedAt: string;
  predictedQuestions?: string[];
}

// ─── Lite Analysis ───
export interface LiteCheckItem {
  category: string;
  result: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
  weight?: number;
}

export interface LiteAnalysisResult {
  checks: LiteCheckItem[];
  totalIssues: number;
}

export interface DocumentSummary {
  request: string;
  basis: string;
  expected_effect: string;
}

export interface CoherenceResult {
  overall_score: number;
  checks: CoherenceCheck[];
}

export interface CoherenceCheck {
  item: string;
  result: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
  weight: number;
  score: number;
  evidence_refs?: string[];
}

export interface SimilarDocument {
  id: string;
  subject: string;
  doc_type: string;
  status: 'approved' | 'rejected' | 'pending';
  similarity_score: number;
  coherence_score: number;
  summary: DocumentSummary;
  insight: string;
}

// ─── Career: Goals ───
export interface CareerGoal {
  id: string;
  title: string;
  description: string;
  deadline: string | null;
  progress: number; // 0-100
  source: 'manual' | 'auto';
  relatedDocIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Career: Metrics ───
export interface CareerMetric {
  id: string;
  name: string;
  currentValue: string;
  targetValue: string;
  source: 'auto' | 'manual';
  linkedGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── User Feedback on False Positive ───
/** User feedback on a false positive check result */
export interface FeedbackRule {
  id: string;
  category: string;        // "오탈자", "수치검증" 등
  originalDetail: string;  // LLM이 준 판정 내용 (참고용)
  userMessage: string;     // "이것은 정상 표기입니다" 등
  createdAt: string;
}

// ─── Career: History Entry ───
export interface HistoryEntry {
  id: string;
  documentId: string;
  subject: string;
  docType: string;
  mode: AnalysisMode;
  overallScore: number | null;
  createdAt: string;
  url?: string;            // 문서 페이지 URL (중복 감지용)
  analysisCount?: number;  // 재분석 횟수
}

// ─── History Detail (stored in chrome.storage.local) ───

/** Full analysis detail for history drilldown */
export interface HistoryDetail {
  id: string;                          // Same as HistoryEntry.id
  analysisResult: AnalysisResult;
  parsedDocument: ParsedDocumentLite;   // bodyImages excluded
  savedAt: string;
}

/** ParsedDocument without bodyImages/tableMarkdown (storage-efficient) */
export type ParsedDocumentLite = Omit<ParsedDocument, 'bodyImages' | 'tableMarkdown'>;

// ─── Career: Generated Documents ───

export interface CareerDocument {
  id: string;
  title: string;           // e.g. "2026-02-20 경력문서"
  content: string;
  prompt: string;           // user prompt used
  historyCount: number;     // number of history entries used
  createdAt: string;
}

// ─── Knowledge Graph ───
export type NodeType = 'document' | 'topic' | 'person' | 'rule';
export type RelationType =
  | 'SIMILAR_TO'
  | 'ABOUT'
  | 'AUTHORED_BY'
  | 'REVIEWED_BY'
  | 'VIOLATES'
  | 'PASSES';

export interface GraphNode {
  id: string;
  node_type: NodeType;
  label: string;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: RelationType;
  weight: number;
  metadata: Record<string, unknown>;
}
