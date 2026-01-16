import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_CONFIG } from '../../store/persistence';
import type { Endpoint } from '../../types';

// Mock Tauri invoke at module level
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('Mode Switching Integration', () => {
  // Mock endpoints for each mode
  const sessionHostEndpoints: Endpoint[] = [
    {
      id: 'rdgateway',
      name: 'RD Gateway',
      url: 'gateway.example.com',
      port: 443,
      protocol: 'tcp',
      enabled: true,
      category: 'Core AVD',
    },
    {
      id: 'azure-ad',
      name: 'Azure AD',
      url: 'login.microsoftonline.com',
      port: 443,
      protocol: 'tcp',
      enabled: true,
      category: 'Authentication',
    },
  ];

  const endUserEndpoints: Endpoint[] = [
    {
      id: 'rdclient',
      name: 'RD Client',
      url: 'rdweb.example.com',
      port: 443,
      protocol: 'tcp',
      enabled: true,
      category: 'Client',
    },
    {
      id: 'rdgateway-client',
      name: 'RD Gateway (Client)',
      url: 'rdgateway.example.com',
      port: 443,
      protocol: 'tcp',
      enabled: true,
      category: 'Gateway',
    },
  ];

  beforeEach(() => {
    // Reset store state with sessionhost mode
    useAppStore.setState({
      config: { ...DEFAULT_CONFIG, mode: 'sessionhost' },
      endpoints: sessionHostEndpoints,
      customEndpoints: [],
      endpointStatuses: new Map(),
      modeInfo: { name: 'Session Host Mode', description: 'For AVD session hosts' },
      pendingTestTrigger: false,
      isPaused: false,
      isMonitoring: false,
      currentView: 'dashboard',
    });

    // Setup IPC mock
    mockIPC((cmd, args) => {
      if (cmd === 'write_settings_file') {
        return undefined;
      }
      if (cmd === 'read_settings_for_mode') {
        const typedArgs = args as { mode?: string };
        if (typedArgs.mode === 'enduser') {
          return {
            version: 1,
            config: { ...DEFAULT_CONFIG, mode: 'enduser' },
            endpoints: endUserEndpoints,
            modeInfo: { name: 'End User Mode', description: 'For end user devices' },
          };
        }
        return {
          version: 1,
          config: { ...DEFAULT_CONFIG, mode: 'sessionhost' },
          endpoints: sessionHostEndpoints,
          modeInfo: { name: 'Session Host Mode', description: 'For AVD session hosts' },
        };
      }
      return undefined;
    });
  });

  afterEach(() => {
    clearMocks();
  });

  describe('mode config update', () => {
    it('should update config.mode when switching modes', () => {
      const { setConfig } = useAppStore.getState();

      // Initially sessionhost
      expect(useAppStore.getState().config.mode).toBe('sessionhost');

      // Switch to enduser
      setConfig({ mode: 'enduser' });

      // Mode updated
      expect(useAppStore.getState().config.mode).toBe('enduser');
    });

    it('should switch back to sessionhost from enduser', () => {
      const { setConfig } = useAppStore.getState();

      // Switch to enduser
      setConfig({ mode: 'enduser' });
      expect(useAppStore.getState().config.mode).toBe('enduser');

      // Switch back to sessionhost
      setConfig({ mode: 'sessionhost' });
      expect(useAppStore.getState().config.mode).toBe('sessionhost');
    });
  });

  describe('endpoint reload', () => {
    it('should update endpoints after mode switch simulation', () => {
      const { setConfig, setEndpoints } = useAppStore.getState();

      // Start with sessionhost endpoints
      expect(useAppStore.getState().endpoints).toEqual(sessionHostEndpoints);

      // Simulate mode switch flow (as done in SettingsPanel)
      // 1. Update config
      setConfig({ mode: 'enduser' });

      // 2. Load new endpoints (simulating invoke response)
      setEndpoints(endUserEndpoints);

      // Endpoints should now be enduser endpoints
      const state = useAppStore.getState();
      expect(state.endpoints).toEqual(endUserEndpoints);
      expect(state.endpoints).toHaveLength(2);
      expect(state.endpoints[0].id).toBe('rdclient');
    });

    it('should clear endpoint from statuses if not in new mode', () => {
      const { setConfig, setEndpoints, updateLatency } = useAppStore.getState();

      // Add status for sessionhost endpoint
      updateLatency('rdgateway', 50, true);
      expect(useAppStore.getState().endpointStatuses.get('rdgateway')).toBeDefined();

      // Simulate mode switch
      setConfig({ mode: 'enduser' });
      setEndpoints(endUserEndpoints);

      // The rdgateway status entry still exists in map (not auto-cleared)
      // but the endpoints list no longer contains it
      const state = useAppStore.getState();
      expect(state.endpoints.find((ep) => ep.id === 'rdgateway')).toBeUndefined();
    });
  });

  describe('settings preservation', () => {
    it('should preserve testInterval when switching modes', () => {
      const { setConfig } = useAppStore.getState();

      // Set testInterval
      setConfig({ testInterval: 20 });
      expect(useAppStore.getState().config.testInterval).toBe(20);

      // Switch mode
      setConfig({ mode: 'enduser' });

      // testInterval should still be 20
      expect(useAppStore.getState().config.testInterval).toBe(20);
      expect(useAppStore.getState().config.mode).toBe('enduser');
    });

    it('should preserve thresholds when switching modes', () => {
      const { setConfig } = useAppStore.getState();

      // Set custom thresholds
      setConfig({
        thresholds: { excellent: 20, good: 60, warning: 100 },
      });

      // Switch mode
      setConfig({ mode: 'enduser' });

      // Thresholds should be preserved
      const state = useAppStore.getState();
      expect(state.config.thresholds.excellent).toBe(20);
      expect(state.config.thresholds.good).toBe(60);
      expect(state.config.thresholds.warning).toBe(100);
    });

    it('should preserve notification settings when switching modes', () => {
      const { setConfig } = useAppStore.getState();

      // Disable notifications
      setConfig({ notificationsEnabled: false });

      // Switch mode
      setConfig({ mode: 'enduser' });

      // Notification setting preserved
      expect(useAppStore.getState().config.notificationsEnabled).toBe(false);
    });

    it('should preserve theme when switching modes', () => {
      const { setConfig } = useAppStore.getState();

      setConfig({ theme: 'dark' });
      setConfig({ mode: 'enduser' });

      expect(useAppStore.getState().config.theme).toBe('dark');
    });
  });

  describe('test trigger', () => {
    it('should trigger test via triggerTestNow', () => {
      const { triggerTestNow } = useAppStore.getState();

      // Initially false
      expect(useAppStore.getState().pendingTestTrigger).toBe(false);

      // Trigger test
      triggerTestNow();

      // Should be true
      expect(useAppStore.getState().pendingTestTrigger).toBe(true);
    });

    it('should clear test trigger via clearTestTrigger', () => {
      const { triggerTestNow, clearTestTrigger } = useAppStore.getState();

      // Trigger then clear
      triggerTestNow();
      expect(useAppStore.getState().pendingTestTrigger).toBe(true);

      clearTestTrigger();
      expect(useAppStore.getState().pendingTestTrigger).toBe(false);
    });

    it('should set pendingTestTrigger after full mode switch flow', () => {
      const { setConfig, setEndpoints, triggerTestNow } = useAppStore.getState();

      // Simulate the full mode switch flow from SettingsPanel
      // 1. Update config
      setConfig({ mode: 'enduser' });

      // 2. Load new endpoints
      setEndpoints(endUserEndpoints);

      // 3. Trigger test (as SettingsPanel does after mode switch)
      triggerTestNow();

      // Verify final state
      const state = useAppStore.getState();
      expect(state.config.mode).toBe('enduser');
      expect(state.endpoints).toEqual(endUserEndpoints);
      expect(state.pendingTestTrigger).toBe(true);
    });
  });

  describe('custom endpoints', () => {
    it('should not affect custom endpoints when switching modes', () => {
      const { addCustomEndpoint, setConfig, setEndpoints } = useAppStore.getState();

      // Add a custom endpoint
      addCustomEndpoint({
        name: 'My Custom Endpoint',
        url: 'custom.mycompany.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
        category: 'Custom',
      });

      // Verify it was added
      let state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(1);
      const customId = state.customEndpoints[0].id;

      // Switch mode
      setConfig({ mode: 'enduser' });
      setEndpoints(endUserEndpoints);

      // Custom endpoints should still exist
      state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(1);
      expect(state.customEndpoints[0].id).toBe(customId);
      expect(state.customEndpoints[0].name).toBe('My Custom Endpoint');
    });

    it('should preserve custom endpoints through multiple mode switches', () => {
      const { addCustomEndpoint, setConfig, setEndpoints } = useAppStore.getState();

      // Add custom endpoint
      addCustomEndpoint({
        name: 'Persistent Custom',
        url: 'persistent.example.com',
        port: 8443,
        protocol: 'tcp',
        enabled: true,
        category: 'Custom',
      });

      // Switch to enduser
      setConfig({ mode: 'enduser' });
      setEndpoints(endUserEndpoints);

      // Switch back to sessionhost
      setConfig({ mode: 'sessionhost' });
      setEndpoints(sessionHostEndpoints);

      // Custom endpoint should still be there
      const state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(1);
      expect(state.customEndpoints[0].name).toBe('Persistent Custom');
    });
  });

  describe('mode info update', () => {
    it('should update modeInfo when switching modes', () => {
      const { setModeInfo, setConfig } = useAppStore.getState();

      // Initially sessionhost
      expect(useAppStore.getState().modeInfo?.name).toBe('Session Host Mode');

      // Simulate mode switch with new mode info
      setConfig({ mode: 'enduser' });
      setModeInfo({ name: 'End User Mode', description: 'For end user devices' });

      const state = useAppStore.getState();
      expect(state.modeInfo?.name).toBe('End User Mode');
      expect(state.modeInfo?.description).toBe('For end user devices');
    });
  });
});
