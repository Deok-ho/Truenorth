import type { ParsedDocument, AnalysisResult, UserProfile, FeedbackRule } from '@shared/types';
import type {
  ContentMessage,
  BackgroundMessage,
  PanelMessage,
  PanelRequest,
  ExtensionMessage,
} from '@shared/messages';
import { ANALYSIS_STEPS, LITE_ANALYSIS_STEPS } from '@shared/constants';
import { getCachedRule, cacheRule } from './cache';
import { generateParseRule, callChatCompletion } from './api/openai';
import { analyzeDocument } from './analyzer';
import { analyzeLite } from './liteAnalysis';
import { signInWithGoogle, getCurrentUser, signOut } from '@lib/auth';
import {
  getUsageInfo,
  getGoals,
  upsertGoal,
  deleteGoal as deleteGoalApi,
  getAnalysisHistory,
  saveCareerDocument as saveCareerDocApi,
  getCareerDocuments,
  deleteCareerDocument as deleteCareerDocApi,
} from './api/supabase';

// ─── Career History Helper ───

/**
 * Saves an analysis result as a history entry in chrome.storage.local.
 */
async function saveHistoryEntry(
  doc: ParsedDocument,
  result: AnalysisResult,
  mode: 'pro' | 'lite',
  url?: string,
): Promise<void> {
  try {
    const entry = {
      id: result.docId || `local-${Date.now()}`,
      documentId: result.docId,
      subject: doc.subject || '',
      docType: doc.doc_type || '',
      mode,
      overallScore: result.coherence?.overall_score ?? null,
      createdAt: new Date().toISOString(),
      url: url || '',
      analysisCount: 1,
    };

    const stored = await chrome?.storage?.local?.get('career_history');
    const history: any[] = stored?.career_history ?? [];

    // URL-based overwrite: if same URL exists, update in-place
    const existingIdx = url ? history.findIndex((h: any) => h.url && h.url === url) : -1;
    let finalId: string;

    if (existingIdx >= 0) {
      const existing = history[existingIdx];
      finalId = existing.id;
      history[existingIdx] = {
        ...entry,
        id: existing.id,
        analysisCount: (existing.analysisCount || 1) + 1,
      };
    } else {
      finalId = entry.id;
      history.push(entry);
    }

    // Keep only last 200 entries
    const trimmed = history.slice(-200);
    await chrome?.storage?.local?.set({ career_history: trimmed });

    // Save full analysis detail (bodyImages excluded for storage efficiency)
    const detailKey = `analysis_detail_${finalId}`;
    const { bodyImages, ...docLite } = doc;
    const detail = {
      id: finalId,
      analysisResult: result,
      parsedDocument: docLite,
      savedAt: new Date().toISOString(),
    };
    await chrome?.storage?.local?.set({ [detailKey]: detail });

    // Manage detail index and auto-cleanup beyond 50 entries
    await cleanupDetailStorage(finalId);
  } catch {
    // Non-critical — don't break the analysis flow
  }
}

/**
 * Maintains an index of analysis detail keys and removes oldest entries beyond 50.
 */
async function cleanupDetailStorage(newId: string): Promise<void> {
  try {
    const stored = await chrome?.storage?.local?.get('analysis_detail_index');
    const index: { id: string; savedAt: string }[] = stored?.analysis_detail_index ?? [];
    index.push({ id: newId, savedAt: new Date().toISOString() });
    if (index.length > 50) {
      const toRemove = index.splice(0, index.length - 50);
      await chrome?.storage?.local?.remove(toRemove.map(item => `analysis_detail_${item.id}`));
    }
    await chrome?.storage?.local?.set({ analysis_detail_index: index });
  } catch {
    // Non-critical
  }
}

// ─── Module-scoped state ───

/** The most recently parsed document (for re-analysis). */
let lastParsedDoc: ParsedDocument | null = null;

/** The most recent analysis result. */
let lastResult: AnalysisResult | null = null;

/** Promise-based mutex to prevent concurrent analysis. */
let analysisPromise: Promise<void> | null = null;

/** Whether a groupware page has been detected in the active tab. */
let pageDetected: { url: string; groupware: string } | null = null;

/** Pending analysis mode when waiting for DOM_PARSED after START_PARSE */
let pendingAnalysisMode: 'pro' | 'lite' = 'pro';

// ─── Side Panel Configuration ───

try {
  chrome?.sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true });
} catch {
  // sidePanel API may not be available in older Chrome versions
}

// ─── Extension Icon Click ───

chrome?.action?.onClicked?.addListener(async (tab) => {
  try {
    if (tab.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
    }
  } catch {
    // Side panel may already be open
  }
});

// ─── Helpers ───

/**
 * Sends a message to the side panel.
 * Uses chrome.runtime.sendMessage which reaches all extension pages
 * (including the side panel).
 */
function broadcastToSidePanel(msg: PanelMessage): void {
  try {
    chrome?.runtime?.sendMessage?.(msg).catch(() => {
      // No receiver — side panel may not be open
    });
  } catch {
    // Extension context invalidated
  }
}

/**
 * Sends a message back to the content script in the active tab.
 */
async function sendToContentScript(msg: BackgroundMessage): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {
        // Content script may not be loaded
      });
    }
  } catch {
    // Tab query failed
  }
}

/**
 * Sends analysis progress to the side panel.
 */
function sendProgress(step: number, message: string): void {
  broadcastToSidePanel({
    type: 'ANALYSIS_PROGRESS',
    payload: {
      step,
      total: ANALYSIS_STEPS.length,
      message,
    },
  });
}

/**
 * Sends lite analysis progress to the side panel.
 */
function sendLiteProgress(step: number, message: string): void {
  broadcastToSidePanel({
    type: 'ANALYSIS_PROGRESS',
    payload: {
      step,
      total: LITE_ANALYSIS_STEPS.length,
      message,
    },
  });
}

/**
 * Runs the Lite analysis pipeline (Flash model) and broadcasts results.
 */
async function runLiteAnalysis(doc: ParsedDocument): Promise<void> {
  if (analysisPromise) {
    return;
  }

  lastParsedDoc = doc;

  broadcastToSidePanel({
    type: 'ANALYSIS_START',
    payload: { docId: '' },
  });

  const doAnalysis = async () => {
    try {
      const result = await analyzeLite(doc, sendLiteProgress);
      lastResult = result;

      // Save to career history
      await saveHistoryEntry(doc, result, 'lite', pageDetected?.url);

      broadcastToSidePanel({
        type: 'ANALYSIS_RESULT',
        payload: result,
      });

      await sendToContentScript({
        type: 'ANALYSIS_COMPLETE',
        payload: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      broadcastToSidePanel({
        type: 'ANALYSIS_ERROR',
        payload: {
          message,
          code: 'LITE_ANALYSIS_FAILED',
        },
      });

      await sendToContentScript({
        type: 'ERROR',
        payload: {
          message,
          code: 'LITE_ANALYSIS_FAILED',
        },
      });
    } finally {
      analysisPromise = null;
    }
  };

  analysisPromise = doAnalysis();
}

/**
 * Runs the full analysis pipeline and broadcasts results.
 */
async function runAnalysis(doc: ParsedDocument): Promise<void> {
  if (analysisPromise) {
    return;
  }

  lastParsedDoc = doc;

  // Notify side panel that analysis has started
  broadcastToSidePanel({
    type: 'ANALYSIS_START',
    payload: { docId: '' },
  });

  const doAnalysis = async () => {
    try {
      const result = await analyzeDocument(doc, sendProgress);
      lastResult = result;

      // Save to career history
      await saveHistoryEntry(doc, result, 'pro', pageDetected?.url);

      // Send the final result to side panel
      broadcastToSidePanel({
        type: 'ANALYSIS_RESULT',
        payload: result,
      });

      // Also send to content script
      await sendToContentScript({
        type: 'ANALYSIS_COMPLETE',
        payload: result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      broadcastToSidePanel({
        type: 'ANALYSIS_ERROR',
        payload: {
          message,
          code: 'ANALYSIS_FAILED',
        },
      });

      await sendToContentScript({
        type: 'ERROR',
        payload: {
          message,
          code: 'ANALYSIS_FAILED',
        },
      });
    } finally {
      analysisPromise = null;
    }
  };

  analysisPromise = doAnalysis();
}

// ─── Message Handler ───

chrome?.runtime?.onMessage?.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void,
  ) => {
    if (!message || !message.type) {
      return false;
    }

    switch (message.type) {
      // ── Content Script: DOM hash received ──
      case 'DOM_HASH': {
        const { hash, groupware, domHtml } = (message as ContentMessage & { type: 'DOM_HASH' }).payload;

        // Handle asynchronously
        (async () => {
          try {
            // Check cache first
            const cachedRule = await getCachedRule(hash, groupware);

            if (cachedRule) {
              // Cache hit — send rule back to content script
              if (sender.tab?.id) {
                chrome.tabs.sendMessage(sender.tab.id, {
                  type: 'PARSE_RULE',
                  payload: cachedRule,
                } as BackgroundMessage);
              }
              return;
            }

            // Cache miss — generate rule via LLM
            const newRule = await generateParseRule(domHtml);

            // Cache the new rule
            await cacheRule(hash, groupware, newRule);

            // Send rule back to content script
            if (sender.tab?.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: 'PARSE_RULE',
                payload: newRule,
              } as BackgroundMessage);
            }
          } catch (err) {
            const errMessage =
              err instanceof Error ? err.message : String(err);

            if (sender.tab?.id) {
              chrome.tabs.sendMessage(sender.tab.id, {
                type: 'ERROR',
                payload: {
                  message: `파싱 규칙 생성 실패: ${errMessage}`,
                  code: 'PARSE_RULE_FAILED',
                },
              } as BackgroundMessage);
            }
          }
        })();

        // Return true to indicate async response
        return true;
      }

      // ── Content Script: Parsed document received ──
      case 'DOM_PARSED': {
        const parsedDoc = (message as ContentMessage & { type: 'DOM_PARSED' }).payload;
        if (pendingAnalysisMode === 'lite') {
          runLiteAnalysis(parsedDoc);
        } else {
          runAnalysis(parsedDoc);
        }
        pendingAnalysisMode = 'pro'; // reset to default
        return true;
      }

      // ── Content Script: Page detected → notify side panel ──
      case 'PAGE_DETECTED': {
        const pageInfo = (message as ContentMessage & { type: 'PAGE_DETECTED' }).payload;
        pageDetected = pageInfo;
        // Reset previous state for new page
        lastParsedDoc = null;
        lastResult = null;
        broadcastToSidePanel({
          type: 'PAGE_READY',
          payload: pageInfo,
        });
        return false;
      }

      // ── Side Panel: Request analysis (Pro mode) ──
      case 'REQUEST_ANALYSIS': {
        if (lastParsedDoc) {
          runAnalysis(lastParsedDoc);
        } else if (lastResult) {
          broadcastToSidePanel({
            type: 'ANALYSIS_RESULT',
            payload: lastResult,
          });
        } else if (pageDetected) {
          // Page detected but not yet parsed — tell content script to start
          pendingAnalysisMode = 'pro';
          sendToContentScript({ type: 'START_PARSE', payload: null });
        } else {
          broadcastToSidePanel({
            type: 'ANALYSIS_ERROR',
            payload: {
              message: '분석할 문서가 없습니다. 결재 문서 페이지를 열어주세요.',
              code: 'NO_DOCUMENT',
            },
          });
        }
        return true;
      }

      // ── Side Panel: Request Lite analysis (Flash model) ──
      case 'REQUEST_LITE_ANALYSIS': {
        if (lastParsedDoc) {
          runLiteAnalysis(lastParsedDoc);
        } else if (pageDetected) {
          pendingAnalysisMode = 'lite';
          sendToContentScript({ type: 'START_PARSE', payload: null });
        } else {
          broadcastToSidePanel({
            type: 'ANALYSIS_ERROR',
            payload: {
              message: '분석할 문서가 없습니다. 결재 문서 페이지를 열어주세요.',
              code: 'NO_DOCUMENT',
            },
          });
        }
        return true;
      }

      // ── Side Panel: Retry analysis ──
      case 'RETRY_ANALYSIS': {
        if (lastParsedDoc) {
          runAnalysis(lastParsedDoc);
        } else {
          broadcastToSidePanel({
            type: 'ANALYSIS_ERROR',
            payload: {
              message:
                '재분석할 문서가 없습니다. 결재 문서 페이지를 새로고침하세요.',
              code: 'NO_DOCUMENT',
            },
          });
        }
        return true;
      }

      // ── Side Panel: Get current status ──
      case 'GET_STATUS': {
        if (analysisPromise) {
          sendResponse({ status: 'analyzing' });
        } else if (lastResult) {
          broadcastToSidePanel({
            type: 'ANALYSIS_RESULT',
            payload: lastResult,
          });
          sendResponse({ status: 'complete' });
        } else if (lastParsedDoc) {
          sendResponse({ status: 'ready' });
        } else if (pageDetected) {
          broadcastToSidePanel({
            type: 'PAGE_READY',
            payload: pageDetected,
          });
          sendResponse({ status: 'page_detected' });
        } else {
          sendResponse({ status: 'idle' });
        }
        return true;
      }

      // ── Side Panel: Highlight commands → forward to content script ──
      case 'HIGHLIGHT_TEXT':
      case 'CLEAR_HIGHLIGHTS':
      case 'SCROLL_TO_HIGHLIGHT':
      case 'SHOW_CHECK_CONNECTION':
      case 'TOGGLE_HIGHLIGHTS': {
        sendToContentScript(message as BackgroundMessage);
        return false;
      }

      // ── Auth: Sign in with Google ──
      case 'SIGN_IN': {
        (async () => {
          try {
            const user = await signInWithGoogle();
            broadcastToSidePanel({
              type: 'AUTH_STATE',
              payload: { user },
            });
            // Also send usage info after sign-in
            try {
              const usage = await getUsageInfo(user.id);
              broadcastToSidePanel({
                type: 'USAGE_INFO',
                payload: usage,
              });
            } catch {
              // Non-critical
            }
          } catch (err) {
            const errMsg = err instanceof Error ? err.message : String(err);
            broadcastToSidePanel({
              type: 'ANALYSIS_ERROR',
              payload: { message: `로그인 실패: ${errMsg}`, code: 'AUTH_FAILED' },
            });
          }
        })();
        return true;
      }

      // ── Auth: Sign out ──
      case 'SIGN_OUT': {
        (async () => {
          try {
            await signOut();
            broadcastToSidePanel({
              type: 'AUTH_STATE',
              payload: { user: null },
            });
          } catch {
            // Best effort
          }
        })();
        return true;
      }

      // ── Auth: Get current auth state ──
      case 'GET_AUTH_STATE': {
        (async () => {
          try {
            const user = await getCurrentUser();
            broadcastToSidePanel({
              type: 'AUTH_STATE',
              payload: { user },
            });
          } catch {
            broadcastToSidePanel({
              type: 'AUTH_STATE',
              payload: { user: null },
            });
          }
        })();
        return true;
      }

      // ── Usage: Get current usage info ──
      case 'GET_USAGE_INFO': {
        (async () => {
          try {
            const user = await getCurrentUser();
            if (user) {
              const usage = await getUsageInfo(user.id);
              broadcastToSidePanel({
                type: 'USAGE_INFO',
                payload: usage,
              });
            }
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Sync goals from Supabase ──
      case 'CAREER_SYNC_GOALS': {
        const { userId } = (message as PanelRequest & { type: 'CAREER_SYNC_GOALS' }).payload;
        (async () => {
          try {
            const goals = await getGoals(userId);
            broadcastToSidePanel({
              type: 'CAREER_GOALS_DATA',
              payload: { goals },
            });
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Upsert a goal to Supabase ──
      case 'CAREER_UPSERT_GOAL': {
        const { userId: uid, goal } = (message as PanelRequest & { type: 'CAREER_UPSERT_GOAL' }).payload;
        (async () => {
          try {
            await upsertGoal(uid, goal);
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Delete a goal from Supabase ──
      case 'CAREER_DELETE_GOAL': {
        const { goalId } = (message as PanelRequest & { type: 'CAREER_DELETE_GOAL' }).payload;
        (async () => {
          try {
            await deleteGoalApi(goalId);
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Sync analysis history from Supabase ──
      case 'CAREER_SYNC_HISTORY': {
        const { userId: histUserId } = (message as PanelRequest & { type: 'CAREER_SYNC_HISTORY' }).payload;
        (async () => {
          try {
            const history = await getAnalysisHistory(histUserId);
            broadcastToSidePanel({
              type: 'CAREER_HISTORY_DATA',
              payload: { history },
            });
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Get analysis detail for history drilldown ──
      case 'GET_ANALYSIS_DETAIL': {
        const { historyId } = (message as PanelRequest & { type: 'GET_ANALYSIS_DETAIL' }).payload;
        (async () => {
          try {
            const key = `analysis_detail_${historyId}`;
            const stored = await chrome?.storage?.local?.get(key);
            broadcastToSidePanel({
              type: 'ANALYSIS_DETAIL_RESULT',
              payload: { detail: stored?.[key] ?? null },
            });
          } catch {
            broadcastToSidePanel({
              type: 'ANALYSIS_DETAIL_RESULT',
              payload: { detail: null },
            });
          }
        })();
        return true;
      }

      // ── Career: Delete a history entry ──
      case 'DELETE_HISTORY_ENTRY': {
        const { historyId: delHistoryId } = (message as PanelRequest & { type: 'DELETE_HISTORY_ENTRY' }).payload;
        (async () => {
          try {
            // 1) Remove from career_history
            const stored = await chrome?.storage?.local?.get('career_history');
            const history: any[] = stored?.career_history ?? [];
            const updated = history.filter((h: any) => h.id !== delHistoryId);
            await chrome?.storage?.local?.set({ career_history: updated });

            // 2) Remove analysis_detail_*
            await chrome?.storage?.local?.remove(`analysis_detail_${delHistoryId}`);

            // 3) Remove from analysis_detail_index
            const idxStored = await chrome?.storage?.local?.get('analysis_detail_index');
            const index: any[] = idxStored?.analysis_detail_index ?? [];
            await chrome?.storage?.local?.set({
              analysis_detail_index: index.filter((i: any) => i.id !== delHistoryId),
            });
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Generate career document from history ──
      case 'GENERATE_CAREER_DOCUMENT': {
        const { history: docHistory, prompt: userPrompt } = (message as PanelRequest & { type: 'GENERATE_CAREER_DOCUMENT' }).payload;
        (async () => {
          try {
            const systemPrompt = `당신은 이력서 및 경력기술서 작성 전문가입니다.
사용자의 결재 문서 기안 이력을 분석하여, 업무 성과와 역량 중심의 경력 정리 문서를 작성해주세요.

핵심 원칙:
- 문서 유형(품의서, 지출결의서 등)을 나열하지 마세요. 문서 유형은 중요하지 않습니다.
- 대신, 그 문서를 통해 수행한 실제 업무 활동과 성과를 추출하세요.
- 각 항목은 "활동 주제 - 구체적 수행 내용 - 입증된 역량" 구조로 작성하세요.

작성 형식 (예시):
  직원 업무환경 개선활동
  - 사무실 공기질 측정 및 설문조사에 기반한 공기청정기 도입
  - 정량적 데이터 분석에 기반한 문제해결 능력

  신규 서비스 런칭 프로젝트
  - 시장조사 및 경쟁사 분석을 통한 서비스 기획
  - 크로스펑셔널 팀 협업을 통한 프로젝트 관리 역량

규칙:
1. 유사한 주제의 문서는 하나의 활동으로 통합
2. 각 활동에 대해 구체적 수행 내용과 입증된 역량/스킬을 반드시 포함
3. 이력서에 바로 복사할 수 있는 깔끔한 형식
4. 한국어로 작성
5. 절대 마크다운 문법(별표, 샵, 대시줄, 코드블록 등)을 사용하지 마세요. 순수 텍스트로만 작성하세요.
6. 구분선이 필요하면 빈 줄을 사용하세요.
7. 활동 주제는 업무 내용이 드러나는 명칭으로 작성 (예: "공기청정기 구매 품의서" X → "직원 업무환경 개선활동" O)`;

            // Build user prompt with history data
            const historyText = docHistory
              .map((h: any) => `- [${h.docType || '기타'}] ${h.subject} (${h.mode}, 점수: ${h.overallScore ?? 'N/A'}, ${h.createdAt?.slice(0, 10)})`)
              .join('\n');

            const fullUserPrompt = `다음은 사용자의 결재 문서 기안 이력입니다:\n\n${historyText}\n\n${userPrompt ? `추가 요청사항: ${userPrompt}` : '위 이력을 바탕으로 이력서에 적합한 경력 정리 문서를 작성해주세요.'}`;

            const content = await callChatCompletion({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: fullUserPrompt },
              ],
              max_tokens: 3000,
              temperature: 0.4,
            });

            broadcastToSidePanel({
              type: 'CAREER_DOCUMENT_RESULT',
              payload: { content },
            });
          } catch (err) {
            broadcastToSidePanel({
              type: 'CAREER_DOCUMENT_ERROR',
              payload: { message: err instanceof Error ? err.message : String(err) },
            });
          }
        })();
        return true;
      }

      // ── Career: Save generated career document ──
      case 'SAVE_CAREER_DOCUMENT': {
        const { document: careerDoc } = (message as PanelRequest & { type: 'SAVE_CAREER_DOCUMENT' }).payload;
        (async () => {
          try {
            // Save to chrome.storage.local (single writer — panel delegates here)
            const stored = await chrome?.storage?.local?.get('career_documents');
            const docs: any[] = stored?.career_documents ?? [];
            // Deduplicate: skip if doc with same id already exists
            if (!docs.some((d: any) => d.id === careerDoc.id)) {
              docs.push(careerDoc);
            }
            // Keep only last 50
            const trimmed = docs.slice(-50);
            await chrome?.storage?.local?.set({ career_documents: trimmed });

            // Broadcast updated list back to panel so it has confirmed persisted state
            broadcastToSidePanel({
              type: 'CAREER_DOCUMENTS_DATA',
              payload: { documents: trimmed },
            });

            // Sync to Supabase if user is logged in
            const userStored = await chrome?.storage?.local?.get('current_user_id');
            const userId = userStored?.current_user_id;
            if (userId) {
              await saveCareerDocApi(userId, careerDoc);
            }
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Delete a career document ──
      case 'DELETE_CAREER_DOCUMENT': {
        const { docId: delDocId } = (message as PanelRequest & { type: 'DELETE_CAREER_DOCUMENT' }).payload;
        (async () => {
          try {
            const stored = await chrome?.storage?.local?.get('career_documents');
            const docs: any[] = stored?.career_documents ?? [];
            const updated = docs.filter((d: any) => d.id !== delDocId);
            await chrome?.storage?.local?.set({ career_documents: updated });

            // Broadcast updated list back to panel
            broadcastToSidePanel({
              type: 'CAREER_DOCUMENTS_DATA',
              payload: { documents: updated },
            });

            await deleteCareerDocApi(delDocId);
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Career: Load saved career documents ──
      case 'LOAD_CAREER_DOCUMENTS': {
        (async () => {
          try {
            const stored = await chrome?.storage?.local?.get('career_documents');
            const docs: any[] = stored?.career_documents ?? [];
            broadcastToSidePanel({
              type: 'CAREER_DOCUMENTS_DATA',
              payload: { documents: docs },
            });

            // Also try Supabase sync
            const userStored = await chrome?.storage?.local?.get('current_user_id');
            const userId = userStored?.current_user_id;
            if (userId) {
              const supaDocs = await getCareerDocuments(userId);
              if (supaDocs.length > 0) {
                // Merge: Supabase docs + local-only docs
                const supaIds = new Set(supaDocs.map((d) => d.id));
                const localOnly = docs.filter((d: any) => !supaIds.has(d.id));
                const merged = [...supaDocs, ...localOnly];
                await chrome?.storage?.local?.set({ career_documents: merged });
                broadcastToSidePanel({
                  type: 'CAREER_DOCUMENTS_DATA',
                  payload: { documents: merged },
                });
              }
            }
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      // ── Feedback: Submit false-positive report ──
      case 'SUBMIT_FEEDBACK': {
        const { category, originalDetail, userMessage } = (message as PanelRequest & { type: 'SUBMIT_FEEDBACK' }).payload;
        (async () => {
          try {
            const stored = await chrome?.storage?.local?.get('feedback_rules');
            const rules: FeedbackRule[] = stored?.feedback_rules ?? [];
            rules.push({
              id: `fb-${Date.now()}`,
              category,
              originalDetail,
              userMessage,
              createdAt: new Date().toISOString(),
            });
            // Keep only last 100, oldest first removed
            await chrome?.storage?.local?.set({ feedback_rules: rules.slice(-100) });
          } catch {
            // Non-critical
          }
        })();
        return true;
      }

      default:
        return false;
    }
  },
);
