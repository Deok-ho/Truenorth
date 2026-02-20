import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, XCircle, ChevronDown, ThumbsDown } from 'lucide-react';
import Badge from './Badge';
import { useAnalysisStore } from '../store/analysisStore';

interface CheckItemProps {
  item: string;
  result: 'PASS' | 'WARN' | 'FAIL';
  detail: string;
  weight: number;
  score: number;
  evidenceRefs?: string[];
}

const resultConfig = {
  PASS: {
    icon: <CheckCircle className="h-[18px] w-[18px] text-emerald-500" />,
    borderColor: 'border-emerald-200',
    barColor: 'bg-emerald-500',
    barTrack: 'bg-emerald-100',
    scoreColor: 'text-emerald-600',
    badgeVariant: 'pass' as const,
    badgeLabel: 'PASS',
  },
  WARN: {
    icon: <AlertTriangle className="h-[18px] w-[18px] text-amber-500" />,
    borderColor: 'border-amber-200',
    barColor: 'bg-amber-400',
    barTrack: 'bg-amber-100',
    scoreColor: 'text-amber-600',
    badgeVariant: 'warn' as const,
    badgeLabel: 'WARN',
  },
  FAIL: {
    icon: <XCircle className="h-[18px] w-[18px] text-rose-500" />,
    borderColor: 'border-rose-200',
    barColor: 'bg-rose-400',
    barTrack: 'bg-rose-100',
    scoreColor: 'text-rose-600',
    badgeVariant: 'fail' as const,
    badgeLabel: 'FAIL',
  },
};

export default function CheckItem({ item, result, detail, weight, score, evidenceRefs }: CheckItemProps) {
  const config = resultConfig[result];
  const showCheckConnection = useAnalysisStore((s) => s.showCheckConnection);
  const [expanded, setExpanded] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const pct = weight > 0 ? (score / weight) * 100 : 0;

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
    // Always trigger highlight on the document when clicking the header
    showCheckConnection(item, detail, score, weight, result, evidenceRefs);
  };

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${config.borderColor}`}
    >
      {/* Header row: always visible — click triggers expand + highlight */}
      <div
        onClick={handleHeaderClick}
        className="flex cursor-pointer items-center gap-2.5 p-3"
        role="button"
        tabIndex={0}
      >
        {config.icon}

        {/* Item name */}
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
          {item}
        </span>

        {/* Score bar (mini) */}
        <div className={`hidden h-1.5 w-16 overflow-hidden rounded-full sm:block ${config.barTrack}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Score text */}
        <span className={`w-[44px] shrink-0 text-right text-xs font-bold ${config.scoreColor}`}>
          {score}/{weight}
        </span>

        {/* Badge */}
        <Badge label={config.badgeLabel} variant={config.badgeVariant} />

        {/* Expand chevron */}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </div>

      {/* Expandable detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2">
          {/* Score bar (full width in expanded view) */}
          <div className={`mb-2 h-2 w-full overflow-hidden rounded-full ${config.barTrack}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Detail text */}
          <p className="text-xs leading-relaxed text-slate-500">
            {detail}
          </p>

          {/* False positive feedback (FAIL/WARN only) */}
          {(result === 'FAIL' || result === 'WARN') && (
            <div className="mt-2">
              {feedbackSubmitted ? (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <ThumbsDown className="h-3 w-3" /> 신고됨 ✓
                </span>
              ) : feedbackOpen ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
                    placeholder="오탐 사유를 입력하세요"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && feedbackText.trim()) {
                        chrome?.runtime?.sendMessage?.({
                          type: 'SUBMIT_FEEDBACK',
                          payload: {
                            category: item,
                            originalDetail: detail,
                            userMessage: feedbackText.trim(),
                          },
                        });
                        setFeedbackSubmitted(true);
                        setFeedbackOpen(false);
                      }
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
                      onClick={() => {
                        const msg = feedbackText.trim() || `'${item}' 항목의 이 판정은 오탐입니다`;
                        chrome?.runtime?.sendMessage?.({
                          type: 'SUBMIT_FEEDBACK',
                          payload: {
                            category: item,
                            originalDetail: detail,
                            userMessage: msg,
                          },
                        });
                        setFeedbackSubmitted(true);
                        setFeedbackOpen(false);
                      }}
                    >
                      제출
                    </button>
                    <button
                      className="rounded px-2 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                      onClick={() => setFeedbackOpen(false)}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFeedbackText(`'${item}' 항목의 이 판정은 오탐입니다`);
                    setFeedbackOpen(true);
                  }}
                >
                  <ThumbsDown className="h-3 w-3" /> 오탐 신고
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
