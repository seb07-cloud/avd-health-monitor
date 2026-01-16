import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../useAppStore';
import { DEFAULT_CONFIG } from '../persistence';

// Mock Tauri invoke to prevent file system operations
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('configSlice', () => {
  beforeEach(() => {
    // Reset config slice state to defaults
    useAppStore.setState({
      config: { ...DEFAULT_CONFIG },
    });
  });

  describe('setConfig', () => {
    it('should update testInterval only', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({ testInterval: 20 });

      const state = useAppStore.getState();
      expect(state.config.testInterval).toBe(20);
    });

    it('should preserve existing config values when updating', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({ testInterval: 30 });

      const state = useAppStore.getState();
      // Other values should remain default
      expect(state.config.mode).toBe('sessionhost');
      expect(state.config.notificationsEnabled).toBe(true);
      expect(state.config.thresholds.excellent).toBe(30);
    });

    it('should update thresholds', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({
        thresholds: {
          excellent: 20,
          good: 60,
          warning: 120,
        },
      });

      const state = useAppStore.getState();
      expect(state.config.thresholds.excellent).toBe(20);
      expect(state.config.thresholds.good).toBe(60);
      expect(state.config.thresholds.warning).toBe(120);
    });

    it('should update mode', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({ mode: 'enduser' });

      const state = useAppStore.getState();
      expect(state.config.mode).toBe('enduser');
    });

    it('should update theme', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({ theme: 'dark' });

      const state = useAppStore.getState();
      expect(state.config.theme).toBe('dark');
    });

    it('should update multiple config values at once', () => {
      const { setConfig } = useAppStore.getState();
      setConfig({
        testInterval: 15,
        notificationsEnabled: false,
        autoStart: false,
      });

      const state = useAppStore.getState();
      expect(state.config.testInterval).toBe(15);
      expect(state.config.notificationsEnabled).toBe(false);
      expect(state.config.autoStart).toBe(false);
    });
  });
});
