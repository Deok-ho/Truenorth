import React from 'react';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import type { AnalysisResult } from '@shared/types';
import { useAnalysisStore } from '../store/analysisStore';
import DocInfoCard from './DocInfoCard';
import SummaryCard from './SummaryCard';
import PredictedQuestionsCard from './PredictedQuestionsCard';

interface SummaryTabProps {
  data: AnalysisResult;
  docType: string;
  subject: string;
  requesterName: string;
  requesterDept: string;
  createdAt: string;
}

export default function SummaryTab({
  data,
  docType,
  subject,
  requesterName,
  requesterDept,
  createdAt,
}: SummaryTabProps) {
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);
  const { coherence, summary } = data;

  // Find worst and best check items
  const worstItem = coherence.checks.find((c) => c.result === 'FAIL') ||
    coherence.checks.find((c) => c.result === 'WARN');
  const bestItem = coherence.checks.find((c) => c.result === 'PASS');

  return (
    <div className="space-y-4 p-4">
      {/* Document Info */}
      <DocInfoCard
        doc_type={docType}
        subject={subject}
        requester_name={requesterName}
        requester_dept={requesterDept}
        created_at={createdAt}
      />

      {/* AI Summary */}
      <SummaryCard summary={summary} />

      {/* Predicted Questions from Approver's perspective */}
      {data.predictedQuestions && data.predictedQuestions.length > 0 && (
        <PredictedQuestionsCard questions={data.predictedQuestions} />
      )}

      {/* Quick Coherence Preview */}
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-900/5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">정합성 점수</h3>
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1">
            <span className="text-sm font-bold text-slate-700">
              {coherence.overall_score}%
            </span>
          </div>
        </div>

        {/* Score stack bar (replaces ProgressBar) */}
        <div
          className="mb-4 flex h-2 w-full cursor-pointer overflow-hidden rounded-full bg-slate-100"
          onClick={() => setActiveTab('coherence')}
          title="점수 구성 상세 보기"
          role="button"
          tabIndex={0}
        >
          {[...coherence.checks]
            .sort((a, b) => b.weight - a.weight)
            .map((check, i) => (
              <div
                key={i}
                className={`transition-all duration-500 first:rounded-l-full last:rounded-r-full ${
                  check.result === 'PASS'
                    ? 'bg-emerald-500'
                    : check.result === 'WARN'
                      ? 'bg-amber-400'
                      : 'bg-rose-400'
                }`}
                style={{ width: `${check.score}%` }}
                title={`${check.item}: ${check.score}/${check.weight}`}
              />
            ))}
        </div>

        {/* Alert items */}
        <div className="space-y-3">
          {worstItem && (
            <div
              className={`flex items-start gap-2 rounded-lg p-2 ${
                worstItem.result === 'FAIL'
                  ? 'bg-rose-50/50'
                  : 'bg-amber-50/50'
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 ${
                  worstItem.result === 'FAIL'
                    ? 'text-rose-500'
                    : 'text-amber-500'
                }`}
              />
              <p className="text-xs font-medium text-slate-600">
                <span className="font-bold text-slate-700">
                  {worstItem.result === 'FAIL' ? 'Fail' : 'Warning'}:
                </span>{' '}
                {worstItem.detail}
              </p>
            </div>
          )}

          {bestItem && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50/50 p-2">
              <CheckCircle className="mt-0.5 h-4 w-4 text-emerald-500" />
              <p className="text-xs font-medium text-slate-600">
                <span className="font-bold text-slate-700">Pass:</span>{' '}
                {bestItem.detail}
              </p>
            </div>
          )}
        </div>

        {/* Link to coherence tab */}
        <button
          onClick={() => setActiveTab('coherence')}
          className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          정합성 상세 보기
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
