//! Export and import functionality for settings

use std::fs;
use tauri::AppHandle;

use crate::settings::{load_settings, save_settings, SettingsFile, SettingsResponse};
use crate::validation::validate_settings_json;

/// Export settings to a user-specified path.
/// Path comes from Tauri dialog (already validated).
#[tauri::command]
pub fn export_settings_to_path(path: String, settings: SettingsFile) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

/// Import settings from a user-specified path.
/// Validates against schema, saves to settings.json, returns new settings for frontend.
#[tauri::command]
pub fn import_settings_from_path(app: AppHandle, path: String) -> Result<SettingsResponse, String> {
    // Read the file
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse as JSON Value first for schema validation
    let json_value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Validate against schema
    validate_settings_json(&json_value)?;

    // Deserialize to SettingsFile
    let settings: SettingsFile = serde_json::from_value(json_value)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    // Save to settings.json
    save_settings(&settings)
        .map_err(|e| format!("Failed to save settings: {}", e))?;

    // Reload and return the new settings with resolved endpoints
    crate::settings::load_settings_with_endpoints(&app)
        .map_err(|e| format!("Failed to load settings: {}", e))
}

/// Write text content to a user-specified path.
/// Used for CSV export (Plan 02).
#[tauri::command]
pub fn write_text_to_path(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn test_write_text_to_path() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("test.txt");

        write_text_to_path(path.to_string_lossy().to_string(), "Hello, World!".to_string()).unwrap();

        let content = fs::read_to_string(&path).unwrap();
        assert_eq!(content, "Hello, World!");
    }
}
