// ─── Supabase Configuration ───
// Values are loaded from chrome.storage.local or environment variables.
// These serve as compile-time fallbacks only.
export const SUPABASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) || '';

export const SUPABASE_ANON_KEY: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) || '';

// ─── Analysis Pipeline Steps ───
export interface AnalysisStep {
  step: number;
  label: string;
}

export const ANALYSIS_STEPS: AnalysisStep[] = [
  { step: 1, label: '문서 파싱 중...' },
  { step: 2, label: '유사문서 검색 중...' },
  { step: 3, label: '정합성 분석 중...' },
  { step: 4, label: '결과 정리 중...' },
];

// ─── Coherence Check Items (5 consolidated criteria) ───
export const COHERENCE_ITEMS: string[] = [
  '논리적 완결성',
  '근거 충실성',
  '5W1H 명확성',
  '형식 적합성',
  '선례 비교',
];

// ─── Score Thresholds ───
export const SCORE_THRESHOLDS = {
  high: 80,
  medium: 60,
} as const;

// ─── Lite Analysis Pipeline Steps ───
export const LITE_ANALYSIS_STEPS: AnalysisStep[] = [
  { step: 1, label: '문서 검토 준비 중...' },
  { step: 2, label: '빠른 검사 실행 중...' },
];

// ─── Lite Check Categories ───
export const LITE_CHECK_CATEGORIES = [
  '오탈자',
  '수치검증',
  '날짜검증',
  '고유명사',
  '결재라인',
] as const;

// ─── Usage Limits ───
export const LITE_DAILY_LIMIT_FREE = 5;
export const LITE_COST_KRW = 30; // approximate cost per lite analysis in KRW
export const PRO_COST_KRW = 300; // approximate cost per pro analysis in KRW

// ─── DOM Skeleton Limits ───
export const MAX_DOM_DEPTH = 5;
export const MAX_DOM_HTML_LENGTH = 12000;

// ─── Parsing Quality Thresholds ───
/** Minimum body length to consider CSS parsing successful */
export const MIN_BODY_LENGTH = 20;
/** Maximum raw text length to send for fallback extraction */
export const MAX_RAW_TEXT_LENGTH = 8000;

// ─── Document Category System ───
export type DocCategory = 'proposal' | 'application' | 'report' | 'cooperation';

/**
 * Keyword → category mapping.
 * More specific keywords (e.g. '출장보고') must precede generic ones (e.g. '보고')
 * so that `includes()` matching picks the correct category first.
 */
const DOC_TYPE_CATEGORY_MAP: [string, DocCategory][] = [
  // proposal — 제안형
  ['품의', 'proposal'],
  ['지출결의', 'proposal'],
  ['구매', 'proposal'],
  ['계약', 'proposal'],
  ['투자', 'proposal'],
  // application — 신청형
  ['휴가', 'application'],
  ['경조', 'application'],
  ['출장신청', 'application'],
  ['교육신청', 'application'],
  ['교육', 'application'],
  // report — 보고형 (specific before generic)
  ['출장보고', 'report'],
  ['업무보고', 'report'],
  ['결과보고', 'report'],
  ['회의록', 'report'],
  ['보고', 'report'],
  // cooperation — 협조형
  ['업무협조', 'cooperation'],
  ['협조전', 'cooperation'],
  ['자료요청', 'cooperation'],
  ['안내', 'cooperation'],
  ['공지', 'cooperation'],
  ['요청', 'cooperation'],
  ['협조', 'cooperation'],
];

/**
 * Determines the document category from a doc_type string.
 * Uses substring matching; falls back to 'proposal' if nothing matches.
 */
export function getDocCategory(docType: string): DocCategory {
  if (!docType) return 'proposal';
  const normalized = docType.trim();
  for (const [keyword, category] of DOC_TYPE_CATEGORY_MAP) {
    if (normalized.includes(keyword)) return category;
  }
  return 'proposal';
}

// ─── rawText Header Stripping ───

/**
 * Known header field patterns in Korean groupware (bizbox, hiworks, daou, etc.).
 * Lines matching any of these patterns are header metadata, not body content.
 * Patterns match both normal and space-separated renderings (e.g., '품의번호' and '품 의 번 호').
 */
const HEADER_FIELD_PATTERNS: RegExp[] = [
  // Document ID fields
  /^품\s*의\s*번\s*호/,
  /^문\s*서\s*번\s*호/,
  /^기\s*안\s*번\s*호/,
  // Date fields
  /^작\s*성\s*일\s*자/,
  /^기\s*안\s*일/,
  /^시\s*행\s*일\s*자/,
  // Org fields
  /^기\s*안\s*부\s*서/,
  /^기\s*안\s*자/,
  /^수\s*신\s*및?\s*참\s*조/,
  /^수\s*신\s*참\s*조/,
  /^시\s*행\s*자/,
  // Approval table header patterns
  /^결\s*재\s+담당/,
  /^합\s*의\s/,
  // UI / file attachment chrome
  /^파\s*일\s*첨\s*부/,
  /^파일\s*개\s*수/,
  /^파일찾기$/,
  /^저장$/,
  /^담당\s+팀장/,
];

/**
 * Lines that appear exactly as document type headers.
 */
const HEADER_TITLE_PATTERNS: RegExp[] = [
  /^품의서$/,
  /^지출결의서$/,
  /^업무보고서?$/,
  /^휴가신청서$/,
  /^출장보고서$/,
  /^협조전$/,
  /^업무협조전$/,
];

/**
 * Strips groupware header metadata lines from rawText so that only
 * actual body content remains. This prevents the LLM from analyzing
 * header fields (품의번호, 기안부서, etc.) as if they were body content.
 *
 * Strategy:
 * 1. Find the "제 목" line (or subject text) — everything before it is header.
 * 2. If no subject line found, strip individual header field lines.
 */
export function stripHeaderFromRawText(rawText: string, subject?: string): string {
  if (!rawText) return '';

  const lines = rawText.split('\n');

  // Strategy 1: Find subject/title line and take everything after it
  const subjectNorm = subject?.trim().replace(/\s+/g, '');
  for (let i = 0; i < lines.length; i++) {
    const lineNorm = lines[i].trim().replace(/\s+/g, '');
    // Check for "제목" field label
    if (/^제\s*목/.test(lines[i].trim())) {
      const body = lines.slice(i + 1).join('\n').trim();
      // If the 제목 line also contains content, check next line
      if (body.length >= 20) return body;
    }
    // Check if line contains the document subject
    if (subjectNorm && subjectNorm.length > 5 && lineNorm.includes(subjectNorm)) {
      const body = lines.slice(i + 1).join('\n').trim();
      if (body.length >= 20) return body;
    }
  }

  // Strategy 2: Strip individual header lines
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true; // keep blank lines
    // Remove header field lines
    for (const pattern of HEADER_FIELD_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }
    // Remove document type title lines
    for (const pattern of HEADER_TITLE_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }
    return true;
  });

  return filtered.join('\n').trim();
}

/** Category-specific weights for the 5 coherence check items */
export const CATEGORY_WEIGHTS: Record<DocCategory, Record<string, number>> = {
  proposal: {
    '논리적 완결성': 30,
    '근거 충실성': 25,
    '5W1H 명확성': 25,
    '형식 적합성': 10,
    '선례 비교': 10,
  },
  application: {
    '논리적 완결성': 20,
    '근거 충실성': 25,
    '5W1H 명확성': 30,
    '형식 적합성': 15,
    '선례 비교': 10,
  },
  report: {
    '논리적 완결성': 30,
    '근거 충실성': 25,
    '5W1H 명확성': 25,
    '형식 적합성': 10,
    '선례 비교': 10,
  },
  cooperation: {
    '논리적 완결성': 25,
    '근거 충실성': 25,
    '5W1H 명확성': 25,
    '형식 적합성': 15,
    '선례 비교': 10,
  },
};
