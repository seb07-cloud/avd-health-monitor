import { Monitor, User, ExternalLink } from 'lucide-react';
import type { AppConfig, AppMode, ModeInfo } from '../../types';
import { cn } from '../../lib/utils';

interface ModeSelectorProps {
  config: AppConfig;
  modeInfo: ModeInfo | null;
  onModeChange: (mode: AppMode) => Promise<void>;
}

export function ModeSelector({ config, modeInfo, onModeChange }: ModeSelectorProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Application Mode
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Select the mode based on where this tool is running. Each mode monitors different endpoints.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {/* Session Host Mode */}
        <button
          onClick={() => onModeChange('sessionhost')}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all',
            config.mode === 'sessionhost'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'p-2 rounded-lg',
              config.mode === 'sessionhost'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}>
              <Monitor className="w-5 h-5" />
            </div>
            <span className={cn(
              'font-semibold',
              config.mode === 'sessionhost'
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-900 dark:text-white'
            )}>
              Session Host Mode
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For Azure Virtual Desktop session host VMs. Monitors endpoints required for AVD agent, RD Gateway, and core services.
          </p>
        </button>

        {/* End User Mode */}
        <button
          onClick={() => onModeChange('enduser')}
          className={cn(
            'p-4 rounded-lg border-2 text-left transition-all',
            config.mode === 'enduser'
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'p-2 rounded-lg',
              config.mode === 'enduser'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            )}>
              <User className="w-5 h-5" />
            </div>
            <span className={cn(
              'font-semibold',
              config.mode === 'enduser'
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-900 dark:text-white'
            )}>
              End User Device Mode
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            For client devices connecting to AVD. Monitors endpoints required for Remote Desktop clients and Azure AD.
          </p>
        </button>
      </div>

      {/* Mode Info & Source Link */}
      {modeInfo && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Current: <span className="font-medium text-gray-900 dark:text-white">{modeInfo.name}</span>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {modeInfo.description}
              </p>
            </div>
            {modeInfo.source && (
              <a
                href={modeInfo.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Microsoft Docs
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
