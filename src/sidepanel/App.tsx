import React from 'react';
import { useAnalysisStore } from './store/analysisStore';
import { useConnection } from './hooks/useConnection';
import Header from './components/Header';
import TabBar from './components/TabBar';
import Footer from './components/Footer';
import OnboardingPopup from './components/OnboardingPopup';
import SettingsPanel from './components/SettingsPanel';
import CareerPanel from './components/CareerPanel';
import EmptyState from './components/EmptyState';
import ReadyState from './components/ReadyState';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import SummaryTab from './components/SummaryTab';
import CoherenceTab from './components/CoherenceTab';
import RelationTab from './components/RelationTab';

export default function App() {
  useConnection();

  const status = useAnalysisStore((s) => s.status);
  const result = useAnalysisStore((s) => s.result);
  const parsedDoc = useAnalysisStore((s) => s.parsedDoc);
  const error = useAnalysisStore((s) => s.error);
  const progress = useAnalysisStore((s) => s.progress);
  const activeTab = useAnalysisStore((s) => s.activeTab);
  const hasApiKey = useAnalysisStore((s) => s.hasApiKey);
  const showSettings = useAnalysisStore((s) => s.showSettings);
  const showCareer = useAnalysisStore((s) => s.showCareer);
  const retryAnalysis = useAnalysisStore((s) => s.retryAnalysis);
  const requestAnalysis = useAnalysisStore((s) => s.requestAnalysis);
  const requestLiteAnalysis = useAnalysisStore((s) => s.requestLiteAnalysis);
  const detectedGroupware = useAnalysisStore((s) => s.detectedGroupware);

  // Onboarding overlay when no API key
  if (!hasApiKey) {
    return <OnboardingPopup />;
  }

  // Settings overlay
  if (showSettings) {
    return <SettingsPanel />;
  }

  // Career overlay
  if (showCareer) {
    return <CareerPanel />;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Fixed Header */}
      <Header />

      {/* Fixed TabBar - only show when there's a result */}
      {status === 'success' && result && <TabBar />}

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto scroll-smooth">
        {status === 'idle' && <EmptyState />}

        {status === 'ready' && (
          <ReadyState
            groupware={detectedGroupware || 'unknown'}
            onAnalyze={requestAnalysis}
            onLiteAnalyze={requestLiteAnalysis}
          />
        )}

        {status === 'loading' && (
          <LoadingState
            step={progress?.step ?? 1}
            total={progress?.total ?? 4}
            message={progress?.message ?? '분석 중...'}
          />
        )}

        {status === 'error' && error && (
          <ErrorState
            type={error.type}
            message={error.message}
            onRetry={retryAnalysis}
          />
        )}

        {status === 'empty' && <EmptyState />}

        {status === 'success' && result && (
          <>
            {activeTab === 'summary' && (
              <SummaryTab
                data={result}
                docType={parsedDoc?.doc_type ?? '문서'}
                subject={parsedDoc?.subject ?? result.summary.request}
                requesterName={parsedDoc?.requester_name ?? ''}
                requesterDept={parsedDoc?.requester_dept ?? ''}
                createdAt={parsedDoc?.created_at ?? result.analyzedAt}
              />
            )}

            {activeTab === 'coherence' && (
              <CoherenceTab
                coherence={result.coherence}
                recommendation={result.recommendation}
              />
            )}

            {activeTab === 'relation' && (
              <RelationTab
                similarDocs={result.similarDocs}
                recommendation={result.recommendation}
                causalChains={result.causalChains ?? []}
                valueHierarchy={result.valueHierarchy ?? null}
                docSubject={parsedDoc?.subject ?? result.summary.request}
              />
            )}
          </>
        )}
      </main>

      {/* Fixed Footer */}
      <Footer />
    </div>
  );
}
