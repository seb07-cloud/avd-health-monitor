import type { AppState } from '../store/types';
import { useAppStore } from '../store/useAppStore';

/**
 * Waits for a state condition to be met.
 * Uses Zustand's subscribe mechanism instead of polling/setTimeout.
 *
 * @param selector - Function to select the state slice to watch
 * @param predicate - Function that returns true when condition is met
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @returns Promise that resolves with the selected value when predicate is true
 */
export const waitForState = <T>(
  selector: (state: AppState) => T,
  predicate: (value: T) => boolean,
  timeoutMs = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Check current state first - avoids subscribe if already true
    const currentValue = selector(useAppStore.getState());
    if (predicate(currentValue)) {
      resolve(currentValue);
      return;
    }

    // Set up timeout
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('waitForState timed out'));
    }, timeoutMs);

    // Subscribe and wait for condition
    const unsub = useAppStore.subscribe((state) => {
      const value = selector(state);
      if (predicate(value)) {
        clearTimeout(timeout);
        unsub();
        resolve(value);
      }
    });
  });
};

/**
 * Convenience function to wait for endpoints to be loaded.
 * Resolves when endpoints array has more than 1 item (indicating mode endpoints loaded).
 *
 * @param timeoutMs - Maximum time to wait (default: 5000ms)
 * @returns Promise that resolves with endpoints when loaded
 */
export const waitForEndpointsLoaded = (timeoutMs = 5000) =>
  waitForState(
    (state) => state.endpoints,
    (endpoints) => endpoints.length > 1,
    timeoutMs
  );
