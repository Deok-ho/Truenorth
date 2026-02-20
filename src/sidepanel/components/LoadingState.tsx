import React from 'react';
import { Loader2 } from 'lucide-react';
import Skeleton from './Skeleton';

interface LoadingStateProps {
  step: number;
  total: number;
  message: string;
}

export default function LoadingState({ step, total, message }: LoadingStateProps) {
  const progressPercent = Math.round((step / total) * 100);

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress hero section */}
      <div className="flex flex-col items-center justify-center border-b border-slate-100 bg-white px-5 pb-6 pt-8">
        {/* Spinner */}
        <div className="mb-4 flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center text-brand-600">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <div className="text-center">
            <h3 className="mb-1 text-xl font-bold tracking-tight text-slate-900">
              분석 중...
            </h3>
            <p className="text-sm text-slate-500">잠시만 기다려주세요.</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex w-full flex-col gap-2">
          <div className="mb-1 flex items-end justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              단계 {step}/{total}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{message}</p>
        </div>
      </div>

      {/* Skeleton cards */}
      <div className="flex flex-col gap-4 p-4">
        <Skeleton variant="card" />
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="skeleton-shimmer h-4 w-1/3 rounded" />
            <div className="skeleton-shimmer h-4 w-8 rounded" />
          </div>
          <div className="skeleton-shimmer mb-3 h-32 w-full rounded-lg" />
          <div className="flex gap-2">
            <div className="skeleton-shimmer h-8 w-20 rounded" />
            <div className="skeleton-shimmer h-8 w-20 rounded" />
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-4 opacity-60 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="skeleton-shimmer mt-1 h-4 w-4 rounded" />
            <div className="flex-1 space-y-2">
              <div className="skeleton-shimmer h-4 w-2/3 rounded" />
              <div className="skeleton-shimmer h-3 w-full rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
