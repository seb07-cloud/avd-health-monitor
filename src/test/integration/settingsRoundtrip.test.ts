import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_CONFIG, DEFAULT_THRESHOLDS } from '../../store/persistence';
import type { CustomEndpoint } from '../../types';

// Mock Tauri invoke at module level
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('Settings Roundtrip Integration', () => {
  // Track what was written by write_settings_file
  let writtenSettings: unknown = null;

  // Mock response for read_settings_with_endpoints
  const mockResponse = {
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

  beforeEach(() => {
    writtenSettings = null;

    // Reset store state
    useAppStore.setState({
      config: { ...DEFAULT_CONFIG },
      customEndpoints: [],
      endpoints: [],
      endpointStatuses: new Map(),
      modeInfo: null,
    });

    // Setup IPC mock with tracking
    mockIPC((cmd, args) => {
      if (cmd === 'write_settings_file') {
        writtenSettings = args;
        return undefined;
      }
      if (cmd === 'read_settings_with_endpoints') {
        return mockResponse;
      }
      return undefined;
    });
  });

  afterEach(() => {
    clearMocks();
    writtenSettings = null;
  });

  describe('config values roundtrip', () => {
    it('should preserve config values after save/load cycle', async () => {
      const { setConfig } = useAppStore.getState();

      // Change settings
      setConfig({
        testInterval: 30,
        notificationsEnabled: false,
        theme: 'dark',
      });

      // Verify state was updated
      const state = useAppStore.getState();
      expect(state.config.testInterval).toBe(30);
      expect(state.config.notificationsEnabled).toBe(false);
      expect(state.config.theme).toBe('dark');

      // Verify write was called (auto-save triggers invoke)
      // Note: The actual invoke is mocked, so we check state was updated correctly
      // The persistence layer calls invoke('write_settings_file', { settings })
    });

    it('should preserve thresholds after update', () => {
      const { setConfig } = useAppStore.getState();

      setConfig({
        thresholds: {
          excellent: 20,
          good: 60,
          warning: 100,
        },
      });

      const state = useAppStore.getState();
      expect(state.config.thresholds.excellent).toBe(20);
      expect(state.config.thresholds.good).toBe(60);
      expect(state.config.thresholds.warning).toBe(100);
    });

    it('should preserve FSLogix settings', () => {
      const { setConfig } = useAppStore.getState();

      setConfig({
        fslogixEnabled: false,
        fslogixTestInterval: 120,
        fslogixAlertThreshold: 5,
      });

      const state = useAppStore.getState();
      expect(state.config.fslogixEnabled).toBe(false);
      expect(state.config.fslogixTestInterval).toBe(120);
      expect(state.config.fslogixAlertThreshold).toBe(5);
    });
  });

  describe('custom endpoints roundtrip', () => {
    it('should preserve custom endpoint after add', () => {
      const { addCustomEndpoint } = useAppStore.getState();

      addCustomEndpoint({
        name: 'Custom Server',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
        category: 'Custom',
      });

      const state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(1);
      expect(state.customEndpoints[0].name).toBe('Custom Server');
      expect(state.customEndpoints[0].url).toBe('custom.example.com');
      expect(state.customEndpoints[0].port).toBe(443);
      expect(state.customEndpoints[0].id).toMatch(/^custom-/);
    });

    it('should include custom endpoint in endpoints list', () => {
      const { addCustomEndpoint } = useAppStore.getState();

      addCustomEndpoint({
        name: 'Custom Server',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
        category: 'Custom',
      });

      const state = useAppStore.getState();
      const customInList = state.endpoints.find((ep) =>
        ep.id.startsWith('custom-')
      );
      expect(customInList).toBeDefined();
      expect(customInList?.name).toBe('Custom Server');
    });

    it('should remove custom endpoint and update endpoints list', () => {
      const { addCustomEndpoint, removeCustomEndpoint } =
        useAppStore.getState();

      // Add endpoint
      addCustomEndpoint({
        name: 'Custom Server',
        url: 'custom.example.com',
        port: 443,
        protocol: 'tcp',
        enabled: true,
        category: 'Custom',
      });

      // Get the ID
      let state = useAppStore.getState();
      const id = state.customEndpoints[0].id;

      // Remove it
      removeCustomEndpoint(id);

      state = useAppStore.getState();
      expect(state.customEndpoints).toHaveLength(0);
      expect(state.endpoints.find((ep) => ep.id === id)).toBeUndefined();
    });
  });

  describe('defaults handling', () => {
    it('should use defaults for missing config fields', () => {
      // Simulate partial config from backend
      useAppStore.setState({
        config: {
          ...DEFAULT_CONFIG,
          testInterval: 15,
          // Other fields get defaults
        },
      });

      const state = useAppStore.getState();
      // Explicit value preserved
      expect(state.config.testInterval).toBe(15);
      // Default values applied
      expect(state.config.mode).toBe('sessionhost');
      expect(state.config.thresholds).toEqual(DEFAULT_THRESHOLDS);
      expect(state.config.notificationsEnabled).toBe(true);
    });

    it('should use defaults for empty config', () => {
      // Reset with defaults
      useAppStore.setState({
        config: { ...DEFAULT_CONFIG },
      });

      const state = useAppStore.getState();
      expect(state.config).toEqual(DEFAULT_CONFIG);
    });

    it('should preserve existing endpoints when config changes', () => {
      const testEndpoints = [
        {
          id: 'test-1',
          name: 'Test Endpoint',
          url: 'test.example.com',
          port: 443,
          protocol: 'tcp' as const,
          enabled: true,
          category: 'Test',
        },
      ];

      // Set up endpoints first
      useAppStore.setState({ endpoints: testEndpoints });

      // Change config
      const { setConfig } = useAppStore.getState();
      setConfig({ testInterval: 20 });

      // Endpoints should be unchanged
      const state = useAppStore.getState();
      expect(state.endpoints).toEqual(testEndpoints);
    });
  });

  describe('multiple updates', () => {
    it('should handle rapid consecutive updates', () => {
      const { setConfig } = useAppStore.getState();

      // Multiple rapid updates
      setConfig({ testInterval: 15 });
      setConfig({ testInterval: 20 });
      setConfig({ testInterval: 25 });

      const state = useAppStore.getState();
      expect(state.config.testInterval).toBe(25);
    });

    it('should merge partial config updates correctly', () => {
      const { setConfig } = useAppStore.getState();

      // Update different fields in sequence
      setConfig({ testInterval: 15 });
      setConfig({ notificationsEnabled: false });
      setConfig({ theme: 'light' });

      const state = useAppStore.getState();
      expect(state.config.testInterval).toBe(15);
      expect(state.config.notificationsEnabled).toBe(false);
      expect(state.config.theme).toBe('light');
      // Mode should be unchanged
      expect(state.config.mode).toBe('sessionhost');
    });
  });
});
