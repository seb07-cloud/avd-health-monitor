---
phase: 6-security
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/Cargo.toml
  - src-tauri/src/settings.rs
  - src-tauri/src/validation.rs
  - src-tauri/src/lib.rs
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Malformed settings.json is rejected with descriptive error"
    - "Valid settings.json loads successfully"
    - "Missing optional fields use serde defaults (backward compatible)"
  artifacts:
    - path: "src-tauri/src/validation.rs"
      provides: "JSON schema validation module"
      exports: ["validate_settings_json"]
    - path: "src-tauri/src/settings.rs"
      provides: "Schema-derived types"
      contains: "JsonSchema"
  key_links:
    - from: "src-tauri/src/settings.rs"
      to: "src-tauri/src/validation.rs"
      via: "load_settings calls validate_settings_json"
      pattern: "validate_settings_json"
    - from: "src-tauri/src/settings.rs"
      to: "schemars"
      via: "JsonSchema derive macro"
      pattern: "derive.*JsonSchema"
---

<objective>
Implement JSON schema validation for settings.json on load.

Purpose: Reject malformed configuration files early with descriptive errors
Output: Schema-validated settings loading that catches invalid data before use
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/6-security/6-RESEARCH.md

# Source files to modify
@src-tauri/Cargo.toml
@src-tauri/src/settings.rs
@src-tauri/src/lib.rs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add schema dependencies and derive JsonSchema on types</name>
  <files>src-tauri/Cargo.toml, src-tauri/src/settings.rs</files>
  <action>
1. Add dependencies to Cargo.toml:
   ```toml
   schemars = "1.1"
   jsonschema = "0.26"
   ```
   Note: Using jsonschema 0.26.x for Rust 1.75+ compatibility (0.39 requires Rust 1.83.0)

2. Update settings.rs imports:
   ```rust
   use schemars::JsonSchema;
   ```

3. Add JsonSchema derive to all types that appear in settings.json:
   - SettingsFile: `#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]`
   - AppConfig: `#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]`
   - AppMode: `#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, JsonSchema)]`
   - Theme: `#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, JsonSchema)]`
   - LatencyThresholds: `#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]`
   - CustomEndpoint: `#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]`
   - FSLogixPathState: `#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]`

Note: The types already have #[serde(default)] on optional fields, which schemars respects - missing fields will use defaults, ensuring backward compatibility with older settings files.
  </action>
  <verify>
- `cd src-tauri && cargo check` succeeds
- grep for "JsonSchema" in settings.rs shows derive macros on relevant types
  </verify>
  <done>Schema generation dependencies added, JsonSchema derived on settings types</done>
</task>

<task type="auto">
  <name>Task 2: Create validation module and integrate with settings loading</name>
  <files>src-tauri/src/validation.rs, src-tauri/src/settings.rs, src-tauri/src/lib.rs</files>
  <action>
1. Create new validation.rs module:
   ```rust
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
   ```

2. Update lib.rs:
   - Add `mod validation;` declaration (after `mod settings;`)

3. Update load_settings() in settings.rs:
   - Add import: `use crate::validation::validate_settings_json;`
   - After reading file content, parse as Value first:
     ```rust
     let json_value: serde_json::Value = serde_json::from_str(&content)
         .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData,
             format!("Invalid JSON: {}", e)))?;
     ```
   - Validate against schema:
     ```rust
     validate_settings_json(&json_value)
         .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
     ```
   - Then deserialize from the validated Value:
     ```rust
     let settings: SettingsFile = serde_json::from_value(json_value)
         .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
     ```

The updated load_settings() flow:
1. Read file content
2. Parse as generic JSON Value
3. Validate Value against schema (fail fast with descriptive errors)
4. Deserialize Value to SettingsFile struct
5. Return settings
  </action>
  <verify>
- `cd src-tauri && cargo check` succeeds
- `cd src-tauri && cargo test` passes
- validation.rs file exists with validate_settings_json function
- load_settings in settings.rs calls validate_settings_json
  </verify>
  <done>Settings JSON validated against schema on load, malformed files rejected with descriptive errors</done>
</task>

</tasks>

<verification>
- [ ] `cd src-tauri && cargo check` passes
- [ ] `cd src-tauri && cargo test` passes
- [ ] validation.rs module exists with validate_settings_json
- [ ] JsonSchema derived on SettingsFile and nested types
- [ ] load_settings() calls validate_settings_json before deserializing
</verification>

<success_criteria>
- SEC-01 complete: Settings JSON validated against schema on load
- Malformed settings.json rejected with descriptive error messages
- Valid settings.json with missing optional fields loads correctly (serde defaults applied)
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/phases/6-security/6-02-SUMMARY.md`
</output>
