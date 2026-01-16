import { HardDrive, FolderOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

interface FSLogixSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function FSLogixSettings({ isCollapsed, onToggle }: FSLogixSettingsProps) {
  // Zustand selectors
  const config = useAppStore((state) => state.config);
  const fslogixPaths = useAppStore((state) => state.fslogixPaths);
  const setConfig = useAppStore((state) => state.setConfig);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={onToggle}
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
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {!isCollapsed && (
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
  );
}
