import { useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';
import type { SettingsResponse, AppConfig } from '../types';

/**
 * Hook to synchronize settings between the JSON file and the app store.
 * - Loads settings from JSON on app startup
 * - Settings are auto-saved by the store actions, no manual save needed
 */
export function useSettingsSync() {
  const { setConfig, setEndpoints, setModeInfo } = useAppStore();
  const isInitialized = useRef(false);

  // Helper to apply settings response to the store
  const applySettingsResponse = useCallback((response: SettingsResponse): void => {
    // Convert backend config (snake_case) to frontend config (camelCase)
    const frontendConfig: Partial<AppConfig> = {
      mode: response.config.mode,
      testInterval: response.config.testInterval,
      retentionDays: response.config.retentionDays,
      thresholds: response.config.thresholds,
      notificationsEnabled: response.config.notificationsEnabled,
      autoStart: response.config.autoStart,
      theme: response.config.theme as 'light' | 'dark' | 'system',
      alertThreshold: response.config.alertThreshold,
      alertCooldown: response.config.alertCooldown,
      graphTimeRange: response.config.graphTimeRange,
    };

    // Update store with settings from file
    setConfig(frontendConfig);

    // Set mode info (name, description, source)
    setModeInfo(response.modeInfo);

    // Set endpoints from the mode-specific JSON file (enabled/muted are stored directly in the file)
    setEndpoints(response.endpoints);

    // Restore history data from localStorage for the loaded endpoints
    useAppStore.getState().restoreHistoryForEndpoints(response.endpoints);
  }, [setConfig, setEndpoints, setModeInfo]);

  // Load settings from the backend JSON file (includes resolved endpoints from mode-specific JSON)
  const loadSettings = useCallback(async (): Promise<boolean> => {
    try {
      const response = await invoke<SettingsResponse>('read_settings_with_endpoints');
      applySettingsResponse(response);
      return true;
    } catch (error) {
      console.error('[useSettingsSync] Failed to load settings:', error);
      return false;
    }
  }, [applySettingsResponse]);

  // Load settings for a specific mode (bypasses race condition when switching modes)
  const loadSettingsForMode = useCallback(async (mode: 'sessionhost' | 'enduser'): Promise<boolean> => {
    try {
      const response = await invoke<SettingsResponse>('read_settings_for_mode', { mode });
      applySettingsResponse(response);
      return true;
    } catch (error) {
      console.error('[useSettingsSync] Failed to load settings for mode:', error);
      return false;
    }
  }, [applySettingsResponse]);

  // Get the current settings file path
  const getSettingsPath = useCallback(async (): Promise<string | null> => {
    try {
      return await invoke<string>('get_settings_file_path');
    } catch (error) {
      console.error('[useSettingsSync] Failed to get settings path:', error);
      return null;
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadSettings();
    }
  }, [loadSettings]);

  return {
    loadSettings,
    loadSettingsForMode,
    getSettingsPath,
  };
}
