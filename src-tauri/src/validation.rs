//! JSON schema validation for settings files

use schemars::schema_for;
use serde_json::Value;

use crate::settings::SettingsFile;

/// Validate settings JSON against the schema.
/// Returns Ok(()) if valid, Err with descriptive messages if invalid.
pub fn validate_settings_json(json_value: &Value) -> Result<(), String> {
    let schema = schema_for!(SettingsFile);
    let schema_value = serde_json::to_value(&schema)
        .map_err(|e| format!("Failed to serialize schema: {}", e))?;

    let validator = jsonschema::validator_for(&schema_value)
        .map_err(|e| format!("Invalid schema: {}", e))?;

    if validator.is_valid(json_value) {
        Ok(())
    } else {
        let errors: Vec<String> = validator
            .iter_errors(json_value)
            .map(|e| format!("  - {}: {}", e.instance_path, e))
            .collect();
        Err(format!("Settings validation failed:\n{}", errors.join("\n")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_settings() {
        let json: Value = serde_json::json!({
            "version": 1,
            "config": {
                "mode": "sessionhost",
                "testInterval": 10
            }
        });
        assert!(validate_settings_json(&json).is_ok());
    }

    #[test]
    fn test_empty_object_uses_defaults() {
        // Empty object should be valid - serde defaults will fill in values
        let json: Value = serde_json::json!({});
        assert!(validate_settings_json(&json).is_ok());
    }

    #[test]
    fn test_invalid_mode_type() {
        let json: Value = serde_json::json!({
            "config": {
                "mode": 123  // Should be string
            }
        });
        let result = validate_settings_json(&json);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("mode"));
    }

    #[test]
    fn test_invalid_version_type() {
        let json: Value = serde_json::json!({
            "version": "not a number"  // Should be integer
        });
        let result = validate_settings_json(&json);
        assert!(result.is_err());
    }
}
