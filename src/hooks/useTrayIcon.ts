import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { LatencyStatus, LatencyThresholds, EndpointStatus } from '../types';
import { getLatencyStatus, getStatusLabel } from '../lib/utils';
import { TauriError, ErrorCode, parseBackendError } from '../errors';

// Maximum retry attempts for failed operations
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

interface UseTrayIconProps {
  averageLatency: number | null;
  thresholds: LatencyThresholds;
  notificationsEnabled: boolean;
  /** Optional: endpoint statuses for more detailed notifications */
  endpointStatuses?: Map<string, EndpointStatus>;
  /** Number of consecutive high latency checks before showing notification (default: 3) */
  alertThreshold?: number;
  /** Minutes between repeated alerts (default: 5) */
  alertCooldown?: number;
}

interface TrayIconError {
  message: string;
  code: ErrorCode;
  timestamp: number;
}

// Helper to delay execution
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

// Retry wrapper for async operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
  delayMs: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        await delay(delayMs * attempt); // Exponential backoff
      }
    }
  }

  throw lastError;
}

export function useTrayIcon({
  averageLatency,
  thresholds,
  notificationsEnabled,
  endpointStatuses,
  alertThreshold = 3,
  alertCooldown = 5,
}: UseTrayIconProps) {
  const lastNotifiedStatus = useRef<LatencyStatus | null>(null);
  // Track last notification time for cooldown enforcement
  const lastNotificationTime = useRef<number>(0);
  // Track consecutive high latency checks
  const consecutiveHighLatencyCount = useRef<number>(0);
  // Track previous average latency to detect new test cycles
  const previousLatency = useRef<number | null>(null);
  // Track errors for debugging
  const lastError = useRef<TrayIconError | null>(null);
  // Track if component is mounted
  const isMounted = useRef<boolean>(true);

  // Safe invoke wrapper that handles errors properly
  const safeInvoke = useCallback(
    async <T>(
      command: string,
      args: Record<string, unknown>,
      errorCode: ErrorCode
    ): Promise<T | null> => {
      try {
        return await withRetry(() => invoke<T>(command, args));
      } catch (error) {
        const parsedError = parseBackendError(error);
        const tauriError = new TauriError(
          parsedError.message,
          errorCode,
          command
        );

        // Store error for debugging
        lastError.current = {
          message: tauriError.message,
          code: tauriError.code,
          timestamp: Date.now(),
        };

        console.error(`[useTrayIcon] ${command} failed:`, {
          error: tauriError.message,
          code: tauriError.code,
          command,
          args,
        });

        return null;
      }
    },
    []
  );

  // Update tray icon when latency changes
  useEffect(() => {
    if (averageLatency === null) return;

    let cancelled = false;

    const updateIcon = async (): Promise<void> => {
      if (cancelled) return;

      await safeInvoke(
        'update_tray_icon',
        {
          latency: averageLatency,
          excellent: thresholds.excellent,
          good: thresholds.good,
          warning: thresholds.warning,
        },
        ErrorCode.TRAY_ICON_UPDATE_FAILED
      );
    };

    updateIcon();

    return () => {
      cancelled = true;
    };
  }, [averageLatency, thresholds, safeInvoke]);

  // Build detailed notification message with endpoint names (excludes muted and non-latency-critical endpoints)
  const buildNotificationBody = useCallback(
    (avgLatency: number, status: LatencyStatus): string => {
      const lines: string[] = [];

      // Add average latency with status label for accessibility
      lines.push(`Average: ${avgLatency.toFixed(1)}ms [${getStatusLabel(status)}]`);

      // Add individual endpoint details if available (skip muted and non-latency-critical endpoints)
      if (endpointStatuses && endpointStatuses.size > 0) {
        const criticalEndpoints: string[] = [];
        const warningEndpoints: string[] = [];

        endpointStatuses.forEach((epStatus) => {
          // Skip muted endpoints
          if (epStatus.endpoint.muted === true) return;
          // Skip non-latency-critical endpoints (they only check reachability, not latency)
          if (epStatus.endpoint.latencyCritical === false) return;

          const epLatency = epStatus.currentLatency;
          const epName = epStatus.endpoint.name;

          if (epStatus.status === 'critical' && epLatency !== null) {
            criticalEndpoints.push(`${epName}: ${epLatency.toFixed(0)}ms`);
          } else if (epStatus.status === 'warning' && epLatency !== null) {
            warningEndpoints.push(`${epName}: ${epLatency.toFixed(0)}ms`);
          }
        });

        // Add critical endpoints first
        if (criticalEndpoints.length > 0) {
          lines.push(`Critical: ${criticalEndpoints.join(', ')}`);
        }

        // Add warning endpoints
        if (warningEndpoints.length > 0) {
          lines.push(`Warning: ${warningEndpoints.join(', ')}`);
        }
      }

      return lines.join('\n');
    },
    [endpointStatuses]
  );

  // Check if there are any non-muted, latency-critical endpoints with warning/critical status
  const hasNonMutedAlerts = useCallback((): boolean => {
    if (!endpointStatuses) return false;

    for (const epStatus of endpointStatuses.values()) {
      // Skip muted endpoints
      if (epStatus.endpoint.muted === true) continue;
      // Skip non-latency-critical endpoints (they only check reachability, not latency)
      if (epStatus.endpoint.latencyCritical === false) continue;

      if (epStatus.status === 'warning' || epStatus.status === 'critical') {
        return true;
      }
    }
    return false;
  }, [endpointStatuses]);

  // Send consolidated notifications when any non-muted endpoint has warning or critical status
  // Respects consecutive check threshold and cooldown period
  useEffect(() => {
    if (!notificationsEnabled || averageLatency === null) return;

    let cancelled = false;
    const status = getLatencyStatus(averageLatency, thresholds);
    const now = Date.now();
    const cooldownMs = alertCooldown * 60 * 1000;

    // Only process if this is a new test result (latency value changed)
    const isNewTestResult = previousLatency.current !== averageLatency;
    previousLatency.current = averageLatency;

    if (!isNewTestResult) return;

    // Check if ANY non-muted endpoint has warning or critical status
    // This triggers alerts based on individual endpoint status, not just average
    if (hasNonMutedAlerts()) {
      // Increment consecutive high latency counter
      consecutiveHighLatencyCount.current += 1;

      console.log(`[useTrayIcon] High latency detected. Consecutive count: ${consecutiveHighLatencyCount.current}/${alertThreshold}`);

      const isCooldownExpired = now - lastNotificationTime.current >= cooldownMs;
      const meetsThreshold = consecutiveHighLatencyCount.current >= alertThreshold;

      // Only send notification if:
      // 1. Consecutive count meets or exceeds threshold
      // 2. Cooldown has expired since last notification
      if (meetsThreshold && isCooldownExpired) {
        const sendNotification = async (): Promise<void> => {
          if (cancelled) return;

          // Build consolidated notification with all affected endpoints
          const title = status === 'critical'
            ? 'Critical Latency Detected'
            : 'High Latency Warning';

          // Body includes all endpoints with their status
          const body = buildNotificationBody(averageLatency, status);

          console.log(`[useTrayIcon] Sending notification: ${title}`);

          const result = await safeInvoke(
            'send_notification',
            { title, body },
            ErrorCode.NOTIFICATION_FAILED
          );

          // Only update state if notification was sent successfully
          if (result !== null && !cancelled) {
            lastNotifiedStatus.current = status;
            lastNotificationTime.current = now;
            // Reset counter after notification is sent
            consecutiveHighLatencyCount.current = 0;
          }
        };

        sendNotification();
      }
    } else {
      // No non-muted endpoints with issues - reset notification state
      lastNotifiedStatus.current = null;
      // Reset consecutive counter when all endpoints are healthy
      consecutiveHighLatencyCount.current = 0;
    }

    return () => {
      cancelled = true;
    };
  }, [averageLatency, thresholds, notificationsEnabled, alertThreshold, alertCooldown, safeInvoke, buildNotificationBody, hasNonMutedAlerts]);

  // Listen for tray events with proper error handling
  useEffect(() => {
    let localIsMounted = true;
    const unlistenFunctions: Array<UnlistenFn> = [];

    const setupListeners = async (): Promise<void> => {
      const listeners = [
        { event: 'tray-pause-clicked', customEvent: 'tray-pause' },
        { event: 'tray-test-clicked', customEvent: 'tray-test' },
        { event: 'tray-settings-clicked', customEvent: 'tray-settings' },
      ];

      for (const { event, customEvent } of listeners) {
        if (!localIsMounted) return;

        try {
          const unlisten = await listen(event, () => {
            if (localIsMounted) {
              window.dispatchEvent(new CustomEvent(customEvent));
            }
          });

          if (localIsMounted) {
            unlistenFunctions.push(unlisten);
          } else {
            // Component unmounted while setting up, cleanup immediately
            unlisten();
          }
        } catch (error) {
          const parsedError = parseBackendError(error);
          console.error(`[useTrayIcon] Failed to setup listener for ${event}:`, {
            error: parsedError.message,
            code: parsedError.code,
          });

          // Store error for debugging
          lastError.current = {
            message: `Failed to setup listener: ${parsedError.message}`,
            code: ErrorCode.TAURI_INVOKE_FAILED,
            timestamp: Date.now(),
          };
        }
      }
    };

    setupListeners().catch((error) => {
      // Catch any unhandled promise rejections from setupListeners
      console.error('[useTrayIcon] Unhandled error in setupListeners:', error);
    });

    return () => {
      localIsMounted = false;
      // Cleanup all registered listeners synchronously
      unlistenFunctions.forEach((unlisten) => {
        try {
          unlisten();
        } catch (error) {
          // Ignore cleanup errors - component is unmounting anyway
          console.warn('[useTrayIcon] Error during listener cleanup:', error);
        }
      });
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
}
