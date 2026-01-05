import { Check, XCircle, Loader2, HardDrive, FolderOpen, Bell, BellOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import type { FSLogixPath, FSLogixStatus } from '../types';

interface FSLogixTileProps {
  path: FSLogixPath;
  status?: FSLogixStatus;
  onToggleMuted?: (pathId: string, muted: boolean) => void;
}

function FSLogixTile({ path, status, onToggleMuted }: FSLogixTileProps) {
  const isLoading = status?.isLoading ?? false;
  const reachable = status?.reachable ?? false;
  const latency = status?.latency ?? null;
  const error = status?.error ?? null;
  const hasBeenTested = status?.lastUpdated !== null && status?.lastUpdated !== undefined;
  const isMuted = path.muted === true;

  // Get status icon
  const getStatusIcon = () => {
    if (isLoading) return Loader2;
    if (!hasBeenTested) return null;
    return reachable ? Check : XCircle;
  };

  const StatusIcon = getStatusIcon();

  // Get border color based on status
  const getBorderColor = () => {
    if (isLoading) return 'border-blue-400 dark:border-blue-500';
    if (!hasBeenTested) return 'border-gray-300 dark:border-gray-600';
    return reachable
      ? 'border-green-400 dark:border-green-500'
      : 'border-red-400 dark:border-red-500';
  };

  // Get type badge styling
  const getTypeBadge = () => {
    const isProfile = path.type === 'profile';
    return {
      label: isProfile ? 'Profile' : 'ODFC',
      className: isProfile
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    };
  };

  const typeBadge = getTypeBadge();

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all p-4 border-2',
        getBorderColor()
      )}
    >
      {/* Status indicator and connectivity */}
      <div className="flex items-center gap-2 mb-2">
        {StatusIcon && (
          <div
            className={cn(
              'p-2 rounded-md',
              isLoading && 'bg-blue-500',
              !isLoading && hasBeenTested && reachable && 'bg-green-500',
              !isLoading && hasBeenTested && !reachable && 'bg-red-500',
              !isLoading && !hasBeenTested && 'bg-gray-400 dark:bg-gray-600'
            )}
          >
            <StatusIcon
              className={cn('w-4 h-4 text-white', isLoading && 'animate-spin')}
            />
          </div>
        )}
        {!StatusIcon && (
          <div className="p-2 rounded-md bg-gray-400 dark:bg-gray-600">
            <HardDrive className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <span className="text-blue-500 font-medium">Testing...</span>
          ) : !hasBeenTested ? (
            <span className="text-gray-400 dark:text-gray-500">--</span>
          ) : reachable ? (
            <div className="flex items-baseline gap-1">
              <span className="text-green-500 dark:text-green-400 font-medium">Reachable</span>
              {latency !== null && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({latency.toFixed(0)} ms)
                </span>
              )}
            </div>
          ) : (
            <span className="text-red-500 font-medium" title={error || undefined}>
              Unreachable
            </span>
          )}
        </div>
      </div>

      {/* Type badge, mute button, and icon */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={cn(
            'text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide',
            typeBadge.className
          )}
        >
          {typeBadge.label}
        </span>
        {isMuted && (
          <span className="text-[10px] text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
            <BellOff className="w-3 h-3" />
            Muted
          </span>
        )}
        <div className="flex-1" />
        {/* Mute/Unmute button */}
        {onToggleMuted && (
          <button
            onClick={() => onToggleMuted(path.id, !isMuted)}
            className={cn(
              'p-1 rounded transition-colors',
              isMuted
                ? 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
            title={isMuted ? 'Unmute alerts for this path' : 'Mute alerts for this path'}
          >
            {isMuted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Storage path display */}
      <div className="flex items-start gap-2">
        <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5" />
        <p
          className="text-xs text-gray-500 dark:text-gray-400 break-all leading-relaxed"
          title={path.path}
        >
          {path.path}
        </p>
      </div>

      {/* Hostname (what we test) */}
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate" title={`Testing: ${path.hostname}:${path.port}`}>
        {path.hostname}:{path.port}
      </p>
    </div>
  );
}

export function FSLogixSection() {
  const fslogixPaths = useAppStore((state) => state.fslogixPaths);
  const fslogixStatuses = useAppStore((state) => state.fslogixStatuses);
  const fslogixEnabled = useAppStore((state) => state.config.fslogixEnabled);
  const mode = useAppStore((state) => state.config.mode);
  const updateFSLogixPathMuted = useAppStore((state) => state.updateFSLogixPathMuted);

  // Don't render anything if:
  // - Not in Session Host mode (FSLogix is only relevant on AVD session hosts)
  // - FSLogix monitoring is disabled
  // - No paths are configured
  if (mode !== 'sessionhost' || !fslogixEnabled || fslogixPaths.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        FSLogix Storage
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {fslogixPaths.map((path) => {
          const status = fslogixStatuses.get(path.id);
          return (
            <FSLogixTile
              key={path.id}
              path={path}
              status={status}
              onToggleMuted={updateFSLogixPathMuted}
            />
          );
        })}
      </div>
    </div>
  );
}
