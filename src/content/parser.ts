import type {
  ParseRule,
  ParsedDocument,
  ApprovalLineItem,
  AttachmentMeta,
  GroupwareType,
} from '@shared/types';
import { MAX_RAW_TEXT_LENGTH } from '@shared/constants';

/**
 * Safely queries a single element and returns its trimmed text content,
 * or an empty string if the selector is empty or doesn't match.
 */
function safeQueryText(selector: string): string {
  if (!selector) return '';

  try {
    const el = document.querySelector(selector);
    return el?.textContent?.trim() || '';
  } catch {
    return '';
  }
}

/**
 * Status keywords mapped to their canonical ApprovalLineItem status values.
 */
/**
 * Ordered longest-first to prevent substring collisions
 * (e.g., '미결재' must be checked before '결재').
 */
const STATUS_MAP: [string, ApprovalLineItem['status']][] = [
  // Korean — longer keywords first
  ['미결재', 'pending'],
  ['미결', 'pending'],
  ['승인', 'approved'],
  ['결재', 'approved'],
  ['완료', 'approved'],
  ['합의', 'approved'],
  ['전결', 'approved'],
  ['반려', 'rejected'],
  ['거부', 'rejected'],
  ['대기', 'pending'],
  ['진행', 'pending'],
  ['예정', 'pending'],
  // English
  ['approved', 'approved'],
  ['rejected', 'rejected'],
  ['pending', 'pending'],
];

/**
 * Parses a status text string into a canonical status.
 */
function parseStatus(text: string): ApprovalLineItem['status'] {
  const normalized = text.trim().toLowerCase();

  for (const [keyword, status] of STATUS_MAP) {
    if (normalized.includes(keyword)) {
      return status;
    }
  }

  return 'pending';
}

/**
 * Extracts approval line items from the approval_line container element.
 *
 * Strategy:
 * 1. Find the container via the selector.
 * 2. Look for table rows (<tr>) within it.
 * 3. For each row (skipping the header), extract name, position, and status
 *    from the cells.
 * 4. If no table is found, try list items (<li>) or direct child divs.
 */
function parseApprovalLine(selector: string): ApprovalLineItem[] {
  if (!selector) return [];

  let container: Element | null = null;
  try {
    container = document.querySelector(selector);
  } catch {
    return [];
  }

  if (!container) return [];

  const items: ApprovalLineItem[] = [];

  // --- Strategy 1: Table rows ---
  const rows = container.querySelectorAll('tr');
  if (rows.length > 0) {
    // Determine if the first row is a header
    const firstRow = rows[0];
    const isHeader =
      firstRow.querySelector('th') !== null ||
      (firstRow.textContent || '').includes('결재자') ||
      (firstRow.textContent || '').includes('직위') ||
      (firstRow.textContent || '').includes('이름');

    const startIndex = isHeader ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td, th');
      if (cells.length === 0) continue;

      const cellTexts = Array.from(cells).map(
        (c) => c.textContent?.trim() || '',
      );

      // Try to identify name / position / status from cells
      let name = '';
      let position = '';
      let statusText = '';

      if (cellTexts.length >= 3) {
        // Common layout: [position, name, status] or [name, position, status]
        // Heuristic: if the first cell looks like a Korean title/role, treat it as position
        const firstIsPosition =
          cellTexts[0].length <= 10 &&
          !cellTexts[0].match(/[가-힣]{2,4}$/);

        if (firstIsPosition) {
          position = cellTexts[0];
          name = cellTexts[1];
          statusText = cellTexts[2];
        } else {
          name = cellTexts[0];
          position = cellTexts[1];
          statusText = cellTexts[2];
        }
      } else if (cellTexts.length === 2) {
        name = cellTexts[0];
        statusText = cellTexts[1];
      } else if (cellTexts.length === 1) {
        name = cellTexts[0];
      }

      if (name) {
        items.push({
          name,
          position,
          status: parseStatus(statusText),
        });
      }
    }

    if (items.length > 0) return items;
  }

  // --- Strategy 2: List items ---
  const listItems = container.querySelectorAll('li');
  if (listItems.length > 0) {
    listItems.forEach((li) => {
      const text = li.textContent?.trim() || '';
      if (!text) return;

      // Try to split by common delimiters
      const parts = text.split(/[|/\-·]/).map((p) => p.trim());

      if (parts.length >= 2) {
        items.push({
          name: parts[0],
          position: parts.length >= 3 ? parts[1] : '',
          status: parseStatus(parts[parts.length - 1]),
        });
      } else {
        items.push({ name: text, position: '', status: 'pending' });
      }
    });

    if (items.length > 0) return items;
  }

  // --- Strategy 3: Card-based layout (modern groupware) ---
  // Look for repeating card elements that contain approver info
  const cardSelectors = [
    ':scope > div > div',
    ':scope .approval-card',
    ':scope .approver',
    ':scope [class*="card"]',
    ':scope [class*="step"]',
    ':scope [class*="approver"]',
    ':scope [class*="signer"]',
  ];

  for (const sel of cardSelectors) {
    try {
      const cards = container.querySelectorAll(sel);
      if (cards.length >= 2) {
        cards.forEach((card) => {
          const text = card.textContent?.trim() || '';
          if (!text || text.length > 200) return;

          // Extract name: look for Korean name pattern (2-4 characters)
          const nameMatch = text.match(/([가-힣]{2,4})(?:\s|$)/);
          // Extract position: common Korean titles
          const posMatch = text.match(/(과장|부장|팀장|대리|사원|차장|상무|전무|이사|대표|실장|본부장|센터장|매니저|주임)/);

          let statusText = '';
          for (const [kw] of STATUS_MAP) {
            if (text.includes(kw)) {
              statusText = kw;
              break;
            }
          }

          if (nameMatch) {
            items.push({
              name: nameMatch[1],
              position: posMatch ? posMatch[1] : '',
              status: parseStatus(statusText),
            });
          }
        });

        if (items.length > 0) return items;
      }
    } catch {
      // Invalid selector — skip
    }
  }

  // --- Strategy 4: Direct child divs / spans ---
  const children = container.querySelectorAll(':scope > div, :scope > span');
  children.forEach((child) => {
    const text = child.textContent?.trim() || '';
    if (text && text.length > 1 && text.length < 100) {
      items.push({ name: text, position: '', status: 'pending' });
    }
  });

  return items;
}

/**
 * Detects the file type from a filename extension.
 */
function detectFileType(name: string): AttachmentMeta['type'] {
  const lower = name.toLowerCase();
  if (/\.pdf$/i.test(lower)) return 'pdf';
  if (/\.(xlsx?|csv)$/i.test(lower)) return 'excel';
  if (/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(lower)) return 'image';
  if (/^https?:\/\//i.test(lower)) return 'link';
  return 'other';
}

/**
 * Extracts attachment metadata from the page.
 * Looks for common attachment section patterns across groupware systems.
 */
function parseAttachments(): AttachmentMeta[] {
  const selectors = [
    '.daou-file-list li',
    '.attach-list li', '.attachment-list li', '.file-list li',
    '[class*="attach"] li', '[class*="file"] a',
    '.doc_attach li', '.doc-attach li',
  ];

  const items: AttachmentMeta[] = [];
  const seen = new Set<string>();

  for (const sel of selectors) {
    try {
      const els = document.querySelectorAll(sel);
      if (els.length === 0) continue;

      els.forEach((el) => {
        const link = el.querySelector('a');
        const name = (link?.textContent || el.textContent || '').trim();
        if (!name || name.length < 2 || seen.has(name)) return;
        seen.add(name);

        const sizeEl = el.querySelector('[class*="size"]');
        const size = sizeEl?.textContent?.trim() || '';

        items.push({
          name,
          size,
          type: detectFileType(name),
          url: link?.href || undefined,
        });
      });

      if (items.length > 0) break;
    } catch {
      // Invalid selector — skip
    }
  }

  return items;
}

/**
 * Extracts images from the document body as base64 data URLs.
 * Tables pasted as images are common in Korean groupware.
 * Resizes to max 1024px wide to keep Vision API cost low.
 */
function extractBodyImages(bodySelector: string): string[] {
  const MAX_IMAGES = 5;
  const MAX_WIDTH = 1024;
  const MIN_SIZE = 50; // skip tiny icons/spacers

  let container: Element | null = null;
  try {
    container = bodySelector ? document.querySelector(bodySelector) : null;
  } catch { /* invalid selector */ }
  if (!container) container = document.body;

  const imgs = container.querySelectorAll('img');
  const results: string[] = [];

  for (const img of imgs) {
    if (results.length >= MAX_IMAGES) break;
    if (!img.complete || img.naturalWidth < MIN_SIZE || img.naturalHeight < MIN_SIZE) continue;

    try {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (w > MAX_WIDTH) {
        h = Math.round(h * (MAX_WIDTH / w));
        w = MAX_WIDTH;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Only include if meaningful size (skip tiny or broken images)
      if (dataUrl.length > 1000) {
        results.push(dataUrl);
      }
    } catch {
      // Cross-origin or tainted canvas — skip
    }
  }

  return results;
}

/**
 * Extracts HTML tables from the document body and converts them to markdown.
 * Limited to 5 tables and 4000 total characters.
 */
function extractTableMarkdown(bodySelector: string): string {
  const MAX_TABLES = 5;
  const MAX_TOTAL_CHARS = 4000;

  let container: Element | null = null;
  try {
    container = bodySelector ? document.querySelector(bodySelector) : null;
  } catch { /* invalid selector */ }
  if (!container) container = document.body;

  const tables = container.querySelectorAll('table');
  if (tables.length === 0) return '';

  const parts: string[] = [];
  let totalLen = 0;

  for (let t = 0; t < tables.length && t < MAX_TABLES; t++) {
    const rows = tables[t].querySelectorAll('tr');
    if (rows.length === 0) continue;

    const mdRows: string[] = [];
    let colCount = 0;

    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll('td, th');
      if (cells.length === 0) continue;

      const cellTexts = Array.from(cells).map(
        (c) => (c.textContent?.trim() || '').replace(/\|/g, '\\|').replace(/\n/g, ' '),
      );
      const row = '| ' + cellTexts.join(' | ') + ' |';
      mdRows.push(row);

      if (r === 0) {
        colCount = cellTexts.length;
        // Add separator after header row
        mdRows.push('|' + ' --- |'.repeat(colCount));
      }
    }

    if (mdRows.length <= 1) continue; // skip empty tables (header-only)

    const tableMd = mdRows.join('\n');
    if (totalLen + tableMd.length > MAX_TOTAL_CHARS) break;

    parts.push(tableMd);
    totalLen += tableMd.length;
  }

  return parts.join('\n\n');
}

/**
 * Root selectors for locating the document container (mirrors skeleton.ts).
 */
const RAW_TEXT_ROOT_SELECTORS = [
  '#divFormBind', '.div_form_bind',
  '#icubeWrap .content-area', '#icubeWrap',
  '.bizbox-content', '#docForm', '#formView',
  '.gw-form-content', '.doc-form-wrap',
  '.approval-content', '#approval-content',
  '#docView', '#doc-view', '.doc-content', '#docContent',
  '#ea-doc-content', '.ea-doc-view', '#eaDocContent',
  'article', 'main', 'form',
];

/**
 * Extracts raw text from the document root for fallback parsing.
 * Tries known root selectors, then falls back to the largest content div.
 */
export function extractRawText(): string {
  // 1) Try known root selectors
  for (const sel of RAW_TEXT_ROOT_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (el && (el.textContent || '').trim().length > 50) {
        const text = (el as HTMLElement).innerText || el.textContent || '';
        return text.trim().slice(0, MAX_RAW_TEXT_LENGTH);
      }
    } catch { /* invalid selector */ }
  }

  // 2) Fallback: largest content container
  const candidates = document.querySelectorAll(
    'div[class*="content"], div[class*="doc"], div[class*="view"], div[class*="approval"]',
  );
  let best: Element | null = null;
  let bestLen = 0;
  candidates.forEach((el) => {
    const len = (el.textContent || '').trim().length;
    if (len > bestLen && len > 100) {
      bestLen = len;
      best = el;
    }
  });

  if (best !== null) {
    const bestEl: HTMLElement = best as HTMLElement;
    const text = bestEl.innerText || bestEl.textContent || '';
    return text.trim().slice(0, MAX_RAW_TEXT_LENGTH);
  }

  // 3) Ultimate fallback: body
  if (document.body) {
    const text = document.body.innerText || document.body.textContent || '';
    return text.trim().slice(0, MAX_RAW_TEXT_LENGTH);
  }

  return '';
}

/**
 * Applies CSS selectors from a ParseRule to extract a ParsedDocument
 * from the current page DOM.
 */
export function parseDocument(
  rule: ParseRule,
  groupware: GroupwareType,
): ParsedDocument {
  return {
    doc_type: safeQueryText(rule.doc_type),
    subject: safeQueryText(rule.subject),
    body: safeQueryText(rule.body),
    requester_name: safeQueryText(rule.requester_name),
    requester_dept: safeQueryText(rule.requester_dept),
    approval_line: parseApprovalLine(rule.approval_line),
    created_at: safeQueryText(rule.created_at),
    groupware,
    attachments: parseAttachments(),
    bodyImages: extractBodyImages(rule.body),
    tableMarkdown: extractTableMarkdown(rule.body),
  };
}
