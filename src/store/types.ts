import type {
  AppConfig,
  CustomEndpoint,
  Endpoint,
  EndpointStatus,
  FSLogixPath,
  FSLogixStatus,
  ModeInfo,
} from '../types';

/**
 * Configuration slice - manages app settings
 */
export interface ConfigSlice {
  config: AppConfig;
  setConfig: (config: Partial<AppConfig>) => void;
}

/**
 * Endpoint slice - manages endpoints, custom endpoints, and their statuses
 */
export interface EndpointSlice {
  endpoints: Endpoint[];
  customEndpoints: CustomEndpoint[];
  modeInfo: ModeInfo | null;
  endpointStatuses: Map<string, EndpointStatus>;

  // Endpoint list management
  setEndpoints: (endpoints: Endpoint[]) => void;
  setModeInfo: (modeInfo: ModeInfo) => void;

  // Endpoint property updates
  updateEndpointEnabled: (id: string, enabled: boolean) => void;
  updateEndpointMuted: (id: string, muted: boolean) => void;
  updateModeEndpoint: (
    id: string,
    updates: { name?: string; url?: string; port?: number }
  ) => void;

  // Custom endpoint management
  addCustomEndpoint: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  updateCustomEndpoint: (id: string, updates: Partial<CustomEndpoint>) => void;
  removeCustomEndpoint: (id: string) => void;
  setCustomEndpoints: (endpoints: CustomEndpoint[]) => void;

  // Latency and status updates
  updateLatency: (
    endpointId: string,
    latency: number,
    success: boolean,
    error?: unknown
  ) => void;
  setEndpointLoading: (endpointId: string, isLoading: boolean) => void;
  setAllEndpointsLoading: (isLoading: boolean) => void;
  clearEndpointError: (endpointId: string) => void;

  // Status accessors
  getEndpointStatus: (endpointId: string) => EndpointStatus | undefined;

  // History restoration
  restoreHistoryForEndpoints: (endpoints: Endpoint[]) => void;
}

/**
 * FSLogix slice - manages FSLogix storage paths and their statuses
 */
export interface FslogixSlice {
  fslogixPaths: FSLogixPath[];
  fslogixStatuses: Map<string, FSLogixStatus>;

  // Path management
  setFSLogixPaths: (paths: FSLogixPath[]) => void;

  // Status updates
  updateFSLogixStatus: (
    pathId: string,
    reachable: boolean,
    latency: number | null,
    error: string | null
  ) => void;
  setFSLogixLoading: (pathId: string, isLoading: boolean) => void;
  setAllFSLogixLoading: (isLoading: boolean) => void;

  // Path property updates
  updateFSLogixPathMuted: (pathId: string, muted: boolean) => void;
}

/**
 * UI slice - manages view state, monitoring flags, and triggers
 */
export interface UiSlice {
  currentView: 'dashboard' | 'settings';
  isMonitoring: boolean;
  isPaused: boolean;
  pendingTestTrigger: boolean;
  isOffline: boolean;
  lastOnlineTimestamp: number | null;

  // View management
  setCurrentView: (view: 'dashboard' | 'settings') => void;

  // Monitoring state
  setMonitoring: (isMonitoring: boolean) => void;
  setPaused: (isPaused: boolean) => void;

  // Offline state
  setOffline: (isOffline: boolean) => void;

  // Test trigger (used after mode switch)
  triggerTestNow: () => void;
  clearTestTrigger: () => void;
}

/**
 * Combined application state - all slices merged
 */
export type AppState = ConfigSlice & EndpointSlice & FslogixSlice & UiSlice;
