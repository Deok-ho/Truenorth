import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, FileText, Paperclip } from 'lucide-react';
import type { HistoryEntry, HistoryDetail } from '@shared/types';
import DocInfoCard from './DocInfoCard';
import CoherenceRadar from './CoherenceRadar';
import ScoreGauge from './ScoreGauge';
import CheckItem from './CheckItem';
import Badge from './Badge';
import AIInsightCard from './AIInsightCard';
import SimilarDocCard from './SimilarDocCard';
import CausalChainCard from './CausalChainCard';
import ValueDashboard from './ValueDashboard';

interface HistoryDetailViewProps {
  entry: HistoryEntry;
  detail: HistoryDetail | null;
  loading: boolean;
  onBack: () => void;
}

function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '';
  }
}

export default function HistoryDetailView({ entry, detail, loading, onBack }: HistoryDetailViewProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showRelation, setShowRelation] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  // No detail available (legacy entry)
  if (!detail) {
    return (
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h3 className="text-sm font-bold text-slate-900">분석 상세</h3>
        </div>

        {/* Basic entry info */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm font-medium text-slate-900">{entry.subject || '제목 없음'}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              entry.mode === 'pro' ? 'bg-brand-50 text-brand-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {entry.mode === 'pro' ? 'Pro' : 'Lite'}
            </span>
            {entry.docType && <span>{entry.docType}</span>}
            <span>{formatFullDate(entry.createdAt)}</span>
          </div>
          {entry.overallScore != null && (
            <div className="mt-3 flex justify-center">
              <ScoreGauge score={entry.overallScore} size="sm" />
            </div>
          )}
        </div>

        {/* Fallback message */}
        <div className="py-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">상세 데이터가 없습니다.</p>
          <p className="text-xs text-slate-400">
            이전 버전에서 저장된 기록은 요약 정보만 제공됩니다.
          </p>
        </div>
      </div>
    );
  }

  const { analysisResult, parsedDocument } = detail;
  const { summary, coherence, recommendation } = analysisResult;
  const sortedChecks = [...coherence.checks].sort((a, b) => b.weight - a.weight);
  const passCount = coherence.checks.filter((c) => c.result === 'PASS').length;

  return (
    <div className="p-4 space-y-4">
      {/* [1] Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900">분석 상세</h3>
          <span className="text-[11px] text-slate-400">{formatFullDate(entry.createdAt)}</span>
        </div>
      </div>

      {/* [2] Document Info */}
      <DocInfoCard
        doc_type={parsedDocument.doc_type}
        subject={parsedDocument.subject}
        requester_name={parsedDocument.requester_name}
        requester_dept={parsedDocument.requester_dept}
        created_at={parsedDocument.created_at}
      />

      {/* [3] Coherence Radar */}
      <CoherenceRadar checks={coherence.checks} />

      {/* [4] Score Gauge + pass count */}
      <div className="flex items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-4">
        <ScoreGauge score={coherence.overall_score} size="sm" />
        <div className="text-center">
          <p className="text-xs text-slate-500">정합성 항목</p>
          <p className="text-lg font-bold text-slate-900">
            <span className="text-emerald-600">{passCount}</span>
            <span className="text-slate-400 font-normal"> / {coherence.checks.length}</span>
          </p>
          <p className="text-[11px] text-slate-400">통과</p>
        </div>
      </div>

      {/* [5] AI Summary */}
      {summary && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700">AI 요약</h4>
          {summary.request && (
            <AIInsightCard title="요청 사항" content={summary.request} />
          )}
          {summary.basis && (
            <AIInsightCard title="근거" content={summary.basis} />
          )}
          {summary.expected_effect && (
            <AIInsightCard title="기대 효과" content={summary.expected_effect} />
          )}
        </div>
      )}

      {/* [6] Coherence Check Items */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-700">정합성 체크 항목</h4>
        {sortedChecks.map((check) => (
          <CheckItem
            key={check.item}
            item={check.item}
            result={check.result}
            detail={check.detail}
            weight={check.weight}
            score={check.score}
            evidenceRefs={check.evidence_refs}
          />
        ))}
      </div>

      {/* [NEW] Relation Analysis Section (collapsible) */}
      {(() => {
        const hasRelationData =
          analysisResult.valueHierarchy != null ||
          (analysisResult.causalChains?.length > 0) ||
          (analysisResult.similarDocs?.length > 0);

        if (!hasRelationData) return null;

        return (
          <div className="rounded-lg border border-slate-200 bg-white">
            <button
              onClick={() => setShowRelation(!showRelation)}
              className="flex w-full items-center justify-between p-3"
            >
              <span className="text-xs font-semibold text-slate-700">관계 분석</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showRelation ? 'rotate-180' : ''}`} />
            </button>
            {showRelation && (
              <div className="border-t border-slate-100 p-3 space-y-3">
                {analysisResult.valueHierarchy && (
                  <ValueDashboard hierarchy={analysisResult.valueHierarchy} docSubject={parsedDocument.subject} />
                )}
                {analysisResult.causalChains?.length > 0 && (
                  <div className="space-y-2">
                    {analysisResult.causalChains.map((chain, i) => (
                      <CausalChainCard key={i} chain={chain} />
                    ))}
                  </div>
                )}
                {analysisResult.similarDocs?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-semibold text-slate-600">유사 문서</h5>
                    {analysisResult.similarDocs.map((doc) => (
                      <SimilarDocCard key={doc.id} doc={doc} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* AI Recommendation */}
      {recommendation && (
        <AIInsightCard title="AI 추천" content={recommendation} />
      )}

      {/* [7] Original Document (collapsible) */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="flex w-full items-center justify-between p-3"
        >
          <span className="text-xs font-semibold text-slate-700">원본 문서</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showOriginal ? 'rotate-180' : ''}`} />
        </button>
        {showOriginal && (
          <div className="border-t border-slate-100 p-3 space-y-3">
            {/* Meta info */}
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-500 w-14">기안자</span>
                <span>{parsedDocument.requester_dept} {parsedDocument.requester_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-500 w-14">작성일</span>
                <span>{parsedDocument.created_at}</span>
              </div>
            </div>

            {/* Approval line */}
            {parsedDocument.approval_line && parsedDocument.approval_line.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">결재선</span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedDocument.approval_line.map((approver, i) => (
                    <Badge
                      key={i}
                      label={`${approver.name} (${approver.position})`}
                      variant={approver.status === 'approved' ? 'approved' : approver.status === 'rejected' ? 'rejected' : 'doctype'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {parsedDocument.attachments && parsedDocument.attachments.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-500">첨부파일</span>
                {parsedDocument.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <Paperclip className="h-3 w-3 text-slate-400" />
                    <span>{att.name}</span>
                    {att.size && <span className="text-slate-400">({att.size})</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Body */}
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                {parsedDocument.body}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* [8] Analysis JSON (collapsible, default collapsed) */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <button
          onClick={() => setShowJson(!showJson)}
          className="flex w-full items-center justify-between p-3"
        >
          <span className="text-xs font-semibold text-slate-700">분석 JSON</span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showJson ? 'rotate-180' : ''}`} />
        </button>
        {showJson && (
          <div className="border-t border-slate-100 p-3">
            <pre className="max-h-60 overflow-y-auto rounded-md bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-600 font-mono">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
