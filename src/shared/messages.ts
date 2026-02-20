import type { ParseRule, ParsedDocument, AnalysisResult, UserProfile, UsageInfo } from './types';

// ─── Content Script → Service Worker ───
export type ContentMessage =
  | { type: 'PAGE_DETECTED'; payload: { url: string; groupware: string } }
  | { type: 'DOM_PARSED'; payload: ParsedDocument }
  | { type: 'DOM_HASH'; payload: { hash: string; groupware: string; domHtml: string } };

// ─── Service Worker → Content Script ───
export type BackgroundMessage =
  | { type: 'PARSE_RULE'; payload: ParseRule }
  | { type: 'GENERATE_RULE'; payload: null }
  | { type: 'START_PARSE'; payload: null }
  | { type: 'ANALYSIS_COMPLETE'; payload: AnalysisResult }
  | { type: 'HIGHLIGHT_TEXT'; payload: { keywords: string[]; className?: string } }
  | { type: 'CLEAR_HIGHLIGHTS'; payload: null }
  | { type: 'SCROLL_TO_HIGHLIGHT'; payload: { text: string } }
  | { type: 'SHOW_CHECK_CONNECTION'; payload: { item: string; detail: string; subject: string; score?: number; weight?: number; checkResult?: string; evidenceRefs?: string[] } }
  | { type: 'TOGGLE_HIGHLIGHTS'; payload: { checks: Array<{ item: string; result: string; detail: string }>; topics?: string[]; causalChains?: import('./types').CausalChain[] } | null }
  | { type: 'ERROR'; payload: { message: string; code: string } };

// ─── Service Worker → Side Panel ───
export type PanelMessage =
  | { type: 'PAGE_READY'; payload: { url: string; groupware: string } }
  | { type: 'ANALYSIS_START'; payload: { docId: string } }
  | { type: 'ANALYSIS_PROGRESS'; payload: { step: number; total: number; message: string } }
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ANALYSIS_ERROR'; payload: { message: string; code: string } }
  | { type: 'AUTH_STATE'; payload: { user: UserProfile | null } }
  | { type: 'USAGE_INFO'; payload: UsageInfo }
  | { type: 'CAREER_GOALS_DATA'; payload: { goals: import('./types').CareerGoal[] } }
  | { type: 'CAREER_HISTORY_DATA'; payload: { history: import('./types').HistoryEntry[] } }
  | { type: 'ANALYSIS_DETAIL_RESULT'; payload: { detail: import('./types').HistoryDetail | null } }
  | { type: 'CAREER_DOCUMENT_RESULT'; payload: { content: string } }
  | { type: 'CAREER_DOCUMENT_ERROR'; payload: { message: string } }
  | { type: 'CAREER_DOCUMENTS_DATA'; payload: { documents: import('./types').CareerDocument[] } };

// ─── Side Panel → Service Worker ───
export type PanelRequest =
  | { type: 'REQUEST_ANALYSIS'; payload: null }
  | { type: 'REQUEST_LITE_ANALYSIS'; payload: null }
  | { type: 'RETRY_ANALYSIS'; payload: null }
  | { type: 'GET_STATUS'; payload: null }
  | { type: 'HIGHLIGHT_TEXT'; payload: { keywords: string[]; className?: string } }
  | { type: 'CLEAR_HIGHLIGHTS'; payload: null }
  | { type: 'SCROLL_TO_HIGHLIGHT'; payload: { text: string } }
  | { type: 'SHOW_CHECK_CONNECTION'; payload: { item: string; detail: string; subject: string; score?: number; weight?: number; checkResult?: string; evidenceRefs?: string[] } }
  | { type: 'TOGGLE_HIGHLIGHTS'; payload: { checks: Array<{ item: string; result: string; detail: string }>; topics?: string[]; causalChains?: import('./types').CausalChain[] } | null }
  | { type: 'SIGN_IN'; payload: null }
  | { type: 'SIGN_OUT'; payload: null }
  | { type: 'GET_AUTH_STATE'; payload: null }
  | { type: 'GET_USAGE_INFO'; payload: null }
  | { type: 'CAREER_SYNC_GOALS'; payload: { userId: string } }
  | { type: 'CAREER_UPSERT_GOAL'; payload: { userId: string; goal: import('./types').CareerGoal } }
  | { type: 'CAREER_DELETE_GOAL'; payload: { goalId: string } }
  | { type: 'CAREER_SYNC_HISTORY'; payload: { userId: string } }
  | { type: 'GET_ANALYSIS_DETAIL'; payload: { historyId: string } }
  | { type: 'DELETE_HISTORY_ENTRY'; payload: { historyId: string } }
  | { type: 'GENERATE_CAREER_DOCUMENT'; payload: { history: import('./types').HistoryEntry[]; prompt: string } }
  | { type: 'SAVE_CAREER_DOCUMENT'; payload: { document: import('./types').CareerDocument } }
  | { type: 'DELETE_CAREER_DOCUMENT'; payload: { docId: string } }
  | { type: 'LOAD_CAREER_DOCUMENTS'; payload: null }
  | { type: 'SUBMIT_FEEDBACK'; payload: { category: string; originalDetail: string; userMessage: string } };

// ─── Union of all message types (useful for generic handlers) ───
export type ExtensionMessage =
  | ContentMessage
  | BackgroundMessage
  | PanelMessage
  | PanelRequest;
