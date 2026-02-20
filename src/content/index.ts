import type { ParseRule, GroupwareType } from '@shared/types';
import type { ContentMessage, BackgroundMessage } from '@shared/messages';
import { detectGroupware } from './detector';
import { getDocumentSkeleton } from './skeleton';
import { parseDocument, extractRawText } from './parser';
import {
  highlightKeywords,
  clearHighlights,
  scrollToHighlight,
  toggleHighlights,
  applyAnalysisHighlights,
  showCheckConnection,
} from './highlighter';

/**
 * Sends a message to the background service worker.
 * Guards against missing chrome runtime (e.g. during unit tests).
 */
function sendToBackground(message: ContentMessage): void {
  try {
    chrome?.runtime?.sendMessage?.(message);
  } catch {
    // Extension context may have been invalidated — silently ignore
  }
}

/**
 * Tracks the current URL so we can detect SPA navigation changes.
 */
let currentUrl = '';

/**
 * Stores the detected groupware type for the current page.
 */
let currentGroupware: GroupwareType = 'unknown';

/**
 * Quick heuristic: does this page look like an approval document?
 * Checks for Korean approval-related keywords in the page text.
 */
function looksLikeApprovalDoc(): boolean {
  const text = document.body?.innerText || '';
  const keywords = ['결재', '기안', '승인', '품의', '반려', '결의', '기안자', '결재선', '결재일'];
  let matchCount = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) matchCount++;
  }
  return matchCount >= 2;
}

/**
 * Main content script initialization.
 * Detects groupware type and notifies background.
 * Does NOT auto-trigger analysis — waits for START_PARSE from background.
 */
async function initialize(): Promise<void> {
  currentUrl = window.location.href;

  // Step 1: Detect groupware type
  currentGroupware = detectGroupware();

  // For unknown groupware, check if the page looks like an approval doc
  if (currentGroupware === 'unknown') {
    if (!looksLikeApprovalDoc()) {
      return; // Not an approval document — silently exit
    }
  }

  // Step 2: Notify background that we found a groupware page
  sendToBackground({
    type: 'PAGE_DETECTED',
    payload: {
      url: currentUrl,
      groupware: currentGroupware,
    },
  });
}

/**
 * Starts the DOM parsing flow. Called when background sends START_PARSE.
 * Extracts DOM skeleton, sends hash to background for rule generation.
 */
async function startParse(): Promise<void> {
  const skeletonResult = await getDocumentSkeleton();

  if (!skeletonResult) {
    return;
  }

  const { hash, domHtml } = skeletonResult;

  sendToBackground({
    type: 'DOM_HASH',
    payload: {
      hash,
      groupware: currentGroupware,
      domHtml,
    },
  });
}

/**
 * Listens for messages from the background service worker.
 */
function setupMessageListener(): void {
  chrome?.runtime?.onMessage?.addListener(
    (
      message: BackgroundMessage,
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: any) => void,
    ) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case 'START_PARSE': {
          startParse();
          break;
        }

        case 'PARSE_RULE': {
          // Step 5: We received CSS selectors — parse the document
          const rule: ParseRule = message.payload;
          const parsedDoc = parseDocument(rule, currentGroupware);

          // Always extract rawText for supplementary analysis context
          parsedDoc.rawText = extractRawText();

          // Step 6: Send the parsed document to background
          sendToBackground({
            type: 'DOM_PARSED',
            payload: parsedDoc,
          });
          break;
        }

        case 'ANALYSIS_COMPLETE': {
          // No longer auto-highlight — user activates via click-to-highlight
          break;
        }

        case 'HIGHLIGHT_TEXT': {
          const { keywords, className } = message.payload;
          highlightKeywords(keywords, className);
          break;
        }

        case 'CLEAR_HIGHLIGHTS': {
          clearHighlights();
          break;
        }

        case 'SCROLL_TO_HIGHLIGHT': {
          scrollToHighlight(message.payload.text);
          break;
        }

        case 'SHOW_CHECK_CONNECTION': {
          const { item, detail, subject, score, weight, checkResult, evidenceRefs } = message.payload;
          showCheckConnection(item, detail, subject, score, weight, checkResult, evidenceRefs);
          break;
        }

        case 'TOGGLE_HIGHLIGHTS': {
          const data = message.payload;
          toggleHighlights(data ?? undefined);
          break;
        }

        case 'ERROR': {
          console.warn(
            '[ApprovalGraph] Background error:',
            message.payload.message,
          );
          break;
        }
      }
    },
  );
}

/**
 * Sets up a MutationObserver to detect SPA navigation by monitoring
 * URL changes. When the URL changes, we re-run the initialization flow.
 */
function setupNavigationObserver(): void {
  let lastUrl = window.location.href;

  const observer = new MutationObserver(() => {
    const newUrl = window.location.href;
    if (newUrl !== lastUrl) {
      lastUrl = newUrl;
      // URL changed — re-initialize after a short delay to allow DOM updates
      setTimeout(() => {
        initialize();
      }, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// ─── Entrypoint (document_idle) ───

setupMessageListener();
initialize();
setupNavigationObserver();
