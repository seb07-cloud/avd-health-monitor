import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';
import type { Endpoint, AppConfig, EndpointStatus, LatencyThresholds, EndpointError, ModeInfo, CustomEndpoint } from '../types';
import { getLatencyStatus } from '../lib/utils';
import { parseBackendError, getUserFriendlyErrorMessage } from '../errors';

// Helper to save settings (config + custom endpoints) to JSON file
const saveSettingsToFile = async (config: AppConfig, customEndpoints: CustomEndpoint[]): Promise<void> => {
  try {
    const settings = {
      version: 1,
      config,
      customEndpoints,
    };
    await invoke('write_settings_file', { settings });
  } catch (error) {
    console.error('[useAppStore] Failed to save settings to JSON:', error);
  }
};

// Helper to update endpoint state in the endpoint JSON file
const updateEndpointInFile = async (
  mode: string,
  endpointId: string,
  updates: {
    enabled?: boolean;
    muted?: boolean;
    name?: string;
    url?: string;
    port?: number;
  }
): Promise<void> => {
  try {
    await invoke('update_endpoint', { mode, endpointId, ...updates });
  } catch (error) {
    console.error('[useAppStore] Failed to update endpoint in file:', error);
  }
};

// Minimal fallback endpoint - real endpoints come from JSON files
const DEFAULT_ENDPOINTS: Endpoint[] = [
  {
    id: 'azure-login',
    name: 'Azure AD Authentication',
    url: 'login.microsoftonline.com',
    region: 'global',
    enabled: true,
    port: 443,
    protocol: 'tcp',
    category: 'Core AVD',
  },
];

const DEFAULT_THRESHOLDS: LatencyThresholds = {
  excellent: 30,
  good: 80,
  warning: 150,
};

const DEFAULT_CONFIG: AppConfig = {
  mode: 'sessionhost',
  testInterval: 10,
  retentionDays: 30,
  thresholds: DEFAULT_THRESHOLDS,
  notificationsEnabled: true,
  autoStart: true,
  theme: 'system',
  alertThreshold: 3,
  alertCooldown: 5,
  graphTimeRange: 1,
};

interface AppState {
  // Configuration
  config: AppConfig;
  endpoints: Endpoint[];
  customEndpoints: CustomEndpoint[];
  modeInfo: ModeInfo | null;

  // Status
  endpointStatuses: Map<string, EndpointStatus>;
  isMonitoring: boolean;
  isPaused: boolean;

  // UI State
  currentView: 'dashboard' | 'settings';

  // Flag to trigger immediate test (used after mode switch)
  pendingTestTrigger: boolean;

  // Actions
  setConfig: (config: Partial<AppConfig>) => void;
  setEndpoints: (endpoints: Endpoint[]) => void;
  setModeInfo: (modeInfo: ModeInfo) => void;
  updateEndpointEnabled: (id: string, enabled: boolean) => void;
  updateEndpointMuted: (id: string, muted: boolean) => void;
  updateModeEndpoint: (id: string, updates: { name?: string; url?: string; port?: number }) => void;
  triggerTestNow: () => void;
  clearTestTrigger: () => void;

  // Custom endpoint management
  addCustomEndpoint: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  updateCustomEndpoint: (id: string, updates: Partial<CustomEndpoint>) => void;
  removeCustomEndpoint: (id: string) => void;
  setCustomEndpoints: (endpoints: CustomEndpoint[]) => void;

  updateLatency: (endpointId: string, latency: number, success: boolean, error?: unknown) => void;
  setEndpointLoading: (endpointId: string, isLoading: boolean) => void;
  setAllEndpointsLoading: (isLoading: boolean) => void;
  clearEndpointError: (endpointId: string) => void;

  setMonitoring: (isMonitoring: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setCurrentView: (view: 'dashboard' | 'settings') => void;

  getEndpointStatus: (endpointId: string) => EndpointStatus | undefined;

  // Restore history for endpoints (used when loading endpoints from settings.json)
  restoreHistoryForEndpoints: (endpoints: Endpoint[]) => void;
}

// Storage key for localStorage
const STORAGE_KEY = 'avd-health-monitor-state';

// How long to keep history data (24 hours in milliseconds)
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;

// Serializable history entry for localStorage
interface SerializedHistory {
  [endpointId: string]: {
    history: Array<{ timestamp: number; latency: number }>;
    lastUpdated: number | null;
  };
}

// Persisted state interface (subset of AppState that we want to persist)
interface PersistedState {
  config: AppConfig;
  customEndpoints: CustomEndpoint[];
  historyData?: SerializedHistory;
}

// Helper to clean up history data older than 24 hours
const cleanupOldHistory = (
  history: Array<{ timestamp: number; latency: number }>
): Array<{ timestamp: number; latency: number }> => {
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  return history.filter((h) => h.timestamp > cutoff);
};

// Helper to serialize endpointStatuses Map to a plain object for localStorage
const serializeHistory = (statuses: Map<string, EndpointStatus>): SerializedHistory => {
  const result: SerializedHistory = {};
  statuses.forEach((status, endpointId) => {
    result[endpointId] = {
      history: cleanupOldHistory(status.history),
      lastUpdated: status.lastUpdated,
    };
  });
  return result;
};

// Helper to restore history from localStorage into endpointStatuses Map
const deserializeHistory = (
  historyData: SerializedHistory | undefined,
  endpoints: Endpoint[]
): Map<string, EndpointStatus> => {
  const statuses = new Map<string, EndpointStatus>();
  if (!historyData) return statuses;

  endpoints.forEach((endpoint) => {
    const saved = historyData[endpoint.id];
    if (saved && saved.history.length > 0) {
      const cleanedHistory = cleanupOldHistory(saved.history);
      if (cleanedHistory.length > 0) {
        statuses.set(endpoint.id, {
          endpoint,
          currentLatency: cleanedHistory[cleanedHistory.length - 1]?.latency ?? null,
          status: 'unknown',
          lastUpdated: saved.lastUpdated,
          history: cleanedHistory,
          error: null,
          isLoading: false,
        });
      }
    }
  });
  return statuses;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      config: DEFAULT_CONFIG,
      endpoints: DEFAULT_ENDPOINTS,
      customEndpoints: [],
      modeInfo: null,
      endpointStatuses: new Map(),
      isMonitoring: false,
      isPaused: false,
      currentView: 'dashboard',
      pendingTestTrigger: false,

      // Actions
      setConfig: (config) => {
        set((state) => ({
          config: { ...state.config, ...config },
        }));
        // Auto-save to JSON
        const state = get();
        saveSettingsToFile(state.config, state.customEndpoints);
      },

      setEndpoints: (endpoints) => {
        // Just set the endpoints - history restoration is handled by restoreHistoryForEndpoints
        // The endpointStatuses map is preserved to maintain history for endpoints that still exist
        set({ endpoints });
      },

      setModeInfo: (modeInfo) => {
        set({ modeInfo });
      },

      updateEndpointEnabled: (id, enabled) => {
        const state = get();
        const isCustom = state.customEndpoints.some((ep) => ep.id === id);

        set((state) => {
          // Update endpoint in state
          const endpoints = state.endpoints.map((ep) =>
            ep.id === id ? { ...ep, enabled } : ep
          );

          // Also update the endpoint reference in endpointStatuses
          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(id);
          if (currentStatus) {
            newStatuses.set(id, {
              ...currentStatus,
              endpoint: { ...currentStatus.endpoint, enabled },
            });
          }

          if (isCustom) {
            const customEndpoints = state.customEndpoints.map((ep) =>
              ep.id === id ? { ...ep, enabled } : ep
            );
            return { customEndpoints, endpoints, endpointStatuses: newStatuses };
          }

          return { endpoints, endpointStatuses: newStatuses };
        });

        // Save to appropriate file
        if (isCustom) {
          const newState = get();
          saveSettingsToFile(newState.config, newState.customEndpoints);
        } else {
          updateEndpointInFile(state.config.mode, id, { enabled });
        }
      },

      updateEndpointMuted: (id, muted) => {
        const state = get();

        set((state) => {
          // Update endpoint in state
          const endpoints = state.endpoints.map((ep) =>
            ep.id === id ? { ...ep, muted } : ep
          );

          // Also update the endpoint reference in endpointStatuses so tray icon hook sees the change
          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(id);
          if (currentStatus) {
            newStatuses.set(id, {
              ...currentStatus,
              endpoint: { ...currentStatus.endpoint, muted },
            });
          }

          return { endpoints, endpointStatuses: newStatuses };
        });

        // Save directly to endpoint JSON file
        updateEndpointInFile(state.config.mode, id, { muted });
      },

      updateModeEndpoint: (id, updates) => {
        const state = get();

        set((state) => {
          // Update endpoint in state
          const endpoints = state.endpoints.map((ep) =>
            ep.id === id ? { ...ep, ...updates } : ep
          );

          // Also update the endpoint reference in endpointStatuses
          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(id);
          if (currentStatus) {
            newStatuses.set(id, {
              ...currentStatus,
              endpoint: { ...currentStatus.endpoint, ...updates },
            });
          }

          return { endpoints, endpointStatuses: newStatuses };
        });

        // Save directly to endpoint JSON file
        updateEndpointInFile(state.config.mode, id, updates);
      },

      // Custom endpoint management
      addCustomEndpoint: (endpoint) => {
        const id = `custom-${crypto.randomUUID()}`;
        const newEndpoint: CustomEndpoint = {
          ...endpoint,
          id,
          category: endpoint.category || 'Custom',
        };

        set((state) => {
          const customEndpoints = [...state.customEndpoints, newEndpoint];
          // Also add to endpoints list
          const endpointForList: Endpoint = {
            id: newEndpoint.id,
            name: newEndpoint.name,
            url: newEndpoint.url,
            port: newEndpoint.port,
            protocol: newEndpoint.protocol,
            category: newEndpoint.category,
            enabled: newEndpoint.enabled,
            required: false,
            purpose: 'Custom endpoint',
          };
          const endpoints = [...state.endpoints, endpointForList];
          return { customEndpoints, endpoints };
        });

        // Auto-save to JSON
        const state = get();
        saveSettingsToFile(state.config, state.customEndpoints);
      },

      updateCustomEndpoint: (id, updates) => {
        set((state) => {
          const customEndpoints = state.customEndpoints.map((ep) =>
            ep.id === id ? { ...ep, ...updates } : ep
          );
          // Also update in endpoints list
          const endpoints = state.endpoints.map((ep) =>
            ep.id === id
              ? {
                  ...ep,
                  ...updates,
                  // Ensure these fields are properly mapped
                  name: updates.name ?? ep.name,
                  url: updates.url ?? ep.url,
                  port: updates.port ?? ep.port,
                  protocol: updates.protocol ?? ep.protocol,
                  category: updates.category ?? ep.category,
                  enabled: updates.enabled ?? ep.enabled,
                }
              : ep
          );
          return { customEndpoints, endpoints };
        });

        // Auto-save to JSON
        const state = get();
        saveSettingsToFile(state.config, state.customEndpoints);
      },

      removeCustomEndpoint: (id) => {
        set((state) => {
          const customEndpoints = state.customEndpoints.filter((ep) => ep.id !== id);
          const endpoints = state.endpoints.filter((ep) => ep.id !== id);
          // Also remove from statuses
          const newStatuses = new Map(state.endpointStatuses);
          newStatuses.delete(id);
          return { customEndpoints, endpoints, endpointStatuses: newStatuses };
        });

        // Auto-save to JSON
        const state = get();
        saveSettingsToFile(state.config, state.customEndpoints);
      },

      setCustomEndpoints: (customEndpoints) => {
        set({ customEndpoints });
      },

      updateLatency: (endpointId, latency, success, error?) =>
        set((state) => {
          const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
          if (!endpoint) return state;

          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(endpointId);
          const timestamp = Date.now();

          const newHistory = success
            ? [
                ...(currentStatus?.history || []).slice(-100),
                { timestamp, latency },
              ]
            : currentStatus?.history || [];

          let endpointError: EndpointError | null = null;
          if (!success && error) {
            const parsedError = parseBackendError(error, endpoint.url);
            endpointError = {
              message: parsedError.message,
              code: parsedError.code,
              timestamp,
              userMessage: getUserFriendlyErrorMessage(parsedError),
            };
          }

          const status: EndpointStatus = {
            endpoint,
            currentLatency: success ? latency : null,
            status: getLatencyStatus(success ? latency : null, state.config.thresholds),
            lastUpdated: timestamp,
            history: newHistory,
            error: success ? null : endpointError,
            isLoading: false,
          };

          newStatuses.set(endpointId, status);

          return {
            endpointStatuses: newStatuses,
          };
        }),

      setEndpointLoading: (endpointId, isLoading) =>
        set((state) => {
          const endpoint = state.endpoints.find((ep) => ep.id === endpointId);
          if (!endpoint) return state;

          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(endpointId);

          const status: EndpointStatus = currentStatus
            ? { ...currentStatus, isLoading }
            : {
                endpoint,
                currentLatency: null,
                status: 'unknown',
                lastUpdated: null,
                history: [],
                error: null,
                isLoading,
              };

          newStatuses.set(endpointId, status);

          return {
            endpointStatuses: newStatuses,
          };
        }),

      setAllEndpointsLoading: (isLoading) =>
        set((state) => {
          const newStatuses = new Map(state.endpointStatuses);

          for (const endpoint of state.endpoints.filter((ep) => ep.enabled)) {
            const currentStatus = newStatuses.get(endpoint.id);

            const status: EndpointStatus = currentStatus
              ? { ...currentStatus, isLoading }
              : {
                  endpoint,
                  currentLatency: null,
                  status: 'unknown',
                  lastUpdated: null,
                  history: [],
                  error: null,
                  isLoading,
                };

            newStatuses.set(endpoint.id, status);
          }

          return {
            endpointStatuses: newStatuses,
          };
        }),

      clearEndpointError: (endpointId) =>
        set((state) => {
          const newStatuses = new Map(state.endpointStatuses);
          const currentStatus = newStatuses.get(endpointId);

          if (currentStatus) {
            newStatuses.set(endpointId, { ...currentStatus, error: null });
          }

          return {
            endpointStatuses: newStatuses,
          };
        }),

      setMonitoring: (isMonitoring) => set({ isMonitoring }),
      setPaused: (isPaused) => set({ isPaused }),
      setCurrentView: (currentView) => set({ currentView }),
      triggerTestNow: () => set({ pendingTestTrigger: true }),
      clearTestTrigger: () => set({ pendingTestTrigger: false }),

      getEndpointStatus: (endpointId) => {
        const state = get();
        return state.endpointStatuses.get(endpointId);
      },

      restoreHistoryForEndpoints: (endpoints) =>
        set((state) => {
          const storageData = localStorage.getItem(STORAGE_KEY);
          if (!storageData) return state;

          try {
            const parsed = JSON.parse(storageData);
            const historyData = parsed?.state?.historyData as SerializedHistory | undefined;
            if (!historyData) return state;

            const newStatuses = new Map(state.endpointStatuses);

            endpoints.forEach((endpoint) => {
              const savedHistory = historyData[endpoint.id];
              const currentStatus = newStatuses.get(endpoint.id);

              if (savedHistory && savedHistory.history.length > 0) {
                const cleanedHistory = cleanupOldHistory(savedHistory.history);
                if (cleanedHistory.length > 0) {
                  newStatuses.set(endpoint.id, {
                    endpoint,
                    currentLatency: currentStatus?.currentLatency ?? cleanedHistory[cleanedHistory.length - 1]?.latency ?? null,
                    status: currentStatus?.status ?? 'unknown',
                    lastUpdated: currentStatus?.lastUpdated ?? savedHistory.lastUpdated,
                    history: currentStatus?.history?.length ? currentStatus.history : cleanedHistory,
                    error: currentStatus?.error ?? null,
                    isLoading: currentStatus?.isLoading ?? false,
                  });
                }
              }
            });

            return { endpointStatuses: newStatuses };
          } catch (error) {
            console.error('[useAppStore] Failed to restore history:', error);
            return state;
          }
        }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        config: state.config,
        customEndpoints: state.customEndpoints,
        historyData: serializeHistory(state.endpointStatuses),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState | undefined;
        return {
          ...currentState,
          config: persisted?.config
            ? { ...DEFAULT_CONFIG, ...persisted.config }
            : currentState.config,
          customEndpoints: persisted?.customEndpoints ?? [],
          endpoints: currentState.endpoints,
          endpointStatuses: persisted?.historyData
            ? deserializeHistory(persisted.historyData, currentState.endpoints)
            : currentState.endpointStatuses,
        };
      },
      version: 9,
      migrate: (persistedState, version) => {
        const state = persistedState as PersistedState;
        if (version < 9) {
          // Migration to v9: Remove endpoint overrides (now stored in endpoint JSON files)
          return {
            config: { ...DEFAULT_CONFIG, ...(state.config || {}) },
            customEndpoints: state.customEndpoints || [],
            historyData: state.historyData || {},
          };
        }
        return state;
      },
    }
  )
);
