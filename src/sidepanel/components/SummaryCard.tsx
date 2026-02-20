import React from 'react';
import { Pin, FileText, CheckCircle, Sparkles, ExternalLink } from 'lucide-react';
import type { DocumentSummary } from '@shared/types';
import { useAnalysisStore } from '../store/analysisStore';

interface SummaryCardProps {
  summary: DocumentSummary;
}

const items = [
  {
    key: 'request' as const,
    label: '요청',
    icon: <Pin className="h-[18px] w-[18px] text-brand-600" />,
    labelColor: 'text-slate-700',
  },
  {
    key: 'basis' as const,
    label: '근거',
    icon: <FileText className="h-[18px] w-[18px] text-amber-500" />,
    labelColor: 'text-slate-700',
  },
  {
    key: 'expected_effect' as const,
    label: '기대효과',
    icon: <CheckCircle className="h-[18px] w-[18px] text-emerald-500" />,
    labelColor: 'text-slate-700',
  },
];

export default function SummaryCard({ summary }: SummaryCardProps) {
  const scrollToHighlight = useAnalysisStore((s) => s.scrollToHighlight);
  const highlightEnabled = useAnalysisStore((s) => s.highlightEnabled);

  const handleClick = (text: string) => {
    if (!highlightEnabled || !text) return;
    // Take the first meaningful segment to search for in the document
    const phrase = text.length > 30 ? text.slice(0, 30) : text;
    scrollToHighlight(phrase);
  };

  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          AI 요약
        </h3>
        <Sparkles className="h-3.5 w-3.5 text-brand-600" />
      </div>

      {/* Content */}
      <div className="space-y-4 p-4">
        {items.map((item) => (
          <div
            key={item.key}
            className={`flex gap-3 rounded-lg p-1 -m-1 transition-colors ${
              highlightEnabled
                ? 'cursor-pointer hover:bg-slate-50'
                : ''
            }`}
            onClick={() => handleClick(summary[item.key])}
            role={highlightEnabled ? 'button' : undefined}
            tabIndex={highlightEnabled ? 0 : undefined}
          >
            <div className="flex-none pt-0.5">{item.icon}</div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1">
                <p className={`text-xs font-bold ${item.labelColor}`}>
                  {item.label}
                </p>
                {highlightEnabled && (
                  <ExternalLink className="h-2.5 w-2.5 text-slate-300" />
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                {summary[item.key]}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
