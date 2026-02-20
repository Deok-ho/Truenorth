import React from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import type { SimilarDocument } from '@shared/types';
import Badge from './Badge';

interface SimilarDocCardProps {
  doc: SimilarDocument;
}

const statusConfig = {
  approved: {
    borderColor: 'border-t-emerald-500',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    badgeVariant: 'approved' as const,
    badgeLabel: '승인',
    scoreColor: 'text-emerald-600',
  },
  rejected: {
    borderColor: 'border-t-rose-500',
    icon: <XCircle className="h-3.5 w-3.5" />,
    badgeVariant: 'rejected' as const,
    badgeLabel: '반려',
    scoreColor: 'text-rose-600',
  },
  pending: {
    borderColor: 'border-t-amber-500',
    icon: <Clock className="h-3.5 w-3.5" />,
    badgeVariant: 'warn' as const,
    badgeLabel: '대기',
    scoreColor: 'text-amber-600',
  },
};

export default function SimilarDocCard({ doc }: SimilarDocCardProps) {
  const config = statusConfig[doc.status];
  const similarityPercent = Math.round(doc.similarity_score * 100);

  return (
    <div
      className={`group relative cursor-pointer overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md ${config.borderColor} border-t-[3px]`}
    >
      <div className="p-4">
        {/* Status badge + similarity score */}
        <div className="mb-2 flex items-start justify-between">
          <Badge label={config.badgeLabel} variant={config.badgeVariant} />
          <span className={`text-xs font-semibold ${config.scoreColor}`}>
            {similarityPercent}% 일치
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2 text-sm font-bold leading-tight text-slate-900">
          {doc.subject}
        </h3>

        {/* Summary excerpt */}
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
          {doc.summary.request}
        </p>
      </div>

      {/* Hover footer */}
      <div className="flex justify-end border-t border-slate-100 bg-slate-50 px-4 py-2 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="flex items-center gap-0.5 text-[11px] font-medium text-brand-600">
          상세보기
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
