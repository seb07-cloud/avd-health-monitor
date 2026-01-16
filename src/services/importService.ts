import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { SettingsResponse } from '../types';

/**
 * Result of an import operation.
 */
export interface ImportResult {
  success: boolean;
  data?: SettingsResponse;
  error?: string;
}

/**
 * Import settings from a user-selected file.
 * Opens a native file dialog, validates the file via Rust backend,
 * and returns the new settings.
 * @returns ImportResult with success status and data or error
 */
export async function importSettings(): Promise<ImportResult> {
  const filePath = await open({
    title: 'Import Settings',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    multiple: false,
    directory: false,
  });

  if (!filePath || Array.isArray(filePath)) {
    return { success: false }; // User cancelled or multiple files (shouldn't happen with multiple: false)
  }

  try {
    const data = await invoke<SettingsResponse>('import_settings_from_path', {
      path: filePath,
    });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
