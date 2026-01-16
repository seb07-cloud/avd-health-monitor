import { useState, useMemo } from 'react';
import { Edit2, Check, X, BellOff, Bell } from 'lucide-react';
import type { Endpoint, ModeInfo } from '../../types';
import { cn, validateEndpointUrl } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

interface ModeEndpointListProps {
  modeInfo: ModeInfo | null;
}

export function ModeEndpointList({ modeInfo }: ModeEndpointListProps) {
  // Zustand selectors
  const endpoints = useAppStore((state) => state.endpoints);
  const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);
  const updateEndpointMuted = useAppStore((state) => state.updateEndpointMuted);
  const updateModeEndpoint = useAppStore((state) => state.updateModeEndpoint);

  // Edit mode state for mode endpoints
  const [editingModeEndpointId, setEditingModeEndpointId] = useState<string | null>(null);
  const [modeEndpointEditForm, setModeEndpointEditForm] = useState<{ name: string; url: string; port: number }>({ name: '', url: '', port: 443 });

  // Group endpoints by category for display (exclude custom - they're shown separately)
  const groupedEndpoints = useMemo(() => {
    return endpoints
      .filter((ep) => !ep.id.startsWith('custom-'))
      .reduce((acc, endpoint) => {
        const category = endpoint.category || 'Other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(endpoint);
        return acc;
      }, {} as Record<string, Endpoint[]>);
  }, [endpoints]);

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

  return (
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
  );
}
