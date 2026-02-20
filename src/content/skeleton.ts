import { extractDOMSkeleton, hashSkeleton } from '@lib/hash';
import { MAX_DOM_HTML_LENGTH } from '@shared/constants';

/**
 * Candidate selectors for locating the main approval document root element.
 * Ordered from most specific to most generic.
 */
const ROOT_SELECTORS = [
  // Bizbox Alpha (expanded)
  '#divFormBind',
  '.div_form_bind',
  '#icubeWrap .content-area',
  '#icubeWrap',
  '.bizbox-content',
  '#docForm',
  '#formView',
  '.gw-form-content',
  '.doc-form-wrap',
  // Generic approval
  '.approval-content',
  '#approval-content',
  '#docView',
  '#doc-view',
  '.doc-content',
  '#docContent',
  '[data-approval]',
  '[data-approval-doc]',
  '.approval-view',
  '.approval-wrap',
  '#approval-view',
  '.document-view',
  '#document-view',
  '.doc-view-wrap',
  '.content-wrapper',
  '#contentWrap',
  // Hiworks / Daou
  '#ea-doc-content',
  '.ea-doc-view',
  '#eaDocContent',
  // General
  'article',
  'main',
  'form',
] as const;

/**
 * Finds the main approval document root element in the current page.
 * Returns the first matching element that contains meaningful content.
 */
function findDocumentRoot(): Element | null {
  for (const selector of ROOT_SELECTORS) {
    try {
      const el = document.querySelector(selector);
      if (el && el.innerHTML.trim().length > 50) {
        return el;
      }
    } catch {
      // Invalid selector — skip
    }
  }

  // Fallback: look for the largest content container in the body
  const candidates = document.querySelectorAll(
    'div[class*="content"], div[class*="doc"], div[class*="view"], div[class*="approval"]',
  );

  let bestCandidate: Element | null = null;
  let bestLength = 0;

  candidates.forEach((el) => {
    const textLen = (el.textContent || '').trim().length;
    if (textLen > bestLength && textLen > 100) {
      bestLength = textLen;
      bestCandidate = el;
    }
  });

  if (bestCandidate) {
    return bestCandidate;
  }

  // Ultimate fallback: use document.body if it has enough content
  if (document.body && (document.body.textContent || '').trim().length > 100) {
    return document.body;
  }

  return null;
}

/**
 * Extracts the document skeleton, computes its hash, and captures the outer HTML
 * (trimmed to MAX_DOM_HTML_LENGTH).
 *
 * Returns null if no suitable root element is found.
 */
export async function getDocumentSkeleton(): Promise<{
  skeleton: string;
  hash: string;
  domHtml: string;
} | null> {
  const root = findDocumentRoot();

  if (!root) {
    return null;
  }

  const skeleton = extractDOMSkeleton(root);
  const hash = await hashSkeleton(skeleton);

  let domHtml = root.outerHTML;
  if (domHtml.length > MAX_DOM_HTML_LENGTH) {
    domHtml = domHtml.slice(0, MAX_DOM_HTML_LENGTH);
  }

  return { skeleton, hash, domHtml };
}
