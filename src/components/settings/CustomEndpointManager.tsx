import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Trash2, Edit2, Check, X, Loader2, Wifi, XCircle } from 'lucide-react';
import type { CustomEndpoint } from '../../types';
import { cn, validateEndpointUrl } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

export function CustomEndpointManager() {
  // Zustand selectors
  const customEndpoints = useAppStore((state) => state.customEndpoints);
  const addCustomEndpoint = useAppStore((state) => state.addCustomEndpoint);
  const updateCustomEndpoint = useAppStore((state) => state.updateCustomEndpoint);
  const removeCustomEndpoint = useAppStore((state) => state.removeCustomEndpoint);
  const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);

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

  return (
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
  );
}
