import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  TrendingUp,
  History,
  Briefcase,
  Plus,
  ChevronRight,
  FileText,
  Calendar,
  Award,
  BarChart3,
  Trash2,
  Copy,
  Loader2,
} from 'lucide-react';
import { useAnalysisStore } from '../store/analysisStore';
import type { CareerGoal, CareerMetric, HistoryEntry, HistoryDetail, CareerDocument } from '@shared/types';
import JandiCalendar from './JandiCalendar';
import RadarChart from './RadarChart';
import HistoryDetailView from './HistoryDetailView';

type CareerTab = 'goals' | 'performance' | 'history' | 'summary';

const TABS: { key: CareerTab; label: string; icon: React.ReactNode }[] = [
  { key: 'goals', label: '나의 목표', icon: <Target className="h-4 w-4" /> },
  { key: 'performance', label: '나의 성과', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'history', label: '나의 기록', icon: <History className="h-4 w-4" /> },
  { key: 'summary', label: '경력정리', icon: <Briefcase className="h-4 w-4" /> },
];

// ─── Storage Helpers ───
const STORAGE_KEYS = {
  goals: 'career_goals',
  metrics: 'career_metrics',
  history: 'career_history',
} as const;

async function loadFromStorage<T>(key: string, fallback: T): Promise<T> {
  try {
    const data = await chrome?.storage?.local?.get(key);
    return data?.[key] ?? fallback;
  } catch {
    return fallback;
  }
}

async function saveToStorage(key: string, value: unknown): Promise<void> {
  try {
    await chrome?.storage?.local?.set({ [key]: value });
  } catch {
    // storage not available
  }
}

/**
 * Sends a message to the background service worker for Supabase sync.
 */
function sendToBackground(msg: Record<string, unknown>): void {
  try {
    chrome?.runtime?.sendMessage?.(msg).catch(() => {});
  } catch {
    // Extension context may not be available
  }
}

export default function CareerPanel() {
  const setShowCareer = useAnalysisStore((s) => s.setShowCareer);
  const [activeTab, setActiveTab] = useState<CareerTab>('goals');
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [metrics, setMetrics] = useState<CareerMetric[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<HistoryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Load from chrome.storage.local first, then try Supabase sync
  useEffect(() => {
    (async () => {
      const [g, m, h] = await Promise.all([
        loadFromStorage<CareerGoal[]>(STORAGE_KEYS.goals, []),
        loadFromStorage<CareerMetric[]>(STORAGE_KEYS.metrics, []),
        loadFromStorage<HistoryEntry[]>(STORAGE_KEYS.history, []),
      ]);
      setGoals(g);
      setMetrics(m);
      setHistory(h);
      setLoading(false);

      // Attempt Supabase sync in background (non-blocking)
      try {
        const stored = await chrome?.storage?.local?.get('current_user_id');
        const userId = stored?.current_user_id;
        if (userId) {
          sendToBackground({ type: 'CAREER_SYNC_GOALS', payload: { userId } });
          sendToBackground({ type: 'CAREER_SYNC_HISTORY', payload: { userId } });
        }
      } catch {
        // No user logged in — local data only
      }
    })();
  }, []);

  // Handle delete history entry
  const handleDeleteEntry = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    saveToStorage(STORAGE_KEYS.history, updated);
    sendToBackground({ type: 'DELETE_HISTORY_ENTRY', payload: { historyId: id } });
    // If the deleted entry is currently viewed, go back to list
    if (selectedEntry?.id === id) setSelectedEntry(null);
  };

  // Listen for Supabase sync responses
  useEffect(() => {
    const listener = (message: Record<string, unknown>) => {
      if (!message?.type) return;

      if (message.type === 'CAREER_GOALS_DATA') {
        const payload = message.payload as { goals: CareerGoal[] };
        if (payload.goals.length > 0) {
          setGoals(payload.goals);
          saveToStorage(STORAGE_KEYS.goals, payload.goals);
        }
      }

      if (message.type === 'CAREER_HISTORY_DATA') {
        const payload = message.payload as { history: HistoryEntry[] };
        if (payload.history.length > 0) {
          setHistory((prev) => {
            // Merge: Supabase entries + local-only entries
            const supaIds = new Set(payload.history.map((h) => h.id));
            const localOnly = prev.filter((h) => !supaIds.has(h.id));
            const merged = [...payload.history, ...localOnly];
            saveToStorage(STORAGE_KEYS.history, merged);
            return merged;
          });
        }
      }

      if (message.type === 'ANALYSIS_DETAIL_RESULT') {
        const payload = message.payload as { detail: HistoryDetail | null };
        setSelectedDetail(payload.detail);
        setDetailLoading(false);
      }
    };

    chrome?.runtime?.onMessage?.addListener(listener);
    return () => {
      chrome?.runtime?.onMessage?.removeListener(listener);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <h2 className="text-sm font-bold text-slate-900">내 커리어</h2>
        <button
          onClick={() => setShowCareer(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex shrink-0 border-b border-slate-200 bg-slate-50">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-brand-600 bg-white text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {activeTab === 'goals' && (
              <GoalsTab goals={goals} setGoals={setGoals} />
            )}
            {activeTab === 'performance' && (
              <PerformanceTab metrics={metrics} history={history} />
            )}
            {activeTab === 'history' && (
              selectedEntry ? (
                <HistoryDetailView
                  entry={selectedEntry}
                  detail={selectedDetail}
                  loading={detailLoading}
                  onBack={() => setSelectedEntry(null)}
                />
              ) : (
                <HistoryTab
                  history={history}
                  onEntryClick={(entry) => {
                    setSelectedEntry(entry);
                    setDetailLoading(true);
                    setSelectedDetail(null);
                    sendToBackground({ type: 'GET_ANALYSIS_DETAIL', payload: { historyId: entry.id } });
                  }}
                  onDelete={handleDeleteEntry}
                />
              )
            )}
            {activeTab === 'summary' && (
              <SummaryTab goals={goals} metrics={metrics} history={history} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Goals Tab
// ═══════════════════════════════════════════════════════

function GoalsTab({
  goals,
  setGoals,
}: {
  goals: CareerGoal[];
  setGoals: React.Dispatch<React.SetStateAction<CareerGoal[]>>;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const getUserId = async (): Promise<string | null> => {
    try {
      const stored = await chrome?.storage?.local?.get('current_user_id');
      return stored?.current_user_id || null;
    } catch {
      return null;
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const goal: CareerGoal = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      description: newDesc.trim(),
      deadline: newDeadline || null,
      progress: 0,
      source: 'manual',
      relatedDocIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...goals, goal];
    setGoals(updated);
    await saveToStorage(STORAGE_KEYS.goals, updated);

    // Sync to Supabase
    const userId = await getUserId();
    if (userId) {
      sendToBackground({ type: 'CAREER_UPSERT_GOAL', payload: { userId, goal } });
    }

    setNewTitle('');
    setNewDesc('');
    setNewDeadline('');
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    setGoals(updated);
    await saveToStorage(STORAGE_KEYS.goals, updated);

    // Sync to Supabase
    sendToBackground({ type: 'CAREER_DELETE_GOAL', payload: { goalId: id } });
  };

  const handleProgressChange = async (id: string, progress: number) => {
    const updatedGoal = goals.find((g) => g.id === id);
    const updated = goals.map((g) =>
      g.id === id ? { ...g, progress, updatedAt: new Date().toISOString() } : g,
    );
    setGoals(updated);
    await saveToStorage(STORAGE_KEYS.goals, updated);

    // Sync to Supabase
    if (updatedGoal) {
      const userId = await getUserId();
      if (userId) {
        sendToBackground({
          type: 'CAREER_UPSERT_GOAL',
          payload: { userId, goal: { ...updatedGoal, progress, updatedAt: new Date().toISOString() } },
        });
      }
    }
  };

  return (
    <div className="p-4 space-y-3">
      {/* Add button */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-3 text-sm font-medium text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-600"
        >
          <Plus className="h-4 w-4" />
          목표 추가
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-brand-200 bg-brand-50/30 p-3 space-y-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="목표 제목"
            className="block w-full rounded-md border-0 bg-white py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600"
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="상세 설명 (선택)"
            rows={2}
            className="block w-full rounded-md border-0 bg-white py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 resize-none"
          />
          <input
            type="date"
            value={newDeadline}
            onChange={(e) => setNewDeadline(e.target.value)}
            className="block w-full rounded-md border-0 bg-white py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-600"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              className="flex-1 rounded-md bg-brand-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              추가
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 rounded-md bg-slate-100 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Goals list */}
      {goals.length === 0 && !showAdd && (
        <div className="py-12 text-center">
          <Target className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            아직 등록된 목표가 없습니다.
          </p>
          <p className="text-xs text-slate-400">
            목표를 추가하고 진행 상황을 추적하세요.
          </p>
        </div>
      )}

      {goals.map((goal) => (
        <div
          key={goal.id}
          className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900 truncate">
                {goal.title}
              </h4>
              {goal.description && (
                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
            <button
              onClick={() => handleDelete(goal.id)}
              className="ml-2 shrink-0 p-1 text-slate-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">진행률</span>
              <span className="text-[11px] font-semibold text-brand-600">
                {goal.progress}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={goal.progress}
              onChange={(e) =>
                handleProgressChange(goal.id, Number(e.target.value))
              }
              className="w-full h-1.5 rounded-full appearance-none bg-slate-200 accent-brand-600 cursor-pointer"
            />
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {goal.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {goal.deadline}
              </span>
            )}
            <span className={`rounded px-1.5 py-0.5 font-medium ${
              goal.source === 'auto'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {goal.source === 'auto' ? '자동 추출' : '직접 입력'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Performance Tab
// ═══════════════════════════════════════════════════════

function PerformanceTab({
  metrics,
  history,
}: {
  metrics: CareerMetric[];
  history: HistoryEntry[];
}) {
  // Auto-compute metrics from history
  const totalAnalyses = history.length;
  const proAnalyses = history.filter((h) => h.mode === 'pro').length;
  const liteAnalyses = history.filter((h) => h.mode === 'lite').length;
  const avgScore =
    history.filter((h) => h.overallScore != null).length > 0
      ? Math.round(
          history
            .filter((h) => h.overallScore != null)
            .reduce((sum, h) => sum + (h.overallScore ?? 0), 0) /
            history.filter((h) => h.overallScore != null).length,
        )
      : null;

  const docTypes = history.reduce<Record<string, number>>((acc, h) => {
    const t = h.docType || '기타';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<FileText className="h-4 w-4 text-brand-600" />}
          label="총 분석 건수"
          value={String(totalAnalyses)}
        />
        <StatCard
          icon={<Award className="h-4 w-4 text-amber-500" />}
          label="평균 정합성 점수"
          value={avgScore != null ? `${avgScore}점` : '-'}
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4 text-blue-500" />}
          label="Pro 분석"
          value={String(proAnalyses)}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          label="Lite 분석"
          value={String(liteAnalyses)}
        />
      </div>

      {/* Doc type breakdown */}
      {Object.keys(docTypes).length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <h4 className="text-xs font-semibold text-slate-700">
            문서 유형별 분석
          </h4>
          {Object.entries(docTypes)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-xs text-slate-600">{type}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{
                        width: `${Math.min((count / totalAnalyses) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 w-6 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Radar chart — visible when 3+ doc types exist */}
      <RadarChart history={history} />

      {/* Custom metrics */}
      {metrics.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700">사용자 지표</h4>
          {metrics.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
            >
              <span className="text-sm text-slate-700">{m.name}</span>
              <span className="text-sm font-semibold text-brand-600">
                {m.currentValue} / {m.targetValue}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalAnalyses === 0 && metrics.length === 0 && (
        <div className="py-12 text-center">
          <TrendingUp className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            아직 분석 기록이 없습니다.
          </p>
          <p className="text-xs text-slate-400">
            문서를 분석하면 자동으로 성과가 기록됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[11px] text-slate-500">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// History Tab
// ═══════════════════════════════════════════════════════

function HistoryTab({ history, onEntryClick, onDelete }: { history: HistoryEntry[]; onEntryClick: (entry: HistoryEntry) => void; onDelete: (id: string) => void }) {
  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (sorted.length === 0) {
    return (
      <div className="p-4 py-12 text-center">
        <History className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-2 text-sm text-slate-500">분석 기록이 없습니다.</p>
        <p className="text-xs text-slate-400">
          문서를 분석하면 이곳에 기록됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {/* Jandi (grass) activity calendar */}
      <JandiCalendar history={history} />

      {/* History list */}
      {sorted.map((entry) => (
        <div
          key={entry.id}
          onClick={() => onEntryClick(entry)}
          className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50 cursor-pointer"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {entry.subject || '제목 없음'}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  entry.mode === 'pro'
                    ? 'bg-brand-50 text-brand-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {entry.mode === 'pro' ? 'Pro' : 'Lite'}
              </span>
              {entry.docType && (
                <span className="text-[11px] text-slate-400">
                  {entry.docType}
                </span>
              )}
              <span className="text-[11px] text-slate-400">
                {formatDate(entry.createdAt)}
              </span>
            </div>
          </div>
          {entry.overallScore != null && (
            <div className="shrink-0 text-right">
              <span
                className={`text-sm font-bold ${
                  entry.overallScore >= 80
                    ? 'text-emerald-600'
                    : entry.overallScore >= 60
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`}
              >
                {entry.overallScore}
              </span>
              <span className="text-[11px] text-slate-400">점</span>
            </div>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors"
            title="삭제"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Summary Tab (Career Portfolio)
// ═══════════════════════════════════════════════════════

function SummaryTab({
  goals,
  metrics,
  history,
}: {
  goals: CareerGoal[];
  metrics: CareerMetric[];
  history: HistoryEntry[];
}) {
  const completedGoals = goals.filter((g) => g.progress >= 100).length;
  const totalAnalyses = history.length;
  const avgScore =
    history.filter((h) => h.overallScore != null).length > 0
      ? Math.round(
          history
            .filter((h) => h.overallScore != null)
            .reduce((sum, h) => sum + (h.overallScore ?? 0), 0) /
            history.filter((h) => h.overallScore != null).length,
        )
      : null;

  // Career document generation state
  const [careerPrompt, setCareerPrompt] = useState('');
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [copied, setCopied] = useState(false);
  const [savedDocs, setSavedDocs] = useState<CareerDocument[]>([]);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Deduplicate history by subject
  const uniqueHistory = history.filter(
    (h, i, arr) => arr.findIndex((x) => x.subject === h.subject) === i,
  );

  // Load saved career documents on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await chrome?.storage?.local?.get('career_documents');
        setSavedDocs(stored?.career_documents ?? []);
      } catch { /* */ }
    })();
    sendToBackground({ type: 'LOAD_CAREER_DOCUMENTS', payload: null });
  }, []);

  // Listen for career document generation results + load results
  useEffect(() => {
    const listener = (message: Record<string, unknown>) => {
      if (message.type === 'CAREER_DOCUMENT_RESULT') {
        setGeneratedDoc((message.payload as { content: string }).content);
        setIsGenerating(false);
        setGenerateError('');
      }
      if (message.type === 'CAREER_DOCUMENT_ERROR') {
        setGenerateError((message.payload as { message: string }).message);
        setIsGenerating(false);
      }
      if (message.type === 'CAREER_DOCUMENTS_DATA') {
        const docs = (message.payload as { documents: CareerDocument[] }).documents;
        setSavedDocs(docs);
      }
    };
    chrome?.runtime?.onMessage?.addListener(listener);
    return () => {
      chrome?.runtime?.onMessage?.removeListener(listener);
    };
  }, []);

  const handleGenerate = () => {
    if (uniqueHistory.length === 0) return;
    setIsGenerating(true);
    setGenerateError('');
    setGeneratedDoc('');
    sendToBackground({
      type: 'GENERATE_CAREER_DOCUMENT',
      payload: { history: uniqueHistory, prompt: careerPrompt },
    });
  };

  const handleSave = () => {
    if (!generatedDoc) return;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const doc: CareerDocument = {
      id: crypto.randomUUID(),
      title: `${dateStr} 경력문서`,
      content: generatedDoc,
      prompt: careerPrompt,
      historyCount: uniqueHistory.length,
      createdAt: now.toISOString(),
    };
    // Optimistic UI update
    setSavedDocs((prev) => [doc, ...prev]);
    // Delegate storage persistence to background (single writer to avoid race conditions).
    // Background will save to chrome.storage.local + Supabase, then broadcast CAREER_DOCUMENTS_DATA.
    sendToBackground({ type: 'SAVE_CAREER_DOCUMENT', payload: { document: doc } });
    setGeneratedDoc('');
    setCareerPrompt('');
  };

  const handleDeleteDoc = (docId: string) => {
    // Optimistic UI update
    setSavedDocs((prev) => prev.filter((d) => d.id !== docId));
    // Delegate storage persistence to background (single writer to avoid race conditions).
    // Background will update chrome.storage.local + Supabase, then broadcast CAREER_DOCUMENTS_DATA.
    sendToBackground({ type: 'DELETE_CAREER_DOCUMENT', payload: { docId } });
    if (expandedDocId === docId) setExpandedDocId(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Career at a glance */}
      <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-brand-50 to-white p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-900">커리어 요약</h4>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-brand-600">{goals.length}</p>
            <p className="text-[11px] text-slate-500">설정 목표</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">
              {completedGoals}
            </p>
            <p className="text-[11px] text-slate-500">달성 목표</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">
              {totalAnalyses}
            </p>
            <p className="text-[11px] text-slate-500">분석 완료</p>
          </div>
        </div>

        {avgScore != null && (
          <div className="flex items-center justify-between rounded-md bg-white/70 p-2.5">
            <span className="text-xs text-slate-600">평균 문서 정합성</span>
            <span
              className={`text-sm font-bold ${
                avgScore >= 80
                  ? 'text-emerald-600'
                  : avgScore >= 60
                    ? 'text-amber-500'
                    : 'text-red-500'
              }`}
            >
              {avgScore}점
            </span>
          </div>
        )}
      </div>

      {/* Active goals preview */}
      {goals.filter((g) => g.progress < 100).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700">
            진행 중인 목표
          </h4>
          {goals
            .filter((g) => g.progress < 100)
            .slice(0, 3)
            .map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {g.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${g.progress}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-brand-600 w-8 text-right">
                    {g.progress}%
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Recent analyses preview */}
      {history.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-700">최근 분석</h4>
          {[...history]
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, 3)
            .map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 truncate">
                    {h.subject || '제목 없음'}
                  </p>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(h.createdAt)}
                  </span>
                </div>
                {h.overallScore != null && (
                  <span
                    className={`text-sm font-bold ${
                      h.overallScore >= 80
                        ? 'text-emerald-600'
                        : h.overallScore >= 60
                          ? 'text-amber-500'
                          : 'text-red-500'
                    }`}
                  >
                    {h.overallScore}점
                  </span>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Career Document Generation */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-900">이력서용 경력 문서 생성</h4>
        <p className="text-xs text-slate-500">
          분석한 기안 문서를 바탕으로 이력서에 적합한 경력 정리 문서를 생성합니다.
        </p>

        <textarea
          value={careerPrompt}
          onChange={(e) => setCareerPrompt(e.target.value)}
          placeholder="강조하고 싶은 역량이나 직무를 입력하세요 (선택사항)"
          rows={2}
          className="block w-full rounded-md border-0 bg-slate-50 py-2 px-3 text-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-600 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            중복 제외 {uniqueHistory.length}건의 기안 기록 기반
          </span>
          <button
            onClick={handleGenerate}
            disabled={uniqueHistory.length === 0 || isGenerating}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                생성 중...
              </span>
            ) : (
              '경력 문서 생성'
            )}
          </button>
        </div>

        {isGenerating && (
          <div className="flex items-center gap-2 rounded-md bg-brand-50 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
            <span className="text-xs text-brand-600">AI가 경력 문서를 작성하고 있습니다...</span>
          </div>
        )}

        {generateError && (
          <div className="rounded-md bg-red-50 p-3">
            <p className="text-xs text-red-600">{generateError}</p>
          </div>
        )}

        {generatedDoc && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-semibold text-slate-700">생성 결과</h5>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(generatedDoc)}
                  className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? '복사됨!' : '복사'}
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-md bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  저장
                </button>
              </div>
            </div>
            <div className="rounded-md bg-slate-50 p-3">
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                {generatedDoc}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Saved Career Documents */}
      {savedDocs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <h4 className="text-sm font-bold text-slate-900">저장된 경력 문서</h4>
          {savedDocs
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((doc) => (
            <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50">
              <div
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 truncate">{doc.title}</p>
                  <span className="text-[10px] text-slate-400">
                    {doc.historyCount}건 기반 · {formatDate(doc.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(doc.content);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    title="복사"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDoc(doc.id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${expandedDocId === doc.id ? 'rotate-90' : ''}`} />
                </div>
              </div>
              {expandedDocId === doc.id && (
                <div className="border-t border-slate-200 p-3">
                  <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {doc.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {goals.length === 0 && history.length === 0 && (
        <div className="py-8 text-center">
          <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-2 text-sm text-slate-500">
            아직 커리어 데이터가 없습니다.
          </p>
          <p className="text-xs text-slate-400">
            목표를 설정하고 문서를 분석하면 자동으로 정리됩니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ───

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}/${day}`;
  } catch {
    return '';
  }
}
