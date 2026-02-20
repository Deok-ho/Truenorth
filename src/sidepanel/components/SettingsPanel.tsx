import React, { useState, useEffect } from 'react';
import { Key, Save, X } from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';

export default function SettingsPanel() {
  const apiKey = useAnalysisStore((s) => s.apiKey);
  const setApiKey = useAnalysisStore((s) => s.setApiKey);
  const setShowSettings = useAnalysisStore((s) => s.setShowSettings);
  const [inputValue, setInputValue] = useState('');
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Mask the existing key for display
    if (apiKey) {
      setInputValue(apiKey.slice(0, 7) + '...' + apiKey.slice(-4));
    }

    // Load auto-analyze setting
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.get('auto_analyze').then((data) => {
        if (data.auto_analyze !== undefined) {
          setAutoAnalyze(data.auto_analyze);
        }
      });
    }
  }, [apiKey]);

  const handleSave = () => {
    // Only save if user typed a new key (not the masked one)
    if (inputValue && !inputValue.includes('...')) {
      setApiKey(inputValue.trim());
    }

    // Save auto-analyze preference
    if (typeof chrome !== 'undefined' && chrome?.storage?.local) {
      chrome.storage.local.set({ auto_analyze: autoAnalyze });
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowSettings(false);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Settings header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-sm font-bold text-slate-900">설정</h2>
        <button
          onClick={() => setShowSettings(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {/* API Key */}
        <div className="space-y-2">
          <label
            htmlFor="settings-api-key"
            className="text-xs font-semibold text-slate-700"
          >
            OpenAI API 키
          </label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Key className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="settings-api-key"
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="sk-..."
              className="block w-full rounded-md border-0 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            새 키를 입력하면 기존 키가 교체됩니다.
          </p>
        </div>

        {/* Auto-analyze toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">자동 분석</p>
            <p className="text-xs text-slate-500">
              결재 페이지 접속 시 자동으로 분석 시작
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoAnalyze}
            onClick={() => setAutoAnalyze(!autoAnalyze)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 ${
              autoAnalyze ? 'bg-brand-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                autoAnalyze ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save button */}
      <div className="shrink-0 border-t border-slate-200 p-4">
        <button
          onClick={handleSave}
          disabled={saved}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all ${
            saved
              ? 'bg-emerald-500'
              : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98]'
          }`}
        >
          <Save className="h-4 w-4" />
          {saved ? '저장됨' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
