import { useState } from 'react';
import { Download, Upload, Check, AlertCircle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { exportSettings } from '../../services/exportService';
import { importSettings } from '../../services/importService';
import type { SettingsFile } from '../../types';

type StatusMessage = {
  type: 'success' | 'error';
  text: string;
} | null;

export function DataManagement() {
  const config = useAppStore((state) => state.config);
  const customEndpoints = useAppStore((state) => state.customEndpoints);
  const setConfig = useAppStore((state) => state.setConfig);
  const setEndpoints = useAppStore((state) => state.setEndpoints);
  const setModeInfo = useAppStore((state) => state.setModeInfo);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  // Clear status message after 5 seconds
  const showStatus = (message: StatusMessage) => {
    setStatusMessage(message);
    if (message) {
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setStatusMessage(null);

    try {
      // Build settings file for export
      const settings: SettingsFile = {
        version: 1,
        config,
        customEndpoints,
      };

      const success = await exportSettings(settings);

      if (success) {
        showStatus({ type: 'success', text: 'Settings exported successfully' });
      }
      // If !success, user cancelled - no message needed
    } catch (error) {
      showStatus({ type: 'error', text: `Export failed: ${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setStatusMessage(null);

    try {
      const result = await importSettings();

      if (result.success && result.data) {
        // Update the store with imported settings
        setConfig(result.data.config);
        setEndpoints(result.data.endpoints);
        setModeInfo(result.data.modeInfo);

        // Restore history for the new endpoints
        useAppStore.getState().restoreHistoryForEndpoints(result.data.endpoints);

        showStatus({ type: 'success', text: 'Settings imported successfully' });
      } else if (result.error) {
        showStatus({ type: 'error', text: result.error });
      }
      // If neither success nor error, user cancelled - no message needed
    } catch (error) {
      showStatus({ type: 'error', text: `Import failed: ${error}` });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Message */}
      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            statusMessage.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="text-sm">{statusMessage.text}</span>
        </div>
      )}

      {/* Export/Import Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          disabled={isExporting || isImporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 dark:disabled:bg-primary-800 text-white rounded-lg transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : 'Export Settings'}
        </button>

        <button
          onClick={handleImport}
          disabled={isExporting || isImporting}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors font-medium border border-gray-300 dark:border-gray-600"
        >
          <Upload className="w-4 h-4" />
          {isImporting ? 'Importing...' : 'Import Settings'}
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Export your settings to backup or share with other machines. Import to restore a previous configuration.
      </p>
    </div>
  );
}
