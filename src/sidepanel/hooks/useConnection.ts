import { useEffect } from 'react';
import { useAnalysisStore } from '../store/analysisStore';

export function useConnection() {
  const initListener = useAnalysisStore((s) => s.initListener);
  const checkApiKey = useAnalysisStore((s) => s.checkApiKey);

  useEffect(() => {
    checkApiKey();
    const cleanup = initListener();

    // Query background for current status (in case page was detected before panel opened)
    try {
      chrome?.runtime?.sendMessage?.({ type: 'GET_STATUS' });
    } catch {
      // Extension context may be invalid
    }

    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initListener, checkApiKey]);
}
