import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

const OFFLINE_THRESHOLD = 3; // Mark offline after 3 consecutive failures

/**
 * Hook to detect and track offline state
 * Uses navigator.onLine + online/offline events as baseline,
 * but also tracks consecutive test failures for more accurate detection
 */
export function useOfflineDetection() {
  const setOffline = useAppStore((s) => s.setOffline);
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    const handleOnline = () => {
      consecutiveFailures.current = 0;
      setOffline(false);
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  // Functions to report test results - can be used by latency service
  const reportSuccess = useCallback(() => {
    consecutiveFailures.current = 0;
    setOffline(false);
  }, [setOffline]);

  const reportFailure = useCallback(() => {
    consecutiveFailures.current++;
    if (consecutiveFailures.current >= OFFLINE_THRESHOLD) {
      setOffline(true);
    }
  }, [setOffline]);

  return { reportSuccess, reportFailure };
}
