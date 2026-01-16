import { invoke } from '@tauri-apps/api/core';
import type {
  AppConfig,
  CustomEndpoint,
  Endpoint,
  EndpointStatus,
  LatencyThresholds,
} from '../../types';

// Storage key - DO NOT CHANGE to preserve user data
export const STORAGE_KEY = 'avd-health-monitor-state';

// How long to keep history data (24 hours in milliseconds)
export const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;

// Default latency thresholds
export const DEFAULT_THRESHOLDS: LatencyThresholds = {
  excellent: 30,
  good: 80,
  warning: 150,
};

// Default application configuration
export const DEFAULT_CONFIG: AppConfig = {
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
  fslogixEnabled: true,
  fslogixTestInterval: 60,
  fslogixAlertThreshold: 3,
  fslogixAlertCooldown: 5,
};

// Minimal fallback endpoint - real endpoints come from JSON files
export const DEFAULT_ENDPOINTS: Endpoint[] = [
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

// Serializable history entry for localStorage
export interface SerializedHistory {
  [endpointId: string]: {
    history: Array<{ timestamp: number; latency: number }>;
    lastUpdated: number | null;
  };
}

// Persisted state interface (subset of AppState that we want to persist)
export interface PersistedState {
  config: AppConfig;
  customEndpoints: CustomEndpoint[];
  historyData?: SerializedHistory;
}

// Helper to clean up history data older than 24 hours
export const cleanupOldHistory = (
  history: Array<{ timestamp: number; latency: number }>
): Array<{ timestamp: number; latency: number }> => {
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  return history.filter((h) => h.timestamp > cutoff);
};

// Helper to serialize endpointStatuses Map to a plain object for localStorage
export const serializeHistory = (
  statuses: Map<string, EndpointStatus>
): SerializedHistory => {
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
export const deserializeHistory = (
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

// Helper to save settings (config + custom endpoints) to JSON file
export const saveSettingsToFile = async (
  config: AppConfig,
  customEndpoints: CustomEndpoint[]
): Promise<void> => {
  try {
    const settings = {
      version: 1,
      config,
      customEndpoints,
    };
    await invoke('write_settings_file', { settings });
  } catch (error) {
    console.error('[persistence] Failed to save settings to JSON:', error);
  }
};

// Helper to update endpoint state in the endpoint JSON file
export const updateEndpointInFile = async (
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
    console.error('[persistence] Failed to update endpoint in file:', error);
  }
};

// Migration function for persist middleware
// Handles version upgrades while preserving user data
export const handleMigration = (
  persistedState: unknown,
  version: number
): PersistedState => {
  const state = persistedState as PersistedState;

  if (version < 10) {
    // Migration from v9 to v10 (slice refactor)
    // State structure is compatible, just ensure defaults are applied
    return {
      config: { ...DEFAULT_CONFIG, ...(state.config || {}) },
      customEndpoints: state.customEndpoints || [],
      historyData: state.historyData || {},
    };
  }

  return state;
};
