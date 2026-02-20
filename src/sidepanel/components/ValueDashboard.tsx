import React from 'react';
import { Target, TrendingUp, BarChart3, FileText, ArrowUpRight } from 'lucide-react';
import type { ValueHierarchy } from '@shared/types';

interface ValueDashboardProps {
  hierarchy: ValueHierarchy;
  docSubject: string;
}

const RELEVANCE_STYLE = {
  high: { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-400', label: '높음' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-400', label: '보통' },
  low: { bg: 'bg-slate-50', text: 'text-slate-600', bar: 'bg-slate-300', label: '낮음' },
};

const IMPACT_STYLE = {
  high: { bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', label: '높음' },
  medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: '보통' },
  low: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: '낮음' },
};

export default function ValueDashboard({ hierarchy, docSubject }: ValueDashboardProps) {
  const impact = IMPACT_STYLE[hierarchy.impactScore] || IMPACT_STYLE.medium;

  return (
    <div className="flex flex-col gap-3">
      {/* Business Goal — Top */}
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600">
            <Target className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">사업목표</span>
        </div>
        <h3 className="text-sm font-bold leading-snug text-slate-900">
          {hierarchy.businessGoal}
        </h3>
        {hierarchy.goalDescription && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {hierarchy.goalDescription}
          </p>
        )}
      </div>

      {/* Staircase: Value Chain (right-ascending steps) */}
      <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <ArrowUpRight className="h-3.5 w-3.5 text-brand-500" />
            가치 사슬
          </span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${impact.bg} ${impact.text}`}>
            영향도 {impact.label}
          </span>
        </div>

        {/* Staircase visualization — right-ascending (기안 bottom-left → 목표 top-right) */}
        <div className="flex flex-col gap-0">
          {[...hierarchy.valueChain].reverse().map((step, i) => {
            const total = hierarchy.valueChain.length;
            const origIdx = total - 1 - i; // original index: 0=기안(base), last=목표(goal)
            const isBase = origIdx === 0;
            const isGoal = origIdx === total - 1;

            // Right-ascending indent: goal (top) = most right, base (bottom) = most left
            const indent = Math.round((origIdx / Math.max(total - 1, 1)) * 100);

            // Color gradient: indigo (goal/top) → green (base/bottom)
            const hue = isGoal
              ? 'border-brand-500 bg-brand-50'
              : isBase
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-300 bg-slate-50';

            const textColor = isGoal
              ? 'text-brand-800'
              : isBase
                ? 'text-emerald-800'
                : 'text-slate-700';

            return (
              <div key={i}>
                {/* Connector line (ascending from lower-left to upper-right) */}
                {i > 0 && (
                  <div
                    className="flex items-center py-0.5"
                    style={{ paddingLeft: `${Math.round(((origIdx + 0.5) / Math.max(total - 1, 1)) * 100)}px` }}
                  >
                    <svg className="h-3 w-4 text-slate-300" viewBox="0 0 16 12" fill="none">
                      <path d="M0 12 L8 0 L16 0" stroke="currentColor" strokeWidth="1.5" fill="none" />
                    </svg>
                  </div>
                )}
                <div
                  className={`flex items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 ${hue}`}
                  style={{ marginLeft: `${indent}px` }}
                >
                  <span className={`text-xs font-semibold leading-tight ${textColor}`}>
                    {step}
                  </span>
                  {isGoal && (
                    <span className="shrink-0 rounded bg-brand-100 px-1.5 py-px text-[9px] font-bold text-brand-600">
                      목표
                    </span>
                  )}
                  {isBase && (
                    <span className="shrink-0 rounded bg-emerald-100 px-1.5 py-px text-[9px] font-bold text-emerald-600">
                      기안
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      {hierarchy.kpis.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-brand-500" />
            <span className="text-xs font-bold text-slate-700">연관 KPI</span>
            <span className="rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">
              {hierarchy.kpis.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {hierarchy.kpis.map((kpi, i) => {
              const style = RELEVANCE_STYLE[kpi.relevance] || RELEVANCE_STYLE.medium;
              return (
                <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{kpi.name}</span>
                    <span className={`rounded-full px-1.5 py-px text-[9px] font-bold ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="font-medium">현재</span>
                      <span className="font-bold text-slate-700">{kpi.current}</span>
                    </div>
                    <TrendingUp className="h-3 w-3 text-brand-400" />
                    <div className="flex items-center gap-1 text-slate-500">
                      <span className="font-medium">목표</span>
                      <span className="font-bold text-brand-700">{kpi.target}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Document — Bottom */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500">
            <FileText className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">현재 기안</div>
            <div className="truncate text-xs font-semibold text-emerald-900">{docSubject}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
