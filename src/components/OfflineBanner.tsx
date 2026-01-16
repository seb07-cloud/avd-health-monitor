import { WifiOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline);
  const lastOnline = useAppStore((s) => s.lastOnlineTimestamp);

  if (!isOffline) return null;

  const formatLastOnline = () => {
    if (!lastOnline) return null;
    return new Date(lastOnline).toLocaleTimeString();
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
      <WifiOff className="w-5 h-5 text-yellow-500 flex-shrink-0" />
      <div className="text-sm text-yellow-700 dark:text-yellow-300">
        <span className="font-medium">You appear to be offline.</span>
        {lastOnline && (
          <span className="ml-1">
            Last connected: {formatLastOnline()}
          </span>
        )}
        <span className="ml-1 text-yellow-600 dark:text-yellow-400">
          Monitoring will resume when connection is restored.
        </span>
      </div>
    </div>
  );
}
