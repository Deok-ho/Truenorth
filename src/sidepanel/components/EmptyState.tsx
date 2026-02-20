import React from 'react';
import { Compass } from 'lucide-react';

export default function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <Compass className="h-8 w-8" />
      </div>
      <h2 className="mb-1 text-lg font-bold text-brand-600">
        Truenorth
      </h2>
      <p className="mb-4 text-sm font-medium text-slate-700">
        내 커리어의 나침반
      </p>
      <p className="mb-8 text-sm leading-relaxed text-slate-500">
        결재문서를 열면 자동으로 분석을 시작합니다
      </p>
      <div className="w-full space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          지원 그룹웨어
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['비즈박스 알파', '하이웍스', '다우오피스', 'flow', '아마란스10'].map(
            (name) => (
              <span
                key={name}
                className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500"
              >
                {name}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
