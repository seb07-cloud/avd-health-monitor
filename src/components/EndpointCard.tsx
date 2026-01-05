import { Activity, TrendingUp, TrendingDown, Minus, Check, AlertTriangle, XCircle, Loader2, WifiOff, Power, CheckCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts';
import type { Endpoint, EndpointStatus } from '../types';
import { cn, formatLatency, getStatusColor, getStatusBgColor, getStatusLabel, formatTimestamp } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';

// Check if endpoint is latency critical (defaults to true for backwards compatibility)
function isLatencyCritical(endpoint: Endpoint): boolean {
  return endpoint.latencyCritical !== false;
}

// Custom tooltip for chart data points
interface TooltipPayload {
  payload?: {
    timestamp: number;
    latency: number;
  };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    if (!data) return null;

    const date = new Date(data.timestamp);
    const formattedDate = date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    return (
      <div className="bg-gray-900 dark:bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg border border-gray-700 text-xs">
        <p className="font-semibold text-blue-400">{data.latency.toFixed(1)} ms</p>
        <p className="text-gray-300">{formattedDate}</p>
        <p className="text-gray-400">{formattedTime}</p>
      </div>
    );
  }
  return null;
}

interface EndpointCardProps {
  endpoint: Endpoint;
  status?: EndpointStatus;
}

export function EndpointCard({ endpoint, status }: EndpointCardProps) {
  const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);
  const graphTimeRange = useAppStore((state) => state.config.graphTimeRange);

  const latency = status?.currentLatency ?? null;
  const latencyStatus = status?.status ?? 'unknown';
  const fullHistory = status?.history ?? [];
  const isLoading = status?.isLoading ?? false;
  const error = status?.error ?? null;
  const isEnabled = endpoint.enabled;
  const showLatency = isLatencyCritical(endpoint);
  const isReachable = latency !== null && !error;

  // Filter history based on graphTimeRange (in hours)
  const now = Date.now();
  const timeRangeMs = graphTimeRange * 60 * 60 * 1000; // Convert hours to milliseconds
  const history = fullHistory.filter((h) => now - h.timestamp <= timeRangeMs);

  // Calculate statistics from filtered history
  const validLatencies = history.filter((h) => h.latency > 0).map((h) => h.latency);
  const avgLatency =
    validLatencies.length > 0
      ? validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length
      : null;
  const minLatency = validLatencies.length > 0 ? Math.min(...validLatencies) : null;
  const maxLatency = validLatencies.length > 0 ? Math.max(...validLatencies) : null;

  // Determine trend (comparing last 5 vs previous 5)
  const getTrend = () => {
    if (validLatencies.length < 10) return 'stable';
    const recent = validLatencies.slice(-5);
    const previous = validLatencies.slice(-10, -5);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
    const diff = ((recentAvg - previousAvg) / previousAvg) * 100;
    if (diff > 10) return 'up';
    if (diff < -10) return 'down';
    return 'stable';
  };

  const trend = getTrend();

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-gray-500';

  // Get status icon for accessibility (non-color visual cue)
  const getStatusIcon = () => {
    if (isLoading) return Loader2;
    if (error) return WifiOff;
    // For non-latency-critical endpoints, just show check or X
    if (!showLatency) {
      return isReachable ? CheckCircle : XCircle;
    }
    if (latencyStatus === 'excellent') return Check;
    if (latencyStatus === 'good') return Check;
    if (latencyStatus === 'warning') return AlertTriangle;
    if (latencyStatus === 'critical') return XCircle;
    return Activity;
  };

  const StatusIcon = getStatusIcon();

  // Determine the display value for latency or reachability
  const getLatencyDisplay = () => {
    if (isLoading) {
      return (
        <span className="text-blue-500 flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-2xl font-medium">Testing...</span>
        </span>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col">
          <span className="text-red-500 text-lg font-semibold">
            {showLatency ? error.userMessage : 'Unreachable'}
          </span>
          <span
            className="text-xs text-red-400 dark:text-red-500 mt-1 cursor-help"
            title={error.message}
          >
            Tap for details
          </span>
        </div>
      );
    }

    // For latency-critical endpoints, show latency value
    if (showLatency) {
      if (latency !== null) {
        return (
          <>
            <span className={cn('text-4xl font-bold', getStatusColor(latencyStatus))}>
              {latency.toFixed(0)}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">ms</span>
          </>
        );
      }
    } else {
      // For non-latency-critical endpoints, show reachable/unreachable
      if (isReachable) {
        return (
          <span className="text-green-500 dark:text-green-400 text-2xl font-bold">
            Reachable
          </span>
        );
      }
    }

    return (
      <span className="text-gray-400 dark:text-gray-500 text-2xl">
        No data
      </span>
    );
  };

  // Get the background color for the status icon
  const getIconBgColor = () => {
    if (isLoading) return 'bg-blue-500';
    if (error) return 'bg-red-500';
    // For non-latency-critical endpoints, show green if reachable
    if (!showLatency) {
      return isReachable ? 'bg-green-500' : 'bg-gray-400';
    }
    return getStatusBgColor(latencyStatus);
  };

  // Get the status label to display
  const getDisplayStatusLabel = () => {
    if (isLoading) return 'Testing';
    if (error) return 'Error';
    // For non-latency-critical endpoints
    if (!showLatency) {
      return isReachable ? 'OK' : 'Unknown';
    }
    return getStatusLabel(latencyStatus);
  };

  // Get the status badge style
  const getStatusBadgeStyle = () => {
    if (isLoading) {
      return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
    }
    if (error) {
      return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
    }
    // For non-latency-critical endpoints
    if (!showLatency) {
      return isReachable
        ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
        : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
    }
    switch (latencyStatus) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
      case 'good':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
      case 'warning':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
    }
  };

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border relative',
        error
          ? 'border-red-300 dark:border-red-700'
          : 'border-gray-200 dark:border-gray-700',
        !isEnabled && 'opacity-60'
      )}
    >
      {/* Disabled overlay */}
      {!isEnabled && (
        <div className="absolute inset-0 bg-gray-200/30 dark:bg-gray-900/30 rounded-lg pointer-events-none flex items-center justify-center">
          <span className="bg-gray-800 dark:bg-gray-700 text-white text-xs font-medium px-2 py-1 rounded">
            Disabled
          </span>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center space-x-3">
          <div className={cn('p-2 rounded-lg relative', isEnabled ? getIconBgColor() : 'bg-gray-400 dark:bg-gray-600')}>
            <StatusIcon
              className={cn('w-5 h-5 text-white', isLoading && 'animate-spin')}
              aria-hidden="true"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">{endpoint.name}</h3>
              {/* Accessibility: Status text label for colorblind users */}
              <span
                className={cn(
                  'px-1.5 py-0.5 text-xs font-bold rounded border',
                  getStatusBadgeStyle()
                )}
                aria-label={`Status: ${getDisplayStatusLabel()}`}
              >
                {getDisplayStatusLabel()}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{endpoint.url}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && !error && isEnabled && <TrendIcon className={cn('w-5 h-5', trendColor)} />}
          {/* Enable/Disable Toggle */}
          <button
            onClick={() => updateEndpointEnabled(endpoint.id, !isEnabled)}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
            title={isEnabled ? 'Disable endpoint' : 'Enable endpoint'}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current Latency or Error State */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-2">
          {getLatencyDisplay()}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isLoading
            ? 'Running latency test...'
            : status?.lastUpdated
            ? `Updated ${formatTimestamp(status.lastUpdated)}`
            : 'No data'}
        </p>
      </div>

      {/* Error Details (collapsible) */}
      {error && (
        <details className="mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <summary className="text-sm text-red-700 dark:text-red-300 cursor-pointer hover:text-red-800 dark:hover:text-red-200 font-medium">
            Error Details
          </summary>
          <div className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
            <p>
              <span className="font-semibold">Code:</span> {error.code}
            </p>
            <p>
              <span className="font-semibold">Message:</span> {error.message}
            </p>
            <p>
              <span className="font-semibold">Time:</span>{' '}
              {new Date(error.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </details>
      )}

      {/* Sparkline Chart with Interactive Tooltip - only for latency-critical endpoints */}
      {showLatency && history.length > 1 && !error && (
        <div className="mb-4 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history}>
              <YAxis domain={['auto', 'auto']} hide />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="latency"
                stroke={
                  latencyStatus === 'excellent'
                    ? '#10b981'
                    : latencyStatus === 'good'
                    ? '#eab308'
                    : latencyStatus === 'warning'
                    ? '#f97316'
                    : '#ef4444'
                }
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Loading skeleton for chart area - only for latency-critical endpoints */}
      {showLatency && isLoading && history.length === 0 && (
        <div className="mb-4 h-20 bg-gray-100 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            Collecting data...
          </span>
        </div>
      )}

      {/* Statistics - only for latency-critical endpoints */}
      {showLatency && (
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Avg</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatLatency(avgLatency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Min</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatLatency(minLatency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Max</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatLatency(maxLatency)}
            </p>
          </div>
        </div>
      )}

      {/* For non-latency-critical endpoints, show endpoint purpose */}
      {!showLatency && endpoint.purpose && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">{endpoint.purpose}</p>
        </div>
      )}
    </div>
  );
}
