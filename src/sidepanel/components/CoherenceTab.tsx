import React from 'react';
import type { CoherenceResult } from '@shared/types';
import ScoreGauge from './ScoreGauge';
import CheckItem from './CheckItem';
import AIInsightCard from './AIInsightCard';

interface CoherenceTabProps {
  coherence: CoherenceResult;
  recommendation: string;
}

export default function CoherenceTab({ coherence, recommendation }: CoherenceTabProps) {
  const passCount = coherence.checks.filter((c) => c.result === 'PASS').length;
  const totalCount = coherence.checks.length;

  // Sort checks by weight descending (highest weight first)
  const sortedChecks = [...coherence.checks].sort((a, b) => b.weight - a.weight);

  return (
    <div className="flex flex-col">
      {/* Hero: Score Gauge */}
      <div className="flex flex-col items-center justify-center border-b border-slate-100 bg-white py-8">
        <ScoreGauge score={coherence.overall_score} size="lg" />
        <p className="mt-4 px-8 text-center text-sm text-slate-500">
          {coherence.overall_score >= 80
            ? '문서의 논리적 흐름이 양호합니다.'
            : coherence.overall_score >= 60
              ? '문서의 논리적 흐름이 대체로 양호하나, 일부 보완이 필요합니다.'
              : '문서의 논리적 흐름에 상당한 보완이 필요합니다.'}
        </p>
      </div>

      {/* Check Items (merged with score breakdown, sorted by weight) */}
      <div className="flex flex-col gap-2.5 p-4">
        <div className="mb-1 flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            검증 항목 ({passCount}/{totalCount} 통과)
          </h3>
          <span className="text-xs font-bold text-slate-500">
            {coherence.overall_score}<span className="font-normal text-slate-400">/100</span>
          </span>
        </div>

        {sortedChecks.map((check, index) => (
          <CheckItem
            key={index}
            item={check.item}
            result={check.result}
            detail={check.detail}
            weight={check.weight}
            score={check.score}
            evidenceRefs={check.evidence_refs}
          />
        ))}
      </div>

      {/* AI Recommendation */}
      <div className="p-4 pt-0">
        <AIInsightCard title="AI 권고" content={recommendation} />
      </div>
    </div>
  );
}
