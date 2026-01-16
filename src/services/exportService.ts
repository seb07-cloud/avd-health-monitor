import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { SettingsFile } from '../types';

/**
 * Export settings to a user-selected file.
 * Opens a native save dialog, then writes the settings via Rust backend.
 * @param settings The settings to export
 * @returns true if exported successfully, false if user cancelled
 */
export async function exportSettings(settings: SettingsFile): Promise<boolean> {
  const filePath = await save({
    title: 'Export Settings',
    defaultPath: 'avd-health-monitor-settings.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!filePath) return false; // User cancelled

  await invoke('export_settings_to_path', {
    path: filePath,
    settings,
  });

  return true;
}
