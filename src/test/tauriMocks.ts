// Centralized Tauri mock setup for settings commands
// Source: https://v2.tauri.app/develop/tests/mocking/
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';

/**
 * Mock settings response matching SettingsResponse interface
 */
export const mockSettingsResponse = {
  version: 1,
  config: {
    mode: 'sessionhost' as const,
    testInterval: 10,
    retentionDays: 30,
    thresholds: {
      excellent: 30,
      good: 80,
      warning: 150,
    },
    notificationsEnabled: true,
    autoStart: true,
    theme: 'system' as const,
    alertThreshold: 3,
    alertCooldown: 5,
    graphTimeRange: 1,
    fslogixEnabled: true,
    fslogixTestInterval: 60,
    fslogixAlertThreshold: 3,
    fslogixAlertCooldown: 5,
  },
  endpoints: [
    {
      id: 'azure-login',
      name: 'Azure AD Authentication',
      url: 'login.microsoftonline.com',
      region: 'global',
      enabled: true,
      port: 443,
      protocol: 'tcp' as const,
      category: 'Core AVD',
      required: true,
      purpose: 'Azure AD authentication',
    },
  ],
  modeInfo: {
    name: 'Session Host Mode',
    description: 'For AVD session host VMs',
  },
};

/**
 * Setup Tauri IPC mocks for settings-related commands
 */
export function setupTauriMocks(): void {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'read_settings_with_endpoints':
        return mockSettingsResponse;
      case 'read_settings_for_mode': {
        const typedArgs = args as { mode?: string };
        return {
          ...mockSettingsResponse,
          config: {
            ...mockSettingsResponse.config,
            mode: typedArgs.mode || mockSettingsResponse.config.mode,
          },
        };
      }
      case 'write_settings_file':
        return undefined; // Success
      case 'update_endpoint':
        return undefined; // Success
      case 'update_fslogix_path_muted':
        return undefined; // Success
      default:
        // Let unknown commands pass through (may be handled by global setup)
        return undefined;
    }
  });
}

/**
 * Cleanup Tauri IPC mocks
 */
export function cleanupTauriMocks(): void {
  clearMocks();
}
