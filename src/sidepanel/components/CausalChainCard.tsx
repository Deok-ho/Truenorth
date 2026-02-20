import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, Target, Zap } from 'lucide-react';
import type { CausalChain } from '@shared/types';

interface CausalChainCardProps {
  chain: CausalChain;
}

const IMPACT_CONFIG = {
  high: {
    label: '높음',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    dot: 'bg-rose-500',
    line: 'from-rose-400 to-brand-500',
  },
  medium: {
    label: '보통',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    line: 'from-amber-400 to-brand-500',
  },
  low: {
    label: '낮음',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    line: 'from-emerald-400 to-brand-500',
  },
};

export default function CausalChainCard({ chain }: CausalChainCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = IMPACT_CONFIG[chain.impact] || IMPACT_CONFIG.medium;

  // Reverse the chain for bottom-up display: base action at bottom, value at top
  const reversed = [...chain.chain].reverse();

  return (
    <div className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
          <TrendingUp className="h-4 w-4 text-brand-600" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">{chain.keyword}</div>
          <div className="truncate text-xs text-slate-400">
            {chain.chain[0]} → {chain.chain[chain.chain.length - 1]}
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${config.bg} ${config.text} ${config.border} border`}>
          {config.label}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {/* Bottom-up timeline: reversed chain with continuous line */}
          <div className="relative ml-4">
            {/* Continuous gradient line */}
            <div className={`absolute left-[9px] top-2 bottom-2 w-0.5 bg-gradient-to-t ${config.line} rounded-full`} />

            {reversed.map((step, i) => {
              const isTop = i === 0;
              const isBottom = i === reversed.length - 1;

              return (
                <div key={i} className="relative flex items-start gap-3 pb-4 last:pb-0">
                  {/* Node dot */}
                  <div className="relative z-10 flex shrink-0 flex-col items-center">
                    <div
                      className={`h-5 w-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                        isTop
                          ? 'bg-brand-600'
                          : isBottom
                            ? config.dot
                            : 'bg-slate-300'
                      }`}
                    >
                      {isTop && <Target className="h-2.5 w-2.5 text-white" />}
                      {isBottom && <Zap className="h-2.5 w-2.5 text-white" />}
                    </div>
                  </div>

                  {/* Label */}
                  <div className={`pt-0.5 text-sm leading-tight ${
                    isTop
                      ? 'font-bold text-brand-700'
                      : isBottom
                        ? 'font-semibold text-slate-800'
                        : 'text-slate-600'
                  }`}>
                    {step}
                    {isTop && (
                      <span className="ml-1.5 text-[10px] font-medium text-brand-400">최종 가치</span>
                    )}
                    {isBottom && (
                      <span className="ml-1.5 text-[10px] font-medium text-slate-400">기안 항목</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* KPI tags */}
          {chain.kpis.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                연관 KPI
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chain.kpis.map((kpi, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand-700"
                  >
                    <span className="h-1 w-1 rounded-full bg-brand-400" />
                    {kpi}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
