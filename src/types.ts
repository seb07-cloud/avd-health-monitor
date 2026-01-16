// Re-exported from Rust-generated types (source of truth)
export type { LatencyThresholds, AppConfig, AppMode, Theme } from './generated/bindings';

// Import for use in this file's interfaces
import type { AppConfig } from './generated/bindings';

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  region?: string;
  enabled: boolean;
  muted?: boolean; // If true, endpoint is monitored but alerts are suppressed
  port?: number; // Default: 443 for TCP
  protocol?: 'tcp' | 'http' | 'https'; // Default: 'tcp'
  category?: string; // For grouping endpoints (e.g., 'Core AVD', 'Monitoring', 'Certificates')
  required?: boolean; // Whether this endpoint is required or optional
  purpose?: string; // Description of what this endpoint is for
  latencyCritical?: boolean; // If true, show latency in ms; if false, just show reachable/unreachable
  wildcardPattern?: string; // If set, this is a wildcard endpoint (e.g., "*.wvd.microsoft.com")
  knownSubdomains?: string[]; // Known subdomains to test for wildcard endpoints
}

// Mode information from the loaded endpoint file
export interface ModeInfo {
  name: string;
  description?: string;
  source?: string;
}

export interface LatencyResult {
  endpointId: string;
  latency: number;
  timestamp: number;
  success: boolean;
  error?: string;
  errorCode?: string;
}

// Error state for endpoint testing
export interface EndpointError {
  message: string;
  code: string;
  timestamp: number;
  userMessage: string; // User-friendly error message
}

// Custom endpoint added by user (stored in settings.json)
export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  port?: number;
  protocol?: 'tcp' | 'http' | 'https';
  category?: string;
  enabled: boolean;
  latencyCritical?: boolean; // If true, show latency in ms; if false, just show reachable/unreachable
}

// JSON settings file structure (stored on disk)
export interface SettingsFile {
  version: number;
  config: AppConfig;
  customEndpoints?: CustomEndpoint[];
}

// Response from read_settings_with_endpoints (includes resolved endpoints)
export interface SettingsResponse {
  version: number;
  config: AppConfig;
  endpoints: Endpoint[];
  modeInfo: ModeInfo;
}

export interface LatencyHistory {
  endpointId: string;
  data: Array<{
    timestamp: number;
    latency: number;
  }>;
}

export type LatencyStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';

export interface EndpointStatus {
  endpoint: Endpoint;
  currentLatency: number | null;
  status: LatencyStatus;
  lastUpdated: number | null;
  history: LatencyHistory['data'];
  error: EndpointError | null; // Current error state if test failed
  isLoading: boolean; // Whether a test is currently running
}

// FSLogix Storage Path from Windows Registry
export interface FSLogixPath {
  id: string;
  type: 'profile' | 'odfc';
  path: string;
  hostname: string;
  port: number;
  muted?: boolean; // If true, alerts are suppressed for this path
}

// FSLogix connectivity status
export interface FSLogixStatus {
  path: FSLogixPath;
  reachable: boolean;
  latency: number | null;
  error: string | null;
  isLoading: boolean;
  lastUpdated: number | null;
  consecutiveFailures: number; // Track consecutive failures for alerting
}
