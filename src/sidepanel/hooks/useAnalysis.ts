import { useAnalysisStore } from '../store/analysisStore';

export function useAnalysis() {
  const status = useAnalysisStore((s) => s.status);
  const result = useAnalysisStore((s) => s.result);
  const parsedDoc = useAnalysisStore((s) => s.parsedDoc);
  const error = useAnalysisStore((s) => s.error);
  const progress = useAnalysisStore((s) => s.progress);
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const apiKey = useAnalysisStore((s) => s.apiKey);
  const hasApiKey = useAnalysisStore((s) => s.hasApiKey);
  const showSettings = useAnalysisStore((s) => s.showSettings);

  const setStatus = useAnalysisStore((s) => s.setStatus);
  const setResult = useAnalysisStore((s) => s.setResult);
  const setError = useAnalysisStore((s) => s.setError);
  const setProgress = useAnalysisStore((s) => s.setProgress);
  const setActiveTab = useAnalysisStore((s) => s.setActiveTab);
  const setApiKey = useAnalysisStore((s) => s.setApiKey);
  const setShowSettings = useAnalysisStore((s) => s.setShowSettings);
  const checkApiKey = useAnalysisStore((s) => s.checkApiKey);
  const requestAnalysis = useAnalysisStore((s) => s.requestAnalysis);
  const retryAnalysis = useAnalysisStore((s) => s.retryAnalysis);
  const initListener = useAnalysisStore((s) => s.initListener);

  return {
    status,
    result,
    parsedDoc,
    error,
    progress,
    activeTab,
    apiKey,
    hasApiKey,
    showSettings,
    setStatus,
    setResult,
    setError,
    setProgress,
    setActiveTab,
    setApiKey,
    setShowSettings,
    checkApiKey,
    requestAnalysis,
    retryAnalysis,
    initListener,
  };
}
