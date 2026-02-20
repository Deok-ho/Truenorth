import React, { useState } from 'react';
import { Settings, RefreshCw, Highlighter, UserCircle } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

const logoUrl =
  typeof chrome !== 'undefined' && chrome?.runtime?.getURL
    ? chrome.runtime.getURL('icons/icon48.png')
    : 'icons/icon48.png';

export default function Header() {
  const retryAnalysis = useAnalysisStore((s) => s.retryAnalysis);
  const setShowSettings = useAnalysisStore((s) => s.setShowSettings);
  const showSettings = useAnalysisStore((s) => s.showSettings);
  const setShowCareer = useAnalysisStore((s) => s.setShowCareer);
  const showCareer = useAnalysisStore((s) => s.showCareer);
  const status = useAnalysisStore((s) => s.status);
  const highlightEnabled = useAnalysisStore((s) => s.highlightEnabled);
  const toggleHighlight = useAnalysisStore((s) => s.toggleHighlight);
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    retryAnalysis();
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <img src={logoUrl} alt="Truenorth" className="h-7 w-7 rounded object-contain" />
        <h1 className="text-base font-bold tracking-tight text-slate-900">
          Truenorth
        </h1>
      </div>
      <div className="flex items-center gap-1">
        {status === 'success' && (
          <button
            onClick={toggleHighlight}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              highlightEnabled
                ? 'bg-brand-50 text-brand-600'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            aria-label={highlightEnabled ? '하이라이트 끄기' : '하이라이트 켜기'}
            title={highlightEnabled ? '하이라이트 끄기' : '하이라이트 켜기'}
          >
            <Highlighter className="h-[18px] w-[18px]" />
          </button>
        )}
        <button
          onClick={handleRefresh}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
          aria-label="새로고침"
        >
          <RefreshCw
            className={`h-[18px] w-[18px] transition-transform duration-700 ${
              spinning ? 'rotate-[360deg]' : ''
            }`}
          />
        </button>
        <button
          onClick={() => setShowCareer(!showCareer)}
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            showCareer
              ? 'bg-brand-50 text-brand-600'
              : 'text-slate-500 hover:bg-slate-100 hover:text-brand-600'
          }`}
          aria-label="내 커리어"
          title="내 커리어"
        >
          <UserCircle className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
          aria-label="설정"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
