import React, { useState } from 'react';
import { Key, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

export default function OnboardingPopup() {
  const setApiKey = useAnalysisStore((s) => s.setApiKey);
  const [inputValue, setInputValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setError('API 키를 입력해주세요.');
      return;
    }

    if (!trimmed.startsWith('sk-')) {
      setError('올바른 OpenAI API 키 형식이 아닙니다.');
      return;
    }

    setApiKey(trimmed);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <div className="mb-5 flex shrink-0 flex-col items-center justify-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <img src={chrome.runtime.getURL('icons/icon128.png')} alt="Truenorth" className="h-8 w-8 rounded object-contain" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Truenorth
            </h1>
          </div>
          <p className="px-2 text-sm font-medium leading-relaxed text-slate-500">
            AI 기반 결재 문서 분석을 브라우저에서 바로 시작하세요.
          </p>
        </div>

        {/* Input Section */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="api-key"
            className="ml-1 text-xs font-semibold uppercase tracking-wider text-slate-900"
          >
            OpenAI API 키
          </label>

          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Key className="h-[18px] w-[18px] text-slate-400" />
            </div>
            <input
              id="api-key"
              type={showPassword ? 'text' : 'password'}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError('');
              }}
              placeholder="sk-..."
              autoComplete="off"
              className="block w-full rounded-md border-0 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? (
                <EyeOff className="h-[18px] w-[18px]" />
              ) : (
                <Eye className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>

          {error && (
            <p className="ml-1 text-[11px] font-medium text-rose-500">
              {error}
            </p>
          )}

          <div className="ml-1 mt-1 flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-[11px] font-medium text-slate-400">
              API 키는 브라우저에만 저장됩니다
            </p>
          </div>

          {/* CTA Button */}
          <div className="mt-auto shrink-0 pt-4">
            <button
              type="submit"
              className="group flex w-full cursor-pointer items-center justify-center rounded-md bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <span className="mr-2">시작하기</span>
              <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
