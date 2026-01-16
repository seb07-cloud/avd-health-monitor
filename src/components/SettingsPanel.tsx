import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, XCircle, Plus, Trash2, Edit2, Check, X, Loader2, Wifi, BellOff, Bell, HardDrive, FolderOpen, Settings, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { AppConfig, AppMode, CustomEndpoint } from '../types';
import { cn, validateEndpointUrl } from '../lib/utils';
import { useSettingsSync } from '../hooks/useSettingsSync';
import { ModeSelector } from './settings/ModeSelector';
import { ThresholdSettings } from './settings/ThresholdSettings';

export function SettingsPanel() {
  const {
    config,
    endpoints,
    customEndpoints,
    modeInfo,
    fslogixPaths,
    setConfig,
    updateEndpointEnabled,
    updateEndpointMuted,
    updateModeEndpoint,
    addCustomEndpoint,
    updateCustomEndpoint,
    removeCustomEndpoint,
    setCurrentView,
    triggerTestNow
  } = useAppStore();
  const { loadSettingsForMode } = useSettingsSync();

  // New custom endpoint form state
  const [newEndpoint, setNewEndpoint] = useState<Partial<CustomEndpoint>>({
    name: '',
    url: '',
    port: 443,
    protocol: 'tcp',
    enabled: true,
  });
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency?: number; error?: string } | null>(null);

  // Edit mode state for custom endpoints
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomEndpoint>>({});

  // Edit mode state for mode endpoints
  const [editingModeEndpointId, setEditingModeEndpointId] = useState<string | null>(null);
  const [modeEndpointEditForm, setModeEndpointEditForm] = useState<{ name: string; url: string; port: number }>({ name: '', url: '', port: 443 });

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

  // Test connection to endpoint
  const handleTestConnection = async () => {
    if (!newEndpoint.url) {
      setUrlError('Please enter a URL first');
      return;
    }

    const validationError = validateEndpointUrl(newEndpoint.url);
    if (validationError) {
      setUrlError(validationError);
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setUrlError(null);

    try {
      const latency = await invoke<number>('test_latency', {
        endpoint: newEndpoint.url,
        port: newEndpoint.port || 443,
        protocol: newEndpoint.protocol || 'tcp',
      });
      setTestResult({ success: true, latency });
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Add new custom endpoint
  const handleAddEndpoint = () => {
    if (!newEndpoint.name || !newEndpoint.url) return;

    const validationError = validateEndpointUrl(newEndpoint.url);
    if (validationError) {
      setUrlError(validationError);
      return;
    }

    addCustomEndpoint({
      name: newEndpoint.name,
      url: newEndpoint.url,
      port: newEndpoint.port || 443,
      protocol: newEndpoint.protocol || 'tcp',
      category: 'Custom',
      enabled: true,
    });

    // Reset form
    setNewEndpoint({
      name: '',
      url: '',
      port: 443,
      protocol: 'tcp',
      enabled: true,
    });
    setUrlError(null);
    setTestResult(null);
  };

  // Start editing a custom endpoint
  const startEditing = (endpoint: CustomEndpoint) => {
    setEditingId(endpoint.id);
    setEditForm({
      name: endpoint.name,
      url: endpoint.url,
      port: endpoint.port,
      protocol: endpoint.protocol,
    });
  };

  // Save edit
  const saveEdit = () => {
    if (!editingId || !editForm.name || !editForm.url) return;

    const validationError = validateEndpointUrl(editForm.url);
    if (validationError) {
      return;
    }

    updateCustomEndpoint(editingId, editForm);
    setEditingId(null);
    setEditForm({});
  };

  // Cancel edit
  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Start editing a mode endpoint
  const startEditingModeEndpoint = (endpoint: { id: string; name: string; url: string; port?: number }) => {
    setEditingModeEndpointId(endpoint.id);
    setModeEndpointEditForm({
      name: endpoint.name,
      url: endpoint.url,
      port: endpoint.port || 443,
    });
  };

  // Save mode endpoint edit
  const saveModeEndpointEdit = () => {
    if (!editingModeEndpointId || !modeEndpointEditForm.name || !modeEndpointEditForm.url) return;

    const validationError = validateEndpointUrl(modeEndpointEditForm.url);
    if (validationError) {
      return;
    }

    updateModeEndpoint(editingModeEndpointId, {
      name: modeEndpointEditForm.name,
      url: modeEndpointEditForm.url,
      port: modeEndpointEditForm.port,
    });
    setEditingModeEndpointId(null);
    setModeEndpointEditForm({ name: '', url: '', port: 443 });
  };

  // Cancel mode endpoint edit
  const cancelModeEndpointEdit = () => {
    setEditingModeEndpointId(null);
    setModeEndpointEditForm({ name: '', url: '', port: 443 });
  };

  // Group endpoints by category for display (exclude custom - they're shown separately)
  const groupedEndpoints = endpoints
    .filter((ep) => !ep.id.startsWith('custom-'))
    .reduce((acc, endpoint) => {
      const category = endpoint.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(endpoint);
      return acc;
    }, {} as Record<string, typeof endpoints>);

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

            {/* Custom Endpoints - moved inside Endpoint Monitoring */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Custom Endpoints
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add your own endpoints to monitor alongside the default ones.
              </p>

              {/* Custom Endpoint List */}
              {customEndpoints.length > 0 && (
                <div className="space-y-2 mb-4">
                  {customEndpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      {editingId === endpoint.id ? (
                        // Edit mode
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            placeholder="Name"
                            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                          />
                          <input
                            type="text"
                            value={editForm.url || ''}
                            onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                            placeholder="URL"
                            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={editForm.port || 443}
                            onChange={(e) => setEditForm({ ...editForm, port: parseInt(e.target.value) || 443 })}
                            placeholder="Port"
                            className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={saveEdit}
                            className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-center space-x-3 flex-1">
                            <input
                              type="checkbox"
                              checked={endpoint.enabled}
                              onChange={(e) => updateEndpointEnabled(endpoint.id, e.target.checked)}
                              className="w-4 h-4 text-primary-500 bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-primary-500"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {endpoint.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {endpoint.url}:{endpoint.port || 443}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditing(endpoint)}
                              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Edit endpoint"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeCustomEndpoint(endpoint.id)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove endpoint"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Custom Endpoint Form */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g., My Server)"
                    value={newEndpoint.name || ''}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="URL (e.g., example.com)"
                    value={newEndpoint.url || ''}
                    onChange={(e) => {
                      setNewEndpoint({ ...newEndpoint, url: e.target.value });
                      setUrlError(null);
                      setTestResult(null);
                    }}
                    className={cn(
                      'px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:border-transparent',
                      urlError
                        ? 'border-red-500 focus:ring-red-500'
                        : testResult?.success
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-primary-500'
                    )}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input
                    type="number"
                    placeholder="Port"
                    value={newEndpoint.port || 443}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, port: parseInt(e.target.value) || 443 })}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <select
                    value={newEndpoint.protocol || 'tcp'}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, protocol: e.target.value as 'tcp' | 'http' | 'https' })}
                    className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="tcp">TCP</option>
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                  </select>
                  <button
                    onClick={handleTestConnection}
                    disabled={!newEndpoint.url || isTesting}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 disabled:bg-gray-100 disabled:dark:bg-gray-700 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Test Connection"
                  >
                    {isTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wifi className="w-4 h-4" />
                    )}
                    <span className="text-sm">Test</span>
                  </button>
                  <button
                    onClick={handleAddEndpoint}
                    disabled={!newEndpoint.name || !newEndpoint.url || !!urlError}
                    className="px-3 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add</span>
                  </button>
                </div>

                {/* URL validation error */}
                {urlError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {urlError}
                  </p>
                )}

                {/* Test result */}
                {testResult && (
                  <div
                    className={cn(
                      'p-2 rounded-lg flex items-center gap-2 text-sm',
                      testResult.success
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    )}
                  >
                    {testResult.success ? (
                      <>
                        <Check className="w-4 h-4" />
                        Connection successful! Latency: {testResult.latency?.toFixed(1)}ms
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Connection failed: {testResult.error}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Mode Endpoints - moved inside Endpoint Monitoring */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {modeInfo?.name || 'Mode'} Endpoints
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Configure built-in endpoints for the current mode.
              </p>

              {/* Endpoint List by Category */}
              <div className="space-y-4">
                {Object.entries(groupedEndpoints).map(([category, categoryEndpoints]) => (
                  <div key={category}>
                    <h5 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                      {category}
                    </h5>
                    <div className="space-y-2">
                      {categoryEndpoints.map((endpoint) => {
                        const isMuted = endpoint.muted === true;
                        const isEditing = editingModeEndpointId === endpoint.id;

                        return (
                          <div
                            key={endpoint.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            {isEditing ? (
                              // Edit mode
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={modeEndpointEditForm.name}
                                  onChange={(e) => setModeEndpointEditForm({ ...modeEndpointEditForm, name: e.target.value })}
                                  placeholder="Name"
                                  className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={modeEndpointEditForm.url}
                                  onChange={(e) => setModeEndpointEditForm({ ...modeEndpointEditForm, url: e.target.value })}
                                  placeholder="URL"
                                  className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  value={modeEndpointEditForm.port}
                                  onChange={(e) => setModeEndpointEditForm({ ...modeEndpointEditForm, port: parseInt(e.target.value) || 443 })}
                                  placeholder="Port"
                                  className="w-20 px-2 py-1 text-sm bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                                <button
                                  onClick={saveModeEndpointEdit}
                                  className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelModeEndpointEdit}
                                  className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              // View mode
                              <>
                                <div className="flex items-center space-x-3 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={endpoint.enabled}
                                    onChange={(e) =>
                                      updateEndpointEnabled(endpoint.id, e.target.checked)
                                    }
                                    className="w-4 h-4 text-primary-500 bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded focus:ring-primary-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                                        {endpoint.name}
                                      </p>
                                      {isMuted && (
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                          <BellOff className="w-3 h-3" />
                                          Muted
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {endpoint.url}:{endpoint.port || 443}
                                      {endpoint.purpose && (
                                        <span className="ml-2 text-gray-400 dark:text-gray-500">
                                          - {endpoint.purpose}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* Edit button */}
                                  <button
                                    onClick={() => startEditingModeEndpoint(endpoint)}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                                    title="Edit endpoint"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  {/* Mute/Unmute button */}
                                  <button
                                    onClick={() => updateEndpointMuted(endpoint.id, !isMuted)}
                                    className={cn(
                                      'p-2 rounded-lg transition-colors',
                                      isMuted
                                        ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'
                                    )}
                                    title={isMuted ? 'Unmute alerts for this endpoint' : 'Mute alerts for this endpoint'}
                                  >
                                    {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                                  </button>
                                  {endpoint.required === false && (
                                    <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded">
                                      Optional
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* FSLogix Settings - Only show in Session Host mode */}
        {config.mode === 'sessionhost' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => toggleSection('fslogix')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <HardDrive className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  FSLogix Monitoring
                </h3>
              </div>
              {collapsedSections.fslogix ? (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {!collapsedSections.fslogix && (
            <div className="px-4 pb-4 space-y-4">
              {/* FSLogix Enabled Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable FSLogix Monitoring
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Monitor FSLogix profile and ODFC container storage connectivity
                  </p>
                </div>
                <button
                  onClick={() =>
                    setConfig({ fslogixEnabled: !config.fslogixEnabled })
                  }
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    config.fslogixEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      config.fslogixEnabled ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {/* FSLogix Test Interval - only show when FSLogix is enabled */}
              {config.fslogixEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Test Interval (seconds)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="600"
                    value={config.fslogixTestInterval}
                    onChange={(e) => setConfig({ fslogixTestInterval: Math.max(10, Math.min(600, parseInt(e.target.value) || 60)) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How often to test FSLogix storage connectivity (10-600 seconds)
                  </p>
                </div>
              )}

              {/* FSLogix Alert Threshold - only show when FSLogix is enabled */}
              {config.fslogixEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alert Threshold (consecutive failures)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.fslogixAlertThreshold}
                    onChange={(e) => setConfig({ fslogixAlertThreshold: Math.max(1, Math.min(10, parseInt(e.target.value) || 3)) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Number of consecutive connectivity failures before triggering an alert (1-10)
                  </p>
                </div>
              )}

              {/* FSLogix Alert Cooldown - only show when FSLogix is enabled */}
              {config.fslogixEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alert Cooldown (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={config.fslogixAlertCooldown}
                    onChange={(e) => setConfig({ fslogixAlertCooldown: Math.max(1, Math.min(60, parseInt(e.target.value) || 5)) })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Minimum time between repeated FSLogix alerts (1-60 minutes)
                  </p>
                </div>
              )}

              {/* Discovered FSLogix Paths - show when enabled and paths exist */}
              {config.fslogixEnabled && fslogixPaths.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discovered Storage Paths
                  </label>
                  <div className="space-y-2">
                    {fslogixPaths.map((path) => (
                      <div
                        key={path.id}
                        className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                      >
                        <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[10px] font-medium px-1.5 py-0.5 rounded uppercase',
                                path.type === 'profile'
                                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                              )}
                            >
                              {path.type === 'profile' ? 'Profile' : 'ODFC'}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {path.hostname}:{path.port}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={path.path}>
                            {path.path}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No paths discovered message */}
              {config.fslogixEnabled && fslogixPaths.length === 0 && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                  No FSLogix storage paths detected. Ensure FSLogix is configured in the Windows Registry.
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
                FSLogix storage paths are automatically detected from Windows Registry.
                {!config.fslogixEnabled && ' Alerts are disabled when monitoring is off.'}
              </p>
            </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
