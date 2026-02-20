import React from 'react';
import { Link, FileSearch } from 'lucide-react';
import type { SimilarDocument, CausalChain, ValueHierarchy } from '@shared/types';
import SimilarDocCard from './SimilarDocCard';
import AIInsightCard from './AIInsightCard';
import CausalChainCard from './CausalChainCard';
import ValueDashboard from './ValueDashboard';

interface RelationTabProps {
  similarDocs: SimilarDocument[];
  recommendation: string;
  causalChains: CausalChain[];
  valueHierarchy: ValueHierarchy | null;
  docSubject: string;
}

export default function RelationTab({
  similarDocs,
  recommendation,
  causalChains,
  valueHierarchy,
  docSubject,
}: RelationTabProps) {
  const hasHierarchy = valueHierarchy !== null;
  const hasChains = causalChains.length > 0;
  const hasSimilarDocs = similarDocs.length > 0;

  if (!hasHierarchy && !hasChains && !hasSimilarDocs) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <FileSearch className="mb-4 h-12 w-12 text-slate-300" strokeWidth={1.5} />
        <h3 className="mb-2 text-base font-bold text-slate-900">
          관계 데이터가 없습니다
        </h3>
        <p className="text-sm leading-relaxed text-slate-500">
          이 문서와 관련된 인과관계나 유사 문서를 찾지 못했습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Value Hierarchy Dashboard — Primary */}
      {hasHierarchy && (
        <ValueDashboard hierarchy={valueHierarchy} docSubject={docSubject} />
      )}

      {/* Legacy Causal Chains (fallback if no hierarchy) */}
      {!hasHierarchy && hasChains && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            인과관계
          </h2>
          <div className="flex flex-col gap-2">
            {causalChains.map((chain, i) => (
              <CausalChainCard key={i} chain={chain} />
            ))}
          </div>
        </section>
      )}

      {/* Similar Documents */}
      {hasSimilarDocs && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <Link className="h-4 w-4 text-brand-500" />
            유사 문서 {similarDocs.length}건
          </h2>
          <div className="flex flex-col gap-3">
            {similarDocs.map((doc) => (
              <SimilarDocCard key={doc.id} doc={doc} />
            ))}
          </div>
        </section>
      )}

      {recommendation && (
        <AIInsightCard title="AI 제안" content={recommendation} />
      )}
    </div>
  );
}
