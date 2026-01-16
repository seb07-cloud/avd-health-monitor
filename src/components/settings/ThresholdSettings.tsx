import { useMemo } from 'react';
import { XCircle } from 'lucide-react';
import type { LatencyThresholds } from '../../types';
import { cn, validateThresholds } from '../../lib/utils';

interface ThresholdSettingsProps {
  thresholds: LatencyThresholds;
  onThresholdChange: (field: 'excellent' | 'good' | 'warning', value: string) => void;
}

export function ThresholdSettings({ thresholds, onThresholdChange }: ThresholdSettingsProps) {
  const thresholdErrors = useMemo(() => {
    return validateThresholds(thresholds);
  }, [thresholds]);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        Latency Thresholds
      </h4>

      {/* General validation error */}
      {thresholdErrors.general && (
        <div className="p-3 mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {thresholdErrors.general}
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Excellent */}
        <div>
          <label className="block text-sm font-medium text-green-600 dark:text-green-400 mb-2">
            Excellent (ms)
          </label>
          <input
            type="number"
            min="0"
            value={thresholds.excellent}
            onChange={(e) => onThresholdChange('excellent', e.target.value)}
            className={cn(
              'w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:border-transparent',
              thresholdErrors.excellent
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
            )}
          />
          {thresholdErrors.excellent && (
            <p className="text-xs text-red-500 mt-1">{thresholdErrors.excellent}</p>
          )}
        </div>

        {/* Good */}
        <div>
          <label className="block text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-2">
            Good (ms)
          </label>
          <input
            type="number"
            min="0"
            value={thresholds.good}
            onChange={(e) => onThresholdChange('good', e.target.value)}
            className={cn(
              'w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:border-transparent',
              thresholdErrors.good
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-yellow-500'
            )}
          />
          {thresholdErrors.good && (
            <p className="text-xs text-red-500 mt-1">{thresholdErrors.good}</p>
          )}
        </div>

        {/* Warning */}
        <div>
          <label className="block text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
            Warning (ms)
          </label>
          <input
            type="number"
            min="0"
            value={thresholds.warning}
            onChange={(e) => onThresholdChange('warning', e.target.value)}
            className={cn(
              'w-full px-3 py-2 bg-white dark:bg-gray-700 border rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:border-transparent',
              thresholdErrors.warning
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500'
            )}
          />
          {thresholdErrors.warning && (
            <p className="text-xs text-red-500 mt-1">{thresholdErrors.warning}</p>
          )}
        </div>
      </div>

      {/* Threshold scale visualization */}
      <div className="pt-3">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>0ms</span>
          <span className="flex-1 text-center">Latency Scale</span>
          <span>{thresholds.warning + 50}ms+</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-green-500 h-full"
            style={{ width: `${(thresholds.excellent / (thresholds.warning + 50)) * 100}%` }}
            title={`Excellent: 0-${thresholds.excellent}ms`}
          />
          <div
            className="bg-yellow-500 h-full"
            style={{ width: `${((thresholds.good - thresholds.excellent) / (thresholds.warning + 50)) * 100}%` }}
            title={`Good: ${thresholds.excellent + 1}-${thresholds.good}ms`}
          />
          <div
            className="bg-orange-500 h-full"
            style={{ width: `${((thresholds.warning - thresholds.good) / (thresholds.warning + 50)) * 100}%` }}
            title={`Warning: ${thresholds.good + 1}-${thresholds.warning}ms`}
          />
          <div
            className="bg-red-500 h-full flex-1"
            title={`Critical: ${thresholds.warning + 1}ms+`}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-green-600 dark:text-green-400">Excellent</span>
          <span className="text-yellow-600 dark:text-yellow-400">Good</span>
          <span className="text-orange-600 dark:text-orange-400">Warning</span>
          <span className="text-red-600 dark:text-red-400">Critical</span>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        Latency above {thresholds.warning}ms is considered Critical (red)
      </p>
    </div>
  );
}
