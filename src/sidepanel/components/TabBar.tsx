import React from 'react';
import { FileText, ShieldCheck, GitBranch } from 'lucide-react';
import { useAnalysisStore, type ActiveTab } from '../store/analysisStore';

interface TabItem {
  key: ActiveTab;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: 'summary', label: '요약', icon: <FileText className="h-4 w-4" /> },
  { key: 'coherence', label: '정합성', icon: <ShieldCheck className="h-4 w-4" /> },
  { key: 'relation', label: '관계', icon: <GitBranch className="h-4 w-4" /> },
];

export default function TabBar() {
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);

  return (
    <div className="flex h-10 shrink-0 border-b border-slate-200 bg-white">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 text-xs font-medium transition-colors ${
              isActive
                ? 'border-brand-600 font-bold text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            <span className={isActive ? 'text-brand-600' : 'text-slate-400'}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
