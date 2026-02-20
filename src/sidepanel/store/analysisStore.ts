import { create } from 'zustand';
import type { AnalysisResult, ParsedDocument } from '@shared/types';

export type AnalysisStatus = 'idle' | 'ready' | 'loading' | 'success' | 'error' | 'empty';
export type ActiveTab = 'summary' | 'coherence' | 'relation';
export type ErrorType = 'network' | 'api_key' | 'parse' | 'rate_limit' | 'no_document';

export interface ProgressInfo {
  step: number;
  total: number;
  message: string;
}

export interface AnalysisStore {
  // State
  status: AnalysisStatus;
  result: AnalysisResult | null;
  parsedDoc: ParsedDocument | null;
  error: { type: ErrorType; message: string } | null;
  progress: ProgressInfo | null;
  activeTab: ActiveTab;
  apiKey: string | null;
  hasApiKey: boolean;
  showSettings: boolean;
  showCareer: boolean;
  highlightEnabled: boolean;
  detectedGroupware: string | null;

  // Actions
  setStatus: (status: AnalysisStatus) => void;
  setResult: (result: AnalysisResult | null, parsedDoc?: ParsedDocument | null) => void;
  setError: (error: { type: ErrorType; message: string } | null) => void;
  setProgress: (progress: ProgressInfo | null) => void;
  setActiveTab: (tab: ActiveTab) => void;
  setApiKey: (key: string | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowCareer: (show: boolean) => void;
  checkApiKey: () => Promise<void>;
  requestAnalysis: () => void;
  retryAnalysis: () => void;
  initListener: () => (() => void) | void;
  requestLiteAnalysis: () => void;
  toggleHighlight: () => void;
  scrollToHighlight: (text: string) => void;
  showCheckConnection: (item: string, detail: string, score: number, weight: number, result: string, evidenceRefs?: string[]) => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  // Initial state
  status: 'idle',
  result: null,
  parsedDoc: null,
  error: null,
  progress: null,
  activeTab: 'summary',
  apiKey: null,
  hasApiKey: false,
  showSettings: false,
  showCareer: false,
  highlightEnabled: false,
  detectedGroupware: null,

  // Actions
  setStatus: (status) => set({ status }),

  setResult: (result, parsedDoc) =>
    set({
      result,
      parsedDoc: parsedDoc ?? null,
      status: result ? 'success' : 'idle',
      error: null,
      progress: null,
    }),

  setError: (error) =>
    set({
      error,
      status: error ? 'error' : get().status,
      progress: null,
    }),

  setProgress: (progress) => set({ progress }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setApiKey: (apiKey) => {
    set({ apiKey, hasApiKey: !!apiKey });
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      if (apiKey) {
        chrome.storage.local.set({ openai_api_key: apiKey });
      } else {
        chrome.storage.local.remove('openai_api_key');
      }
    }
  },

  setShowSettings: (showSettings) => set({ showSettings }),
  setShowCareer: (showCareer) => set({ showCareer }),

  checkApiKey: async () => {
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      try {
        const data = await chrome.storage.local.get('openai_api_key');
        const key = data.openai_api_key || null;
        set({ apiKey: key, hasApiKey: !!key });
      } catch {
        set({ apiKey: null, hasApiKey: false });
      }
    }
  },

  requestAnalysis: () => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      set({ status: 'loading', error: null, progress: { step: 1, total: 4, message: '문서 파싱 중...' } });
      chrome.runtime.sendMessage({ type: 'REQUEST_ANALYSIS' });
    }
  },

  retryAnalysis: () => {
    const { detectedGroupware } = get();
    // Reset to initial state — go back to ready screen
    set({
      status: detectedGroupware ? 'ready' : 'idle',
      result: null,
      error: null,
      progress: null,
      highlightEnabled: false,
    });
    // Clear highlights in content script
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'CLEAR_HIGHLIGHTS', payload: null });
    }
  },

  requestLiteAnalysis: () => {
    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      set({ status: 'loading', error: null, progress: { step: 1, total: 2, message: '문서 검토 준비 중...' } });
      chrome.runtime.sendMessage({ type: 'REQUEST_LITE_ANALYSIS' });
    }
  },

  toggleHighlight: () => {
    const { highlightEnabled, result } = get();
    const newState = !highlightEnabled;
    set({ highlightEnabled: newState });

    if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
      if (newState && result?.coherence) {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_HIGHLIGHTS',
          payload: {
            checks: result.coherence.checks,
            topics: result.topics,
          },
        });
      } else {
        chrome.runtime.sendMessage({
          type: 'CLEAR_HIGHLIGHTS',
          payload: null,
        });
      }
    }
  },

  scrollToHighlight: (text: string) => {
    if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) return;

    const { highlightEnabled, result } = get();

    // Auto-enable highlights if not already on
    if (!highlightEnabled && result?.coherence) {
      set({ highlightEnabled: true });
      chrome.runtime.sendMessage({
        type: 'TOGGLE_HIGHLIGHTS',
        payload: {
          checks: result.coherence.checks,
          topics: result.topics,
        },
      });
      // Small delay to let content script apply marks before scrolling
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'SCROLL_TO_HIGHLIGHT',
          payload: { text },
        });
      }, 300);
    } else {
      chrome.runtime.sendMessage({
        type: 'SCROLL_TO_HIGHLIGHT',
        payload: { text },
      });
    }
  },

  showCheckConnection: (item: string, detail: string, score: number, weight: number, checkResult: string, evidenceRefs?: string[]) => {
    if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage) return;

    const { result, parsedDoc } = get();
    // Prefer actual DOM title (parsedDoc.subject) over AI summary
    const subject = parsedDoc?.subject || result?.summary?.request || '';

    chrome.runtime.sendMessage({
      type: 'SHOW_CHECK_CONNECTION',
      payload: { item, detail, subject, score, weight, checkResult, evidenceRefs },
    });
  },

  initListener: () => {
    if (typeof chrome === 'undefined' || !chrome?.runtime?.onMessage) {
      return;
    }

    const listener = (message: Record<string, unknown>) => {
      if (!message || !message.type) return;
      const payload = message.payload as Record<string, unknown> | undefined;

      switch (message.type) {
        case 'PAGE_READY':
          if (payload) {
            set({
              status: 'ready',
              detectedGroupware: (payload.groupware as string) || 'unknown',
              error: null,
              showCareer: false,
              showSettings: false,
            });
          }
          break;

        case 'ANALYSIS_PROGRESS':
          if (payload) {
            set({
              status: 'loading',
              progress: {
                step: (payload.step as number) ?? 1,
                total: (payload.total as number) ?? 4,
                message: (payload.message as string) ?? '분석 중...',
              },
            });
          }
          break;

        case 'ANALYSIS_RESULT':
          if (payload) {
            set({
              status: 'success',
              result: payload as unknown as AnalysisResult,
              error: null,
              progress: null,
            });
          }
          break;

        case 'ANALYSIS_START':
          set({
            status: 'loading',
            error: null,
            progress: { step: 1, total: 4, message: '문서 파싱 중...' },
          });
          break;

        case 'ANALYSIS_ERROR':
          if (payload) {
            set({
              status: 'error',
              error: {
                type: inferErrorType((payload.code as string) || '', (payload.message as string) || ''),
                message: (payload.message as string) || '알 수 없는 오류가 발생했습니다.',
              },
              progress: null,
            });
          }
          break;

        default:
          break;
      }
    };

    function inferErrorType(code: string, message: string): ErrorType {
      if (code.includes('NO_DOCUMENT') || message.includes('문서가 없습니다')) return 'no_document';
      if (code.includes('API_KEY') || message.includes('API 키')) return 'api_key';
      if (code.includes('RATE') || message.includes('한도')) return 'rate_limit';
      if (code.includes('PARSE') || message.includes('파싱')) return 'parse';
      return 'network';
    }

    chrome.runtime.onMessage.addListener(listener);

    return () => {
      if (typeof chrome !== 'undefined' && chrome?.runtime?.onMessage) {
        chrome.runtime.onMessage.removeListener(listener);
      }
    };
  },
}));
