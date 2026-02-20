import Mark from 'mark.js';
import type { CausalChain } from '@shared/types';

// ─── Types ───

interface CheckInfo {
  item: string;
  result: string;
  detail: string;
}

// ─── State ───

let instance: Mark | null = null;
let styleEl: HTMLStyleElement | null = null;
let tooltipEl: HTMLDivElement | null = null;
let panelEl: HTMLDivElement | null = null;
let isEnabled = false;

/** Maps highlighted phrase → analysis check info for tooltip display */
const checkMap = new Map<string, CheckInfo>();

/** Maps keyword → CausalChain for click panel display */
const chainMap = new Map<string, CausalChain>();

// ─── Highlight + Tooltip + Panel Styles ───

const HIGHLIGHT_CSS = `
mark.ag-hl-keyword {
  background: rgba(99, 102, 241, 0.15);
  border-bottom: 2px solid #6366f1;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
  transition: background 0.2s;
}
mark.ag-hl-keyword:hover { background: rgba(99, 102, 241, 0.30); }

mark.ag-hl-pass {
  background: rgba(16, 185, 129, 0.12);
  border-bottom: 2px solid #10b981;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-pass:hover { background: rgba(16, 185, 129, 0.28); }

mark.ag-hl-warn {
  background: rgba(245, 158, 11, 0.15);
  border-bottom: 2px solid #f59e0b;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-warn:hover { background: rgba(245, 158, 11, 0.32); }

mark.ag-hl-fail {
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 2px solid #ef4444;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-fail:hover { background: rgba(239, 68, 68, 0.30); }

mark.ag-hl-active {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  border-radius: 2px;
  animation: ag-hl-pulse 0.6s ease-in-out 3;
}
@keyframes ag-hl-pulse {
  0%, 100% { outline-color: #4f46e5; }
  50% { outline-color: transparent; }
}

/* Tooltip (hover) */
#ag-tooltip {
  position: fixed;
  z-index: 2147483647;
  max-width: 320px;
  padding: 10px 14px;
  background: #1e293b;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.15s, transform 0.15s;
}
#ag-tooltip.ag-tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}
#ag-tooltip .ag-tt-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
}
#ag-tooltip .ag-tt-badge-pass { background: #10b981; color: #fff; }
#ag-tooltip .ag-tt-badge-warn { background: #f59e0b; color: #fff; }
#ag-tooltip .ag-tt-badge-fail { background: #ef4444; color: #fff; }
#ag-tooltip .ag-tt-badge-keyword { background: #6366f1; color: #fff; }
#ag-tooltip .ag-tt-item {
  font-weight: 600;
  margin-bottom: 4px;
}
#ag-tooltip .ag-tt-detail {
  color: #cbd5e1;
}
#ag-tooltip .ag-tt-hint {
  color: #94a3b8;
  font-size: 10px;
  margin-top: 6px;
  border-top: 1px solid #334155;
  padding-top: 4px;
}

/* Causal Chain Panel (click) — Bottom-up timeline */
#ag-chain-panel {
  position: fixed;
  z-index: 2147483647;
  width: 340px;
  background: #0f172a;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.2);
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  overflow: hidden;
}
#ag-chain-panel.ag-panel-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Panel header */
#ag-chain-panel .ag-cp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-bottom: 1px solid #3730a3;
}
#ag-chain-panel .ag-cp-title {
  font-size: 13px;
  font-weight: 700;
  color: #c7d2fe;
}
#ag-chain-panel .ag-cp-close {
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: #a5b4fc;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  transition: background 0.15s;
}
#ag-chain-panel .ag-cp-close:hover {
  background: rgba(255,255,255,0.2);
}

/* Timeline container */
#ag-chain-panel .ag-cp-timeline {
  position: relative;
  padding: 16px 14px 12px 14px;
}

/* Continuous vertical line */
#ag-chain-panel .ag-cp-line {
  position: absolute;
  left: 25px;
  top: 28px;
  bottom: 24px;
  width: 2px;
  border-radius: 2px;
}

/* Single timeline row */
#ag-chain-panel .ag-cp-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

/* Node dot */
#ag-chain-panel .ag-cp-dot {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
#ag-chain-panel .ag-cp-dot-top {
  background: #6366f1;
  border-color: #818cf8;
  width: 26px;
  height: 26px;
  font-size: 12px;
}
#ag-chain-panel .ag-cp-dot-bottom {
  background: #10b981;
  border-color: #34d399;
  width: 26px;
  height: 26px;
  font-size: 12px;
}
#ag-chain-panel .ag-cp-dot-mid {
  background: #334155;
  border-color: #475569;
}

/* Node label */
#ag-chain-panel .ag-cp-label {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
}
#ag-chain-panel .ag-cp-label-top {
  font-weight: 700;
  color: #a5b4fc;
}
#ag-chain-panel .ag-cp-label-bottom {
  font-weight: 700;
  color: #6ee7b7;
}
#ag-chain-panel .ag-cp-label-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.3px;
  vertical-align: middle;
}
#ag-chain-panel .ag-cp-label-tag-value {
  background: rgba(99,102,241,0.2);
  color: #a5b4fc;
}
#ag-chain-panel .ag-cp-label-tag-base {
  background: rgba(16,185,129,0.2);
  color: #6ee7b7;
}

/* KPI section */
#ag-chain-panel .ag-cp-kpi {
  padding: 0 14px 12px;
}
#ag-chain-panel .ag-cp-kpi-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
#ag-chain-panel .ag-cp-kpi-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
#ag-chain-panel .ag-cp-kpi-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px;
  font-size: 11px;
  color: #c7d2fe;
}
#ag-chain-panel .ag-cp-kpi-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #818cf8;
}

/* Impact footer */
#ag-chain-panel .ag-cp-impact {
  padding: 8px 14px;
  background: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
}
#ag-chain-panel .ag-cp-impact-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
#ag-chain-panel .ag-cp-impact-high {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
#ag-chain-panel .ag-cp-impact-medium {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}
#ag-chain-panel .ag-cp-impact-low {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

/* ── Connection Overlay ── */
.ag-conn-highlight-title {
  position: relative;
  outline: 3px solid #6366f1 !important;
  outline-offset: 3px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.10) !important;
  z-index: 1;
}
.ag-conn-highlight-body {
  position: relative;
  outline: 3px solid #10b981 !important;
  outline-offset: 3px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.10) !important;
  z-index: 1;
}
.ag-conn-label {
  position: fixed;
  z-index: 2147483647;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
  white-space: nowrap;
  animation: ag-conn-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.ag-conn-label-title {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,0.4);
}
.ag-conn-label-body {
  background: #10b981;
  color: #fff;
  box-shadow: 0 2px 8px rgba(16,185,129,0.4);
}
@keyframes ag-conn-pop {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Convergence Node ── */
.ag-conn-node {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background: #fff;
  border: 2px solid #6366f1;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(99,102,241,0.22), 0 0 0 1px rgba(99,102,241,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  pointer-events: none;
  animation: ag-conn-node-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.ag-conn-node-title {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  white-space: nowrap;
}
.ag-conn-node-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16,185,129,0.12);
  color: #059669;
  font-size: 10px;
  font-weight: 700;
}
@keyframes ag-conn-node-in {
  from { opacity: 0; transform: scale(0.8) translateX(20px); }
  to   { opacity: 1; transform: scale(1) translateX(0); }
}
`;

// ─── Helpers ───

/** Escapes HTML special characters to prevent XSS when inserting into innerHTML. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function ensureStyles(): void {
  if (styleEl) return;
  styleEl = document.createElement('style');
  styleEl.id = 'ag-highlight-styles';
  styleEl.textContent = HIGHLIGHT_CSS;
  document.head.appendChild(styleEl);
}

function ensureTooltip(): void {
  if (tooltipEl) return;
  tooltipEl = document.createElement('div');
  tooltipEl.id = 'ag-tooltip';
  document.body.appendChild(tooltipEl);
}

function ensurePanel(): void {
  if (panelEl) return;
  panelEl = document.createElement('div');
  panelEl.id = 'ag-chain-panel';
  document.body.appendChild(panelEl);
}

function getContext(): HTMLElement {
  const selectors = [
    '.document-body', '.doc-content', '.view-content',
    '#docBody', '#contents', '.approval-content',
    '.doc_contents', '.editor-content', '.doc-view',
    '#divFormBind', '.div_form_bind',
    '[data-role="doc-body"]', '.doc-body',
    'article', 'main', '.content-wrap',
  ];

  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }

  return document.body;
}

/**
 * Finds the CheckInfo for a given mark element by matching its text
 * against the checkMap keys.
 */
function findCheckForMark(markEl: HTMLElement): { phrase: string; info: CheckInfo } | null {
  const text = markEl.textContent || '';

  for (const [phrase, info] of checkMap) {
    if (text.includes(phrase) || phrase.includes(text)) {
      return { phrase, info };
    }
  }

  return null;
}

/**
 * Finds the CausalChain for a given mark element by matching its text
 * against the chainMap keys.
 */
function findChainForMark(markEl: HTMLElement): CausalChain | null {
  const text = (markEl.textContent || '').toLowerCase();

  for (const [keyword, chain] of chainMap) {
    if (text.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(text)) {
      return chain;
    }
  }

  return null;
}

/**
 * Returns the result category from mark element classes.
 */
function getCategory(markEl: HTMLElement): string {
  if (markEl.classList.contains('ag-hl-pass')) return 'pass';
  if (markEl.classList.contains('ag-hl-warn')) return 'warn';
  if (markEl.classList.contains('ag-hl-fail')) return 'fail';
  return 'keyword';
}

const RESULT_LABELS: Record<string, string> = {
  pass: 'Pass',
  warn: 'Warn',
  fail: 'Fail',
  keyword: '주제',
};

const IMPACT_LABELS: Record<string, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const NODE_ICONS = ['💡', '🔄', '📈', '🎯', '🏆', '⚡', '🚀'];

// ─── Tooltip Logic (hover) ───

function showTooltip(markEl: HTMLElement): void {
  ensureTooltip();
  if (!tooltipEl) return;

  const category = getCategory(markEl);
  const checkData = findCheckForMark(markEl);
  const hasChain = findChainForMark(markEl) !== null;

  let html: string;

  if (checkData) {
    html = `
      <div class="ag-tt-item">
        <span class="ag-tt-badge ag-tt-badge-${category}">${RESULT_LABELS[category]}</span>
        ${escapeHtml(checkData.info.item)}
      </div>
      <div class="ag-tt-detail">${escapeHtml(checkData.info.detail)}</div>
    `;
  } else {
    const text = markEl.textContent || '';
    html = `
      <div class="ag-tt-item">
        <span class="ag-tt-badge ag-tt-badge-keyword">주제</span>
        ${escapeHtml(text)}
      </div>
      <div class="ag-tt-detail">문서의 핵심 주제 키워드</div>
    `;
  }

  if (hasChain) {
    html += `<div class="ag-tt-hint">클릭하면 인과관계 · KPI 연관도 표시</div>`;
  }

  tooltipEl.innerHTML = html;

  // Position tooltip above the mark element
  const rect = markEl.getBoundingClientRect();
  const ttWidth = 320;

  let left = rect.left + rect.width / 2 - ttWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - ttWidth - 8));

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = '0px';
  tooltipEl.style.maxWidth = `${ttWidth}px`;
  tooltipEl.classList.add('ag-tooltip-visible');

  const ttHeight = tooltipEl.offsetHeight;
  let top = rect.top - ttHeight - 8;

  if (top < 8) {
    top = rect.bottom + 8;
  }

  tooltipEl.style.top = `${top}px`;
}

function hideTooltip(): void {
  if (tooltipEl) {
    tooltipEl.classList.remove('ag-tooltip-visible');
  }
}

// ─── Causal Chain Panel (click) ───

function showChainPanel(markEl: HTMLElement): void {
  const chain = findChainForMark(markEl);
  if (!chain) return;

  hideTooltip();
  ensurePanel();
  if (!panelEl) return;

  const total = chain.chain.length;

  // Build staircase rows (bottom-up: first=base at bottom, last=goal at top)
  // Display reversed so goal is on top visually
  const stairsHtml = [...chain.chain].reverse()
    .map((step, i) => {
      const origIdx = total - 1 - i; // original index (0=base, last=goal)
      const isGoal = origIdx === total - 1;
      const isBase = origIdx === 0;

      // Right-ascending indent: top row most indented, bottom row least
      const indent = Math.round((origIdx / Math.max(total - 1, 1)) * 120);

      // Color
      const borderColor = isGoal ? '#6366f1' : isBase ? '#10b981' : '#475569';
      const bgColor = isGoal ? 'rgba(99,102,241,0.08)' : isBase ? 'rgba(16,185,129,0.08)' : 'rgba(51,65,85,0.06)';
      const textColor = isGoal ? '#a5b4fc' : isBase ? '#6ee7b7' : '#e2e8f0';
      const icon = isGoal ? '🎯' : isBase ? '📋' : '▸';
      const tag = isGoal
        ? '<span class="ag-cp-label-tag ag-cp-label-tag-value">목표</span>'
        : isBase
          ? '<span class="ag-cp-label-tag ag-cp-label-tag-base">기안</span>'
          : '';

      // Connector between steps (diagonal line effect)
      const connector = i > 0
        ? `<div style="padding-left:${indent - 10}px;height:10px;display:flex;align-items:center;">
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" style="color:#334155">
              <path d="M2 10 L10 2 L18 2" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>`
        : '';

      return `${connector}<div style="margin-left:${indent}px;border-left:3px solid ${borderColor};background:${bgColor};border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;">${icon}</span>
        <span style="font-size:12px;font-weight:${isGoal || isBase ? '700' : '500'};color:${textColor};">${escapeHtml(step)}${tag}</span>
      </div>`;
    })
    .join('');

  // KPI section
  const kpisHtml = chain.kpis.length > 0
    ? `<div class="ag-cp-kpi">
        <div class="ag-cp-kpi-label">📊 연관 KPI</div>
        <div class="ag-cp-kpi-list">
          ${chain.kpis.map((kpi) => `<span class="ag-cp-kpi-tag"><span class="ag-cp-kpi-dot"></span>${escapeHtml(kpi)}</span>`).join('')}
        </div>
      </div>`
    : '';

  // Impact footer
  const impactHtml = `<div class="ag-cp-impact">
    영향도
    <span class="ag-cp-impact-badge ag-cp-impact-${chain.impact}">${IMPACT_LABELS[chain.impact] || '보통'}</span>
  </div>`;

  panelEl.innerHTML = `
    <div class="ag-cp-header">
      <span class="ag-cp-title">🔗 ${escapeHtml(chain.keyword)}</span>
      <button class="ag-cp-close" id="ag-cp-close-btn">✕</button>
    </div>
    <div class="ag-cp-timeline">
      ${stairsHtml}
    </div>
    ${kpisHtml}
    ${impactHtml}
  `;

  // Position panel near the mark element
  const rect = markEl.getBoundingClientRect();
  const panelWidth = 340;

  let left = rect.left + rect.width / 2 - panelWidth / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));

  panelEl.style.left = `${left}px`;
  panelEl.style.top = '0px';
  panelEl.style.width = `${panelWidth}px`;
  panelEl.classList.add('ag-panel-visible');

  const panelHeight = panelEl.offsetHeight;
  let top = rect.top - panelHeight - 12;

  if (top < 8) {
    top = rect.bottom + 12;
  }

  if (top + panelHeight > window.innerHeight - 8) {
    top = window.innerHeight - panelHeight - 8;
  }

  panelEl.style.top = `${top}px`;

  // Close button
  const closeBtn = panelEl.querySelector('#ag-cp-close-btn');
  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hidePanel();
  });
}

function hidePanel(): void {
  if (panelEl) {
    panelEl.classList.remove('ag-panel-visible');
  }
}

// ─── Event Delegation ───

let delegateAttached = false;

function attachHoverDelegate(): void {
  if (delegateAttached) return;
  delegateAttached = true;

  // Hover → tooltip
  document.addEventListener('mouseover', (e) => {
    const mark = (e.target as HTMLElement).closest?.('mark[data-markjs]') as HTMLElement | null;
    if (mark && isEnabled) {
      showTooltip(mark);
    }
  });

  document.addEventListener('mouseout', (e) => {
    const mark = (e.target as HTMLElement).closest?.('mark[data-markjs]') as HTMLElement | null;
    if (mark) {
      hideTooltip();
    }
  });

  // Click → causal chain panel
  document.addEventListener('click', (e) => {
    if (!isEnabled) return;

    // If clicking inside the panel, don't close it
    if (panelEl && panelEl.contains(e.target as Node)) return;

    const mark = (e.target as HTMLElement).closest?.('mark[data-markjs]') as HTMLElement | null;
    if (mark) {
      const chain = findChainForMark(mark);
      if (chain) {
        showChainPanel(mark);
      }
    } else {
      // Clicked outside — close panel
      hidePanel();
    }
  });
}

// ─── Public API ───

export function highlightKeywords(
  keywords: string[],
  className = 'ag-hl-keyword',
): void {
  ensureStyles();
  attachHoverDelegate();
  const ctx = getContext();
  if (!instance) instance = new Mark(ctx);

  for (const keyword of keywords) {
    if (!keyword || keyword.length < 2) continue;

    instance.mark(keyword, {
      className,
      accuracy: 'partially',
      separateWordSearch: false,
      caseSensitive: false,
    });
  }

  isEnabled = true;
}

export function applyAnalysisHighlights(data: {
  checks: Array<{ item: string; result: string; detail: string }>;
  topics?: string[];
  causalChains?: CausalChain[];
}): void {
  clearHighlights();
  checkMap.clear();
  chainMap.clear();

  // Store causal chains
  if (data.causalChains) {
    for (const chain of data.causalChains) {
      if (chain.keyword && chain.chain.length >= 2) {
        chainMap.set(chain.keyword, chain);
      }
    }
  }

  const passItems: string[] = [];
  const warnItems: string[] = [];
  const failItems: string[] = [];

  for (const check of data.checks) {
    const phrase = extractHighlightPhrase(check.detail);
    if (!phrase) continue;

    // Store mapping for tooltip
    checkMap.set(phrase, { item: check.item, result: check.result, detail: check.detail });

    if (check.result === 'PASS') passItems.push(phrase);
    else if (check.result === 'WARN') warnItems.push(phrase);
    else if (check.result === 'FAIL') failItems.push(phrase);
  }

  if (data.topics && data.topics.length > 0) {
    highlightKeywords(data.topics, 'ag-hl-keyword');
  }

  if (passItems.length > 0) highlightKeywords(passItems, 'ag-hl-pass');
  if (warnItems.length > 0) highlightKeywords(warnItems, 'ag-hl-warn');
  if (failItems.length > 0) highlightKeywords(failItems, 'ag-hl-fail');

  isEnabled = true;
}

function extractHighlightPhrase(detail: string): string | null {
  if (!detail) return null;

  const quoted = detail.match(/['\u201C\u201D]([^'\u201C\u201D]{2,20})['\u201C\u201D]|\u2018([^\u2019]{2,20})\u2019/);
  if (quoted) return quoted[1] || quoted[2];

  const segment = detail.split(/[,。.]/)[0]?.trim();
  if (segment && segment.length >= 2 && segment.length <= 30) {
    return segment;
  }

  return null;
}

export function clearHighlights(): void {
  if (instance) {
    instance.unmark();
  }
  hideTooltip();
  hidePanel();
  isEnabled = false;
}

export function scrollToHighlight(text: string): void {
  if (!text) return;
  ensureStyles();

  // 1) Try existing marks first
  const marks = document.querySelectorAll('mark[data-markjs]');
  for (const mark of marks) {
    if (mark.textContent?.includes(text)) {
      activateAndScroll(mark as HTMLElement);
      return;
    }
  }

  // 2) Partial match — mark text may be subset of search text or vice versa
  for (const mark of marks) {
    const mt = mark.textContent || '';
    if (mt.length >= 2 && text.includes(mt)) {
      activateAndScroll(mark as HTMLElement);
      return;
    }
  }

  // 3) Fallback: find text directly in the DOM via TreeWalker and create temp highlight
  const ctx = getContext();
  const walker = document.createTreeWalker(ctx, NodeFilter.SHOW_TEXT);
  let node: Text | null;

  while ((node = walker.nextNode() as Text | null)) {
    const idx = node.textContent?.indexOf(text) ?? -1;
    if (idx === -1) continue;

    // Wrap the found text in a temporary highlight span
    const range = document.createRange();
    range.setStart(node, idx);
    range.setEnd(node, idx + text.length);

    const tempMark = document.createElement('mark');
    tempMark.className = 'ag-hl-warn ag-hl-active';
    tempMark.setAttribute('data-ag-temp', 'true');
    range.surroundContents(tempMark);

    tempMark.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Remove temp highlight after animation
    setTimeout(() => {
      tempMark.classList.remove('ag-hl-active');
      // Unwrap: put text back
      setTimeout(() => {
        const parent = tempMark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(tempMark.textContent || ''), tempMark);
          parent.normalize();
        }
      }, 1500);
    }, 2000);
    return;
  }
}

function activateAndScroll(el: HTMLElement): void {
  document.querySelectorAll('.ag-hl-active').forEach((m) =>
    m.classList.remove('ag-hl-active'),
  );
  el.classList.add('ag-hl-active');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => el.classList.remove('ag-hl-active'), 2000);
}

export function toggleHighlights(
  analysisData?: {
    checks: Array<{ item: string; result: string; detail: string }>;
    topics?: string[];
    causalChains?: CausalChain[];
  },
): boolean {
  if (isEnabled) {
    clearHighlights();
    return false;
  }

  if (analysisData) {
    applyAnalysisHighlights(analysisData);
    return true;
  }

  return false;
}

export function isHighlightEnabled(): boolean {
  return isEnabled;
}

// ─── Check Connection Overlay ───

interface ConnTarget {
  el: HTMLElement;
  label: string;
  color: string;
  colorLight: string;
  highlightClass: string;
}

const CONN_PALETTE = [
  { main: '#6366f1', light: '#818cf8' }, // indigo
  { main: '#10b981', light: '#34d399' }, // emerald
  { main: '#f59e0b', light: '#fbbf24' }, // amber
  { main: '#ec4899', light: '#f472b6' }, // pink
  { main: '#8b5cf6', light: '#a78bfa' }, // violet
  { main: '#06b6d4', light: '#22d3ee' }, // cyan
];

let connCleanup: (() => void) | null = null;
let connScrollHandler: (() => void) | null = null;
let connAnimFrame: number | null = null;
let connResizeHandler: (() => void) | null = null;
let connDismissHandler: ((e: MouseEvent) => void) | null = null;
let connDismissTimeout: ReturnType<typeof setTimeout> | null = null;
let connScrollTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Extracts the body-specific phrase from the detail text, avoiding the title/subject text.
 */
function extractBodyPhrase(detail: string, subject: string): string | null {
  if (!detail) return null;
  const quotes: string[] = [];
  const re1 = /['"""\u201C]([^'"""\u201C\u201D]{2,40})['"""\u201D]/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(detail)) !== null) quotes.push(m[1]);
  const re2 = /\u2018([^\u2019]{2,40})\u2019/g;
  while ((m = re2.exec(detail)) !== null) quotes.push(m[1]);

  const normalSubject = (subject || '').trim().toLowerCase();
  if (quotes.length >= 2 && normalSubject) {
    for (const q of quotes) {
      const nq = q.trim().toLowerCase();
      if (!normalSubject.includes(nq) && !nq.includes(normalSubject)) return q;
    }
  }
  if (quotes.length === 1) return quotes[0];

  const bodyMatch = detail.match(/본문[^'""]*['"""\u201C]([^'"""\u201D]{2,40})['"""\u201D]/);
  if (bodyMatch) return bodyMatch[1];

  const seg = detail.split(/[,。.]/)[0]?.trim();
  if (seg && seg.length >= 2 && seg.length <= 30) return seg;
  return null;
}

/**
 * Finds the most specific body element matching title keywords.
 */
function findBodyMatchByKeywords(subject: string, titleEl: HTMLElement | null): HTMLElement | null {
  if (!subject || subject.length < 3) return null;
  const ctx = getContext();
  const words = subject.trim().split(/\s+/).filter(w => w.length >= 2);
  if (words.length === 0) return null;

  const walker = document.createTreeWalker(ctx, NodeFilter.SHOW_ELEMENT);
  let elNode: HTMLElement | null;
  let best: { el: HTMLElement; score: number } | null = null;

  while ((elNode = walker.nextNode() as HTMLElement | null)) {
    const text = (elNode.textContent || '').trim();
    if (text.length < 30 || text.length > 500) continue;
    if (elNode === titleEl) continue;
    if (titleEl && (titleEl.contains(elNode) || elNode.contains(titleEl))) continue;
    if (['H1', 'H2', 'H3', 'SCRIPT', 'STYLE', 'A'].includes(elNode.tagName)) continue;
    if (elNode.closest('a[href]')) continue;
    if (elNode.closest('[class*="attach"], [class*="file"], [class*="download"], [class*="upload"]')) continue;

    const lower = text.toLowerCase();
    const fullMatches = words.filter(w => lower.includes(w.toLowerCase())).length;
    if (fullMatches === 0) continue;
    const density = fullMatches / text.length * 1000;
    const score = fullMatches * 100 + density;
    if (!best || score > best.score) best = { el: elNode, score };
  }
  return best?.el ?? null;
}

/**
 * Extracts only quoted phrases from detail text.
 * These are the most precise references to document content.
 * e.g. "기안번호 '공업사스토어-재경팀-2026-0075'가 비정상적" → ['공업사스토어-재경팀-2026-0075']
 */
function extractQuotedPhrases(detail: string): string[] {
  if (!detail) return [];
  const phrases: string[] = [];
  const re1 = /['"""\u201C]([^'"""\u201C\u201D]{2,60})['"""\u201D]/g;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(detail)) !== null) phrases.push(m[1].trim());
  const re2 = /\u2018([^\u2019]{2,60})\u2019/g;
  while ((m = re2.exec(detail)) !== null) phrases.push(m[1].trim());
  return phrases;
}

/**
 * Extracts section keywords from a check-item detail string.
 * e.g. "목적, 배경, 세부내용, 기대효과 등이 모두 포함되어 있습니다" → ['목적', '배경', '세부내용', '기대효과']
 */
function extractDetailKeywords(detail: string): string[] {
  if (!detail) return [];

  // Normalize spaces for consistent matching
  const normalized = detail.replace(/\s+/g, ' ');

  // Known document section names sorted by length descending (longer first to avoid substring collisions)
  const sectionNames = [
    '세부추진계획', '추진일정', '소요예산',
    '추진경과', '추진 경과', '향후계획', '향후 계획', '기대효과',
    '세부내용', '기안내용', '기안 내용', '추진방안', '추진 방안',
    '필요성', '문제점', '목적', '배경', '현황', '효과', '근거',
    '결론', '비용', '일정', '방안', '대안', '개요', '내용', '취지',
    '경과', '성과', '계획', '대상', '범위', '방법',
  ];

  const found: string[] = [];
  for (const name of sectionNames) {
    // Match with or without spaces for compound words
    const nameNoSpace = name.replace(/\s+/g, '');
    if (!normalized.includes(name) && !normalized.replace(/\s+/g, '').includes(nameNoSpace)) continue;
    // Skip if a longer already-found keyword contains this one (compare without spaces)
    if (found.some(f => f.replace(/\s+/g, '').includes(nameNoSpace))) continue;
    found.push(nameNoSpace); // Store without spaces for consistent DOM matching
  }
  if (found.length > 0) return found;

  // Fallback: extract quoted phrases
  const qMatches = [...detail.matchAll(/['"""\u201C]([^'""]{2,20})['"""\u201D]/g)];
  if (qMatches.length > 0) return qMatches.map(m => m[1]).filter(Boolean);

  // Last fallback: first comma-separated segment
  const segment = detail.split(/[,。.]/)[0]?.trim();
  return segment && segment.length >= 2 && segment.length <= 30 ? [segment] : [];
}

/**
 * Checks whether a text node or element text contains the keyword,
 * tolerating common Korean groupware patterns like "1. 목적", "가. 배경", "■ 개요".
 */
function textContainsKeyword(text: string, keyword: string): boolean {
  if (!text || !keyword) return false;
  const t = text.replace(/\s+/g, '');
  const k = keyword.replace(/\s+/g, '');
  return t.includes(k);
}

/**
 * Checks if element is excluded or is a parent/child of an excluded element.
 */
function isExcluded(el: HTMLElement, exclude: Set<HTMLElement>): boolean {
  if (exclude.has(el)) return true;
  for (const ex of exclude) {
    if (ex.contains(el) || el.contains(ex)) return true;
  }
  return false;
}

/**
 * Finds a section header element in the document matching the given keyword.
 * Prefers headings, bold, table-header elements — typical of Korean groupware layouts.
 */
function findSectionHeader(ctx: HTMLElement, keyword: string, exclude: Set<HTMLElement>): HTMLElement | null {
  // Also search document.body if ctx is a sub-element
  const roots = ctx === document.body ? [ctx] : [ctx, document.body];

  for (const root of roots) {
    // Priority 1: heading/bold/table-header elements (short, label-like)
    // These are typical section header patterns in Korean groupware documents
    const headerSels = ['h1,h2,h3,h4,h5,h6', 'strong,b', 'th,dt', 'label,em'];
    let bestHeader: { el: HTMLElement; len: number } | null = null;

    for (const sel of headerSels) {
      const els = root.querySelectorAll(sel);
      for (const node of els) {
        const el = node as HTMLElement;
        if (isExcluded(el, exclude)) continue;
        const text = el.textContent?.trim() || '';
        if (text.length > 150 || text.length < keyword.replace(/\s+/g, '').length) continue;
        if (!textContainsKeyword(text, keyword)) continue;
        // Prefer the most specific (shortest) match
        if (!bestHeader || text.length < bestHeader.len) {
          bestHeader = { el, len: text.length };
        }
      }
    }
    if (bestHeader) return bestHeader.el;

    // Priority 2: td elements (groupware table cells often act as section headers)
    const tdEls = root.querySelectorAll('td');
    let bestTd: { el: HTMLElement; len: number } | null = null;
    for (const node of tdEls) {
      const el = node as HTMLElement;
      if (isExcluded(el, exclude)) continue;
      const text = el.textContent?.trim() || '';
      if (text.length > 100 || text.length < keyword.replace(/\s+/g, '').length) continue;
      if (!textContainsKeyword(text, keyword)) continue;
      if (!bestTd || text.length < bestTd.len) {
        bestTd = { el, len: text.length };
      }
    }
    if (bestTd) return bestTd.el;

    // Priority 3: any element with short-ish text containing the keyword
    const candidates = root.querySelectorAll('p, div, span, li, a');
    let best: HTMLElement | null = null;
    let bestLen = Infinity;
    for (const node of candidates) {
      const el = node as HTMLElement;
      if (isExcluded(el, exclude)) continue;
      const text = el.textContent?.trim() || '';
      if (!textContainsKeyword(text, keyword)) continue;
      if (text.length > 300 || text.length < keyword.replace(/\s+/g, '').length) continue;
      if (text.length < bestLen) { best = el; bestLen = text.length; }
    }
    if (best) return best;
  }

  return null;
}

/**
 * Scrolls the page to show all target elements if possible.
 */
function scrollToShowTargets(targets: ConnTarget[]): void {
  if (targets.length === 0) return;

  if (targets.length === 1) {
    targets[0].el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Compute bounding range of all targets
  const rects = targets.map(t => {
    const r = t.el.getBoundingClientRect();
    return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  });
  const topMost = Math.min(...rects.map(r => r.top));
  const bottomMost = Math.max(...rects.map(r => r.bottom));
  const span = bottomMost - topMost;
  const viewH = window.innerHeight;

  if (span <= viewH * 0.85) {
    const mid = topMost + span / 2;
    window.scrollTo({ top: Math.max(0, mid - viewH / 2), behavior: 'smooth' });
  } else {
    window.scrollTo({ top: Math.max(0, topMost - 60), behavior: 'smooth' });
  }
}

/**
 * Shows a visual connection between check-item and relevant document elements.
 * For title-body check: connects title + body.
 * For other checks: connects all relevant section elements mentioned in the detail.
 */
export function showCheckConnection(item: string, detail: string, subject: string, score?: number, weight?: number, checkResult?: string, evidenceRefs?: string[]): void {
  ensureStyles();
  if (connCleanup) connCleanup();

  const ctx = getContext();
  const targets: ConnTarget[] = [];

  // ── Primary strategy: use evidence_refs to find body paragraphs ──
  if (evidenceRefs && evidenceRefs.length > 0) {
    const usedEls = new Set<HTMLElement>();

    for (let i = 0; i < evidenceRefs.length; i++) {
      const ref = evidenceRefs[i].trim();
      if (!ref || ref.length < 4) continue;

      // Search within the document body context, NOT the title
      let el = findElementContaining(ctx, ref, false); // plain text, NOT titleMode
      if (!el) {
        // Try fuzzy match with shorter substring
        const shortRef = ref.length > 20 ? ref.slice(0, 20) : ref;
        el = findElementContaining(ctx, shortRef, false);
      }

      if (!el) continue;
      if (usedEls.has(el)) continue;

      // Avoid parent/child overlap
      let skipThis = false;
      const toRemove: HTMLElement[] = [];
      for (const used of usedEls) {
        if (used.contains(el)) {
          toRemove.push(used);
        } else if (el.contains(used)) {
          skipThis = true;
          break;
        }
      }
      if (skipThis) continue;

      for (const r of toRemove) {
        usedEls.delete(r);
        const idx = targets.findIndex(t => t.el === r);
        if (idx >= 0) targets.splice(idx, 1);
      }

      // Truncate long refs for label display
      const label = ref.length > 15 ? ref.slice(0, 15) + '…' : ref;
      const c = CONN_PALETTE[i % CONN_PALETTE.length];
      targets.push({ el, label, color: c.main, colorLight: c.light, highlightClass: 'ag-conn-highlight-body' });
      usedEls.add(el);
    }
  }

  // ── Fallback: use detail keywords if evidence_refs produced no targets ──
  if (targets.length === 0) {
    // First, try to extract only quoted phrases from the detail (most precise)
    const quotedPhrases = extractQuotedPhrases(detail);
    const usedEls = new Set<HTMLElement>();

    // Strategy A: Use quoted phrases for direct content matching (no section header search)
    for (let i = 0; i < quotedPhrases.length; i++) {
      const phrase = quotedPhrases[i];
      if (phrase.length < 3) continue;
      let el = findElementContaining(ctx, phrase, false);
      if (!el && ctx !== document.body) el = findElementContaining(document.body, phrase, false);

      if (!el) continue;
      if (usedEls.has(el)) continue;

      let skipThis = false;
      const toRemove: HTMLElement[] = [];
      for (const used of usedEls) {
        if (used.contains(el)) {
          toRemove.push(used);
        } else if (el.contains(used)) {
          skipThis = true;
          break;
        }
      }
      if (skipThis) continue;

      for (const r of toRemove) {
        usedEls.delete(r);
        const idx = targets.findIndex(t => t.el === r);
        if (idx >= 0) targets.splice(idx, 1);
      }

      const label = phrase.length > 15 ? phrase.slice(0, 15) + '…' : phrase;
      const c = CONN_PALETTE[i % CONN_PALETTE.length];
      targets.push({ el, label, color: c.main, colorLight: c.light, highlightClass: 'ag-conn-highlight-body' });
      usedEls.add(el);
    }

    // Strategy B: Only if no quoted phrases matched, try section header keywords
    if (targets.length === 0) {
      const keywords = extractDetailKeywords(detail);

      for (let i = 0; i < keywords.length; i++) {
        const kw = keywords[i];
        let el = findSectionHeader(ctx, kw, usedEls);
        if (!el) el = findElementContaining(ctx, kw, true);
        if (!el) el = findElementContaining(document.body, kw, true);
        if (!el) el = findElementContaining(ctx, kw, false);

        if (!el) continue;
        if (usedEls.has(el)) continue;

        let skipThis = false;
        const toRemove: HTMLElement[] = [];
        for (const used of usedEls) {
          if (used.contains(el)) {
            toRemove.push(used);
          } else if (el.contains(used)) {
            skipThis = true;
            break;
          }
        }
        if (skipThis) continue;

        for (const r of toRemove) {
          usedEls.delete(r);
          const idx = targets.findIndex(t => t.el === r);
          if (idx >= 0) targets.splice(idx, 1);
        }

        const c = CONN_PALETTE[i % CONN_PALETTE.length];
        targets.push({ el, label: kw, color: c.main, colorLight: c.light, highlightClass: 'ag-conn-highlight-body' });
        usedEls.add(el);
      }
    }
  }

  if (targets.length === 0) {
    const fallback = extractHighlightPhrase(detail);
    if (fallback) scrollToHighlight(fallback);
    return;
  }

  // Highlight all target elements
  for (const t of targets) t.el.classList.add(t.highlightClass);

  // Scroll to show targets
  scrollToShowTargets(targets);

  // Draw overlay after scroll settles
  setTimeout(() => drawConnectionOverlay(targets, item, score, weight, checkResult), 500);

  // Centralized cleanup function
  connCleanup = () => {
    if (connScrollHandler) { window.removeEventListener('scroll', connScrollHandler); connScrollHandler = null; }
    if (connResizeHandler) { window.removeEventListener('resize', connResizeHandler); connResizeHandler = null; }
    if (connAnimFrame) { cancelAnimationFrame(connAnimFrame); connAnimFrame = null; }
    if (connScrollTimer) { clearTimeout(connScrollTimer); connScrollTimer = null; }
    if (connDismissHandler) { document.removeEventListener('click', connDismissHandler, true); connDismissHandler = null; }
    if (connDismissTimeout) { clearTimeout(connDismissTimeout); connDismissTimeout = null; }
    for (const t of targets) t.el.classList.remove(t.highlightClass);
    document.getElementById('ag-conn-overlay')?.remove();
    document.querySelectorAll('.ag-conn-label').forEach(el => el.remove());
    document.querySelectorAll('.ag-conn-node').forEach(el => el.remove());
    connCleanup = null;
  };

  connDismissHandler = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (target.closest('.ag-conn-node, .ag-conn-label, #ag-conn-overlay')) return;
    if (target.closest('.ag-conn-highlight-title, .ag-conn-highlight-body')) return;
    if (connCleanup) connCleanup();
  };
  connDismissTimeout = setTimeout(() => {
    if (connDismissHandler) {
      document.addEventListener('click', connDismissHandler, true);
    }
    connDismissTimeout = null;
  }, 600);
}

/**
 * Finds the most specific element containing the given text.
 * If titleMode=true, prefers headings with fuzzy/keyword matching.
 * Searches within the specified root element to avoid finding unrelated elements.
 */
function findElementContaining(root: HTMLElement, text: string, titleMode: boolean): HTMLElement | null {
  if (!text || text.length < 2) return null;
  const normalized = text.trim().toLowerCase();
  const normalizedNoSpace = normalized.replace(/\s+/g, '');

  if (titleMode) {
    const headingSelectors = [
      'h1', 'h2', 'h3', 'h4', '.doc-title', '.subject',
      '[class*="title"]', '[class*="subject"]',
      'strong', 'b', 'th', 'td',
    ];
    let bestMatch: { el: HTMLElement; score: number } | null = null;

    // Search within root first, then fall back to document.body
    const searchRoots = root === document.body ? [root] : [root, document.body];

    for (const searchRoot of searchRoots) {
      for (const sel of headingSelectors) {
        try {
          const els = searchRoot.querySelectorAll(sel);
          for (const el of els) {
            const elText = (el.textContent || '').trim().toLowerCase();
            const elTextNoSpace = elText.replace(/\s+/g, '');
            if (!elText || elText.length < 2 || elText.length > 200) continue;

            // Exact containment (either direction), space-tolerant
            if (elTextNoSpace.includes(normalizedNoSpace) || normalizedNoSpace.includes(elTextNoSpace)) {
              const score = Math.min(elTextNoSpace.length, normalizedNoSpace.length) / Math.max(elTextNoSpace.length, normalizedNoSpace.length);
              if (!bestMatch || score > bestMatch.score) {
                bestMatch = { el: el as HTMLElement, score };
              }
            }

            // Keyword overlap
            const textWords = normalized.split(/\s+/).filter(w => w.length >= 2);
            const elWords = elText.split(/\s+/).filter(w => w.length >= 2);
            if (textWords.length > 0 && elWords.length > 0) {
              const overlap = textWords.filter(w => elWords.some(ew => ew.includes(w) || w.includes(ew)));
              const overlapScore = (overlap.length / textWords.length) * 0.8;
              if (overlap.length >= 2 || (overlap.length >= 1 && textWords.length <= 2)) {
                if (!bestMatch || overlapScore > bestMatch.score) {
                  bestMatch = { el: el as HTMLElement, score: overlapScore };
                }
              }
            }
          }
        } catch { /* skip invalid selectors */ }
      }
      // If found in the primary root, don't fall back
      if (bestMatch && bestMatch.score >= 0.3) return bestMatch.el;
    }
  }

  // Walk DOM for exact text containment (space-tolerant)
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    const nt = (node.textContent || '').toLowerCase();
    const ntNoSpace = nt.replace(/\s+/g, '');
    if ((nt.includes(normalized) || ntNoSpace.includes(normalizedNoSpace)) && node.parentElement) {
      return node.parentElement;
    }
  }

  // Fuzzy keyword overlap
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);
  if (words.length >= 2) {
    const walker2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while ((node = walker2.nextNode() as Text | null)) {
      const nt = (node.textContent || '').toLowerCase();
      if (nt.length < 4) continue;
      const matchCount = words.filter(w => nt.includes(w)).length;
      if (matchCount >= Math.ceil(words.length * 0.5) && node.parentElement) {
        return node.parentElement;
      }
    }
  }

  return null;
}

/**
 * Draws convergence overlay with scroll-tracking: lines from N target elements converge
 * to a node box on the right. All positions update live as the user scrolls.
 */
function drawConnectionOverlay(
  targets: ConnTarget[],
  checkItem: string,
  score?: number,
  weight?: number,
  checkResult?: string,
): void {
  // Clean previous overlay elements and handlers
  document.getElementById('ag-conn-overlay')?.remove();
  document.querySelectorAll('.ag-conn-label').forEach((el) => el.remove());
  document.querySelectorAll('.ag-conn-node').forEach((el) => el.remove());
  if (connScrollHandler) { window.removeEventListener('scroll', connScrollHandler); connScrollHandler = null; }
  if (connResizeHandler) { window.removeEventListener('resize', connResizeHandler); connResizeHandler = null; }
  if (connAnimFrame) { cancelAnimationFrame(connAnimFrame); connAnimFrame = null; }
  if (connScrollTimer) { clearTimeout(connScrollTimer); connScrollTimer = null; }

  if (targets.length === 0) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nodeBaseStyle = 'position:fixed !important;z-index:2147483647 !important;display:flex !important;flex-direction:column !important;align-items:center !important;gap:4px !important;right:16px !important;padding:10px 16px !important;background:#fff !important;border:2px solid #6366f1 !important;border-radius:12px !important;box-shadow:0 4px 24px rgba(99,102,241,0.22),0 0 0 1px rgba(99,102,241,0.08) !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;pointer-events:none !important;opacity:1 !important;visibility:visible !important;';
  const labelBase = 'position:fixed !important;z-index:2147483647 !important;display:inline-flex !important;align-items:center !important;gap:5px !important;padding:4px 10px !important;border-radius:6px !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;font-size:11px !important;font-weight:700 !important;pointer-events:none !important;white-space:nowrap !important;opacity:1 !important;visibility:visible !important;transition:top 0.15s ease-out,left 0.15s ease-out !important;';

  // ── Create convergence node ──
  const node = document.createElement('div');
  node.className = 'ag-conn-node';
  node.style.cssText = nodeBaseStyle + 'top:50%;';

  const nodeTitle = document.createElement('div');
  nodeTitle.style.cssText = 'font-size:11px !important;font-weight:700 !important;color:#4f46e5 !important;white-space:nowrap !important;';
  nodeTitle.textContent = checkItem;

  // Score + Result row
  const scoreText = (score != null && weight != null) ? `${score}/${weight}` : '';
  const resultLabel = checkResult || '';
  const resultColorMap: Record<string, { bg: string; color: string }> = {
    PASS: { bg: 'rgba(16,185,129,0.12)', color: '#059669' },
    WARN: { bg: 'rgba(245,158,11,0.12)', color: '#d97706' },
    FAIL: { bg: 'rgba(244,63,94,0.12)', color: '#e11d48' },
  };
  const rc = resultColorMap[resultLabel] || resultColorMap.PASS;
  const nodeScoreRow = document.createElement('div');
  nodeScoreRow.style.cssText = 'display:inline-flex !important;align-items:center !important;gap:6px !important;';
  const nodeScore = document.createElement('span');
  nodeScore.style.cssText = `font-size:13px !important;font-weight:800 !important;color:${rc.color} !important;letter-spacing:-0.5px !important;`;
  nodeScore.textContent = scoreText;
  const nodeBadge = document.createElement('span');
  nodeBadge.style.cssText = `display:inline-flex !important;align-items:center !important;padding:2px 8px !important;border-radius:4px !important;background:${rc.bg} !important;color:${rc.color} !important;font-size:10px !important;font-weight:700 !important;`;
  nodeBadge.textContent = resultLabel;
  nodeScoreRow.appendChild(nodeScore);
  nodeScoreRow.appendChild(nodeBadge);

  // Dynamic legend from targets
  const nodeLegend = document.createElement('div');
  nodeLegend.style.cssText = 'display:inline-flex !important;align-items:center !important;gap:3px !important;flex-wrap:wrap !important;justify-content:center !important;margin-top:2px !important;padding:2px 6px !important;border-radius:4px !important;background:rgba(99,102,241,0.06) !important;';
  const legendParts: string[] = [];
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    if (i > 0) legendParts.push('<span style="font-size:8px !important;color:#cbd5e1 !important;">·</span>');
    legendParts.push(
      `<span style="display:inline-flex !important;align-items:center !important;gap:2px !important;">` +
      `<span style="display:inline-block !important;width:6px !important;height:6px !important;border-radius:50% !important;background:${t.color} !important;"></span>` +
      `<span style="font-size:9px !important;font-weight:700 !important;color:${t.color} !important;">${escapeHtml(t.label)}</span>` +
      `</span>`
    );
  }
  nodeLegend.innerHTML = legendParts.join('');
  node.appendChild(nodeTitle);
  node.appendChild(nodeScoreRow);
  node.appendChild(nodeLegend);
  document.body.appendChild(node);

  // ── Create SVG overlay ──
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'ag-conn-overlay';
  svg.setAttribute('width', String(vw));
  svg.setAttribute('height', String(vh));
  svg.style.cssText = 'position:fixed !important;left:0 !important;top:0 !important;width:100vw !important;height:100vh !important;z-index:2147483646 !important;pointer-events:none !important;overflow:visible !important;opacity:1 !important;visibility:visible !important;';

  // Gradients for each target
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    g.id = `ag-grad-${i}`; g.setAttribute('x1', '0'); g.setAttribute('y1', '0'); g.setAttribute('x2', '1'); g.setAttribute('y2', '0');
    const s1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s1.setAttribute('offset', '0%'); s1.setAttribute('stop-color', t.color);
    const s2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    s2.setAttribute('offset', '100%'); s2.setAttribute('stop-color', t.colorLight);
    g.appendChild(s1); g.appendChild(s2); defs.appendChild(g);
  }
  svg.appendChild(defs);

  // Create SVG elements (path + dot) for each target
  interface PathInfo { path: SVGPathElement; dot: SVGCircleElement; label: HTMLDivElement; }
  const pathInfos: PathInfo[] = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', `url(#ag-grad-${i})`);
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('opacity', '0.85');
    svg.appendChild(path);

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('r', '4'); dot.setAttribute('fill', t.color);
    svg.appendChild(dot);

    const label = document.createElement('div');
    label.className = 'ag-conn-label';
    label.textContent = t.label;
    label.style.cssText = labelBase + `background:${t.color} !important;color:#fff !important;box-shadow:0 2px 8px ${t.color}66 !important;`;
    document.body.appendChild(label);

    pathInfos.push({ path, dot, label });
  }

  const endDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  endDot.setAttribute('r', '5'); endDot.setAttribute('fill', targets[0].color);
  svg.appendChild(endDot);
  document.body.appendChild(svg);

  // ── Compute initial node position ──
  const initMidYs = targets.map(t => { const r = t.el.getBoundingClientRect(); return r.top + r.height / 2; });
  let initNY = initMidYs.reduce((a, b) => a + b, 0) / initMidYs.length;
  initNY = Math.max(60, Math.min(vh - 60, initNY));
  node.style.top = `${initNY - 28}px`;

  let anchoredNY = initNY;
  const SPRING_FACTOR = 0.12;

  // ── Layout update function ──
  const updateLayout = () => {
    // Use fresh viewport dimensions each frame
    const curVW = window.innerWidth;
    const curVH = window.innerHeight;

    // Update SVG size if viewport changed
    svg.setAttribute('width', String(curVW));
    svg.setAttribute('height', String(curVH));

    const rects = targets.map(t => t.el.getBoundingClientRect());
    const midYs = rects.map(r => r.top + r.height / 2);

    // Filter visible targets for ideal Y calculation (skip off-screen ones)
    const visibleMidYs = midYs.filter((y, i) => {
      const r = rects[i];
      return r.bottom > 0 && r.top < curVH;
    });
    const effectiveMidYs = visibleMidYs.length > 0 ? visibleMidYs : midYs;

    let idealNY = effectiveMidYs.reduce((a, b) => a + b, 0) / effectiveMidYs.length;
    idealNY = Math.max(60, Math.min(curVH - 60, idealNY));
    anchoredNY += (idealNY - anchoredNY) * SPRING_FACTOR;
    node.style.top = `${anchoredNY - 28}px`;

    const nRect = node.getBoundingClientRect();
    const nLeftX = nRect.left;
    const nCY = nRect.top + nRect.height / 2;

    for (let i = 0; i < pathInfos.length; i++) {
      const pi = pathInfos[i];
      const rect = rects[i];
      const midY = midYs[i];
      const x1 = Math.min(rect.right + 10, curVW - 160);
      const dx = nLeftX - x1;

      // Avoid degenerate curves when target and node are too close horizontally
      if (Math.abs(dx) < 20) {
        pi.path.setAttribute('d', `M ${x1} ${midY} L ${nLeftX} ${nCY}`);
      } else {
        pi.path.setAttribute('d', `M ${x1} ${midY} C ${x1 + dx * 0.5} ${midY}, ${nLeftX - dx * 0.3} ${nCY}, ${nLeftX} ${nCY}`);
      }
      pi.dot.setAttribute('cx', String(x1));
      pi.dot.setAttribute('cy', String(midY));
      pi.label.style.left = `${Math.max(8, rect.left)}px`;
      pi.label.style.top = `${Math.max(4, rect.top - 28)}px`;
    }

    endDot.setAttribute('cx', String(nLeftX));
    endDot.setAttribute('cy', String(nCY));
  };

  // ── Initial draw with entry animation ──
  updateLayout();

  for (let i = 0; i < pathInfos.length; i++) {
    const pi = pathInfos[i];
    const len = pi.path.getTotalLength?.() || 600;
    const delay = (i * 0.15).toFixed(2);
    pi.path.setAttribute('stroke-dasharray', String(len));
    pi.path.setAttribute('stroke-dashoffset', String(len));
    pi.path.innerHTML = `<animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="0.6s" begin="${delay}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`;
    pi.dot.setAttribute('opacity', '0');
    pi.dot.innerHTML = `<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${delay}s" fill="freeze"/>`;
  }
  const endDelay = (pathInfos.length * 0.15 + 0.3).toFixed(2);
  endDot.setAttribute('opacity', '0');
  endDot.innerHTML = `<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${endDelay}s" fill="freeze"/>`;

  // After animation, enable scroll tracking
  const animDuration = Math.max(800, pathInfos.length * 150 + 600);
  setTimeout(() => {
    for (const pi of pathInfos) {
      pi.path.removeAttribute('stroke-dasharray');
      pi.path.removeAttribute('stroke-dashoffset');
      pi.path.innerHTML = '';
      pi.dot.setAttribute('opacity', '1');
      pi.dot.innerHTML = '';
    }
    endDot.setAttribute('opacity', '1');
    endDot.innerHTML = '';

    let settleFrames = 0;
    const SETTLE_COUNT = 30;

    const springLoop = () => {
      updateLayout();
      settleFrames--;
      if (settleFrames > 0) {
        connAnimFrame = requestAnimationFrame(springLoop);
      } else {
        connAnimFrame = null;
      }
    };

    const startSpring = () => {
      settleFrames = SETTLE_COUNT;
      if (!connAnimFrame) {
        connAnimFrame = requestAnimationFrame(springLoop);
      }
    };

    connScrollHandler = () => {
      // Reset settle counter on every scroll event to keep tracking active
      settleFrames = SETTLE_COUNT;
      if (!connAnimFrame) {
        connAnimFrame = requestAnimationFrame(springLoop);
      }
      // Debounced final update after scroll stops
      if (connScrollTimer) clearTimeout(connScrollTimer);
      connScrollTimer = setTimeout(() => {
        startSpring();
        connScrollTimer = null;
      }, 100);
    };

    window.addEventListener('scroll', connScrollHandler, { passive: true });

    // Also track resize to update SVG dimensions
    connResizeHandler = () => { startSpring(); };
    window.addEventListener('resize', connResizeHandler, { passive: true });
  }, animDuration);
}
