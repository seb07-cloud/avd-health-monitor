import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { EndpointStatus } from '../types';

/**
 * Escape a CSV field to handle commas, quotes, and newlines
 */
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Export latency history to a CSV file
 * @param endpointStatuses Map of endpoint statuses from the store
 * @returns true if export succeeded, false if cancelled or failed
 */
export async function exportHistoryToCsv(
  endpointStatuses: Map<string, EndpointStatus>
): Promise<boolean> {
  // Generate CSV content with UTF-8 BOM for Excel compatibility
  const BOM = '\uFEFF';
  const headers = ['Endpoint ID', 'Endpoint Name', 'Timestamp', 'Latency (ms)'];
  const rows: string[] = [headers.join(',')];

  // Iterate through all endpoint statuses
  endpointStatuses.forEach((status, endpointId) => {
    const endpointName = status.endpoint.name;

    // Add each history entry as a row
    status.history.forEach((entry) => {
      const row = [
        escapeCsvField(endpointId),
        escapeCsvField(endpointName),
        new Date(entry.timestamp).toISOString(),
        entry.latency.toString(),
      ];
      rows.push(row.join(','));
    });
  });

  // Check if there's any data to export
  if (rows.length === 1) {
    // Only headers, no data
    throw new Error('No history data to export');
  }

  const csvContent = BOM + rows.join('\n');

  // Show save dialog with date in default filename
  const today = new Date().toISOString().split('T')[0];
  const filePath = await save({
    title: 'Export Latency History',
    defaultPath: `avd-health-history-${today}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });

  if (!filePath) return false; // User cancelled

  // Write via Rust command
  await invoke('write_text_to_path', {
    path: filePath,
    content: csvContent,
  });

  return true;
}
