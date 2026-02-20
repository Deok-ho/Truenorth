import React from 'react';
import { Compass, ScanSearch, Zap } from 'lucide-react';

const GROUPWARE_LABELS: Record<string, string> = {
  bizbox_alpha: '비즈박스 알파',
  hiworks: '하이웍스',
  daou_office: '다우오피스',
  flow: 'flow',
  amaranth10: '아마란스10',
  unknown: '결재 문서',
};

interface ReadyStateProps {
  groupware: string;
  onAnalyze: () => void;
  onLiteAnalyze: () => void;
}

export default function ReadyState({ groupware, onAnalyze, onLiteAnalyze }: ReadyStateProps) {
  const label = GROUPWARE_LABELS[groupware] || GROUPWARE_LABELS.unknown;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-brand-500">
        <Compass className="h-8 w-8" />
      </div>
      <h2 className="mb-1 text-lg font-bold text-brand-600">
        Truenorth
      </h2>
      <p className="mb-6 text-sm font-medium text-slate-700">
        내 커리어의 나침반
      </p>

      <div className="mb-4 flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5">
        <ScanSearch className="h-4 w-4 text-green-600" />
        <span className="text-xs font-semibold text-green-700">{label} 감지됨</span>
      </div>
      <p className="mb-6 text-sm leading-relaxed text-slate-500">
        결재 문서가 확인되었습니다.
        <br />
        AI 분석을 시작하려면 아래 버튼을 눌러주세요.
      </p>
      <div className="w-full space-y-2.5">
        <button
          onClick={onAnalyze}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
        >
          Pro 분석
        </button>
        <button
          onClick={onLiteAnalyze}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
        >
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          Lite 빠른 검사
        </button>
      </div>
    </div>
  );
}
