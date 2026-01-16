import { useState } from 'react';
import { ArrowLeft, Settings, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { AppConfig, AppMode } from '../types';
import { cn } from '../lib/utils';
import { useSettingsSync } from '../hooks/useSettingsSync';
import { ModeSelector } from './settings/ModeSelector';
import { ThresholdSettings } from './settings/ThresholdSettings';
import { CustomEndpointManager } from './settings/CustomEndpointManager';
import { ModeEndpointList } from './settings/ModeEndpointList';
import { FSLogixSettings } from './settings/FSLogixSettings';

export function SettingsPanel() {
  const {
    config,
    modeInfo,
    setConfig,
    setCurrentView,
    triggerTestNow
  } = useAppStore();
  const { loadSettingsForMode } = useSettingsSync();

  // Collapsible section state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    general: false,
    endpoints: false,
    fslogix: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Safe threshold update with validation
  const handleThresholdChange = (field: 'excellent' | 'good' | 'warning', value: string) => {
    const numValue = parseInt(value) || 0;
    setConfig({
      thresholds: {
        ...config.thresholds,
        [field]: numValue,
      },
    });
  };

  // Handle mode change
  const handleModeChange = async (mode: AppMode) => {
    // Load settings for the new mode directly (bypasses race condition)
    // This also updates the config.mode in the store
    const success = await loadSettingsForMode(mode);
    if (success) {
      // Small delay to ensure React has processed the state updates
      // before triggering the test (endpoints need to be in the store)
      setTimeout(() => {
        triggerTestNow();
      }, 50);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setCurrentView('dashboard')}
          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Mode Selection */}
        <ModeSelector
          config={config}
          modeInfo={modeInfo}
          onModeChange={handleModeChange}
        />

        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                General
              </h3>
            </div>
            {collapsedSections.general ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {!collapsedSections.general && (
            <div className="px-4 pb-4 space-y-4">
              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select
                  value={config.theme}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'light' || value === 'dark' || value === 'nord' || value === 'cyberpunk' || value === 'system') {
                      setConfig({ theme: value satisfies AppConfig['theme'] });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="nord">Nord Dark</option>
                  <option value="cyberpunk">Cyberpunk</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Endpoint Monitoring Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => toggleSection('endpoints')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Endpoint Monitoring
              </h3>
            </div>
            {collapsedSections.endpoints ? (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {!collapsedSections.endpoints && (
            <div className="px-4 pb-4 space-y-4">
              {/* Test Interval */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Test Interval (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={config.testInterval}
                  onChange={(e) => setConfig({ testInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  How often to test endpoints (5-300 seconds)
                </p>
              </div>

              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Notifications
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Show notifications when latency exceeds thresholds
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig({ notificationsEnabled: !config.notificationsEnabled })
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    config.notificationsEnabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      config.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* Alert Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alert Threshold (consecutive checks)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.alertThreshold}
                  onChange={(e) => setConfig({ alertThreshold: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Number of consecutive high latency checks before showing a notification (1-10)
                </p>
              </div>

              {/* Alert Cooldown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alert Cooldown (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={config.alertCooldown}
                  onChange={(e) => setConfig({ alertCooldown: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum time between repeated alerts (1-60 minutes)
                </p>
              </div>

              {/* Graph Time Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Graph Time Range (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={config.graphTimeRange}
                  onChange={(e) => setConfig({ graphTimeRange: Math.max(1, Math.min(24, parseInt(e.target.value) || 1)) })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Time range of history shown in endpoint graphs (1-24 hours)
                </p>
              </div>

              {/* Latency Thresholds */}
              <ThresholdSettings
                thresholds={config.thresholds}
                onThresholdChange={handleThresholdChange}
              />

              {/* Custom Endpoints */}
              <CustomEndpointManager />

              {/* Mode Endpoints */}
              <ModeEndpointList modeInfo={modeInfo} />
            </div>
          )}
        </div>

        {/* FSLogix Settings - Only show in Session Host mode */}
        {config.mode === 'sessionhost' && (
          <FSLogixSettings
            isCollapsed={collapsedSections.fslogix}
            onToggle={() => toggleSection('fslogix')}
          />
        )}
      </div>
    </div>
  );
}
