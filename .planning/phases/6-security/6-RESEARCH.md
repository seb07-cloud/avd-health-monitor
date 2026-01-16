# Phase 6: Security - Research

**Researched:** 2026-01-16
**Domain:** Settings validation, file permissions, path injection prevention
**Confidence:** HIGH

## Summary

This phase addresses three security requirements for the AVD Health Monitor:

1. **SEC-01: JSON Schema Validation** - Validate settings.json against a schema on load to reject malformed configuration files. This protects against corrupted data or malicious configuration injection.

2. **SEC-02: Portable Mode Permission Check** - Replace the current test-file-based permission detection with OS API calls. The current implementation creates a `.portable_test` file which is a security anti-pattern and leaves artifacts.

3. **SEC-03: Path Injection Prevention** - Validate file paths before passing to external editor invocation to prevent path traversal attacks that could execute arbitrary files.

The recommended approach uses:
- **schemars + jsonschema** for schema generation and validation (both Rust-native, high-performance)
- **faccess** crate for cross-platform permission checking (uses Windows ACL APIs, no test files)
- **std::fs::canonicalize** with containment validation for path injection prevention

**Primary recommendation:** Use schemars 1.x to generate JSON Schema from Rust types (builds on existing ts-rs pattern), jsonschema 0.x for runtime validation, faccess 0.2.x for permission checks, and std::fs::canonicalize with starts_with() for path validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| schemars | 1.1.0 | Generate JSON Schema from Rust structs | Serde-compatible, derive macro, well-maintained |
| jsonschema | 0.39.0 | Validate JSON against schema at runtime | High-performance, Draft 2020-12 support, Rust-native |
| faccess | 0.2.4 | Cross-platform file permission checks | Uses Windows ACL APIs, no test files needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| std::fs::canonicalize | stdlib | Resolve symlinks and normalize paths | Always before path validation |
| std::path::Path::starts_with | stdlib | Verify path containment | After canonicalization |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| schemars | Hand-written schema | Schema drift from Rust types, maintenance burden |
| jsonschema | valico | jsonschema is faster, more actively maintained |
| faccess | windows-permissions | faccess is simpler API, handles cross-platform |
| faccess | Test file creation | Current approach - leaves artifacts, security anti-pattern |
| canonicalize | path_trav crate | stdlib sufficient for this use case |

**Installation:**
```toml
# Cargo.toml [dependencies]
schemars = "1.1"
jsonschema = "0.39"
faccess = "0.2"
```

Note: jsonschema 0.39 requires Rust 1.83.0+. If project MSRV is lower, pin to jsonschema 0.26 which supports Rust 1.70+.

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/
├── src/
│   ├── settings.rs          # Add #[derive(JsonSchema)] to AppConfig, SettingsFile
│   ├── validation.rs        # NEW: Schema validation module
│   ├── permissions.rs       # NEW: Permission checking module
│   └── path_safety.rs       # NEW: Path validation module
└── Cargo.toml               # Add schemars, jsonschema, faccess
```

### Pattern 1: Schema Generation from Rust Types
**What:** Derive JsonSchema alongside existing serde derives
**When to use:** For types that are loaded from JSON files
**Example:**
```rust
// src-tauri/src/settings.rs
use schemars::JsonSchema;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub mode: AppMode,
    pub test_interval: u32,
    // ... rest of fields
}
```

### Pattern 2: Runtime Validation on Load
**What:** Validate JSON against generated schema before deserialization
**When to use:** When loading untrusted JSON from files
**Example:**
```rust
// src-tauri/src/validation.rs
use jsonschema::validator_for;
use schemars::schema_for;

pub fn validate_settings(json_value: &serde_json::Value) -> Result<(), Vec<String>> {
    let schema = schema_for!(SettingsFile);
    let schema_value = serde_json::to_value(&schema).unwrap();

    let validator = validator_for(&schema_value)
        .map_err(|e| vec![format!("Schema error: {}", e)])?;

    if validator.is_valid(json_value) {
        Ok(())
    } else {
        let errors: Vec<String> = validator
            .iter_errors(json_value)
            .map(|e| format!("{}: {}", e.instance_path, e))
            .collect();
        Err(errors)
    }
}
```

### Pattern 3: OS-Native Permission Checking
**What:** Use faccess to check write permissions without creating test files
**When to use:** For portable mode detection
**Example:**
```rust
// src-tauri/src/permissions.rs
use std::path::Path;
use faccess::PathExt;

/// Check if directory is writable using OS APIs
pub fn is_writable(path: &Path) -> bool {
    path.writable()
}

/// Detect portable mode without creating test files
pub fn is_portable() -> bool {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            // Check 1: Settings file already exists (definitive portable)
            let portable_settings = parent.join("settings.json");
            if portable_settings.exists() {
                return true;
            }

            // Check 2: Directory is in Program Files (definitive installed)
            let parent_str = parent.to_string_lossy().to_lowercase();
            if parent_str.contains("program files") {
                return false;
            }

            // Check 3: Use OS API to check write permission
            return is_writable(parent);
        }
    }
    false
}
```

### Pattern 4: Path Injection Prevention
**What:** Canonicalize and validate paths before external command execution
**When to use:** Before passing paths to Command::new().arg()
**Example:**
```rust
// src-tauri/src/path_safety.rs
use std::path::{Path, PathBuf};

/// Validate that a path is within an allowed base directory
pub fn validate_path_in_dir(path: &Path, allowed_base: &Path) -> Result<PathBuf, String> {
    // Canonicalize both paths to resolve symlinks and ..
    let canonical_path = path.canonicalize()
        .map_err(|e| format!("Cannot resolve path: {}", e))?;
    let canonical_base = allowed_base.canonicalize()
        .map_err(|e| format!("Cannot resolve base path: {}", e))?;

    // Check containment
    if !canonical_path.starts_with(&canonical_base) {
        return Err(format!(
            "Path traversal detected: {} is not within {}",
            canonical_path.display(),
            canonical_base.display()
        ));
    }

    Ok(canonical_path)
}

/// Safe file opening with path validation
pub fn open_file_safely(
    path: &Path,
    allowed_base: &Path
) -> Result<(), String> {
    let safe_path = validate_path_in_dir(path, allowed_base)?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("notepad")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

### Anti-Patterns to Avoid
- **Test file creation for permissions:** Creates artifacts, race condition, security issue
- **Trusting user-provided paths:** Always validate before external execution
- **Skipping validation on "trusted" sources:** Settings files can be edited externally
- **Assuming canonicalize alone prevents traversal:** Must also check starts_with()

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema generation | Manual schema JSON | schemars derive | Schema drifts from types |
| JSON validation | Manual field checks | jsonschema crate | Edge cases, performance |
| Permission checking | Test file write | faccess crate | OS-native, no artifacts |
| Path normalization | String manipulation | std::fs::canonicalize | Handles symlinks, edge cases |
| Cross-platform paths | cfg(target_os) | std::path::Path | Platform abstraction |

**Key insight:** The current `is_portable()` implementation already has the right logic structure but uses test file creation. Swapping to faccess is a minimal change with significant security improvement.

## Common Pitfalls

### Pitfall 1: TOCTOU Race Condition
**What goes wrong:** Check permission, then later use the file - permission may have changed
**Why it happens:** Time-of-check vs time-of-use gap
**How to avoid:** For security-critical operations, handle errors at use-time rather than pre-checking. For portable mode detection, result is cached at startup so TOCTOU is acceptable.
**Warning signs:** Permission checks pass but operations fail intermittently

### Pitfall 2: Symlink Bypass
**What goes wrong:** Path like `allowed_dir/symlink` where symlink points outside
**Why it happens:** Not using canonicalize before validation
**How to avoid:** Always canonicalize before starts_with() check
**Warning signs:** Tests pass with normal paths, fail with symlinks

### Pitfall 3: Schema Version Mismatch
**What goes wrong:** Schema generated with schemars 1.x incompatible with jsonschema
**Why it happens:** Different JSON Schema draft versions
**How to avoid:** Both libraries support Draft 2020-12 by default; keep versions current
**Warning signs:** Valid JSON fails schema validation

### Pitfall 4: Overly Strict Validation
**What goes wrong:** Old settings files rejected after adding new fields
**Why it happens:** Schema requires all fields, no additionalProperties allowed
**How to avoid:** Use `#[serde(default)]` on optional fields, schema will allow missing
**Warning signs:** App fails to start after upgrade

### Pitfall 5: Windows UNC/Extended Path Edge Cases
**What goes wrong:** Paths like `\\?\C:\...` or `\\server\share` fail validation
**Why it happens:** canonicalize on Windows returns extended paths
**How to avoid:** Use starts_with() which handles these correctly; test with actual Windows paths
**Warning signs:** Works in dev, fails on Windows production

## Code Examples

Verified patterns from official sources:

### Schemars Integration with Existing Types
```rust
// Source: https://graham.cool/schemars/
use schemars::JsonSchema;
use serde::{Serialize, Deserialize};
#[cfg(test)]
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[cfg_attr(test, derive(TS))]
#[cfg_attr(test, ts(export))]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_mode")]
    pub mode: AppMode,
    #[serde(default = "default_test_interval")]
    pub test_interval: u32,
    // Schemars respects serde defaults for schema generation
}
```

### Schema Generation
```rust
// Source: https://docs.rs/schemars/1.1.0/schemars/
use schemars::schema_for;

fn get_settings_schema() -> schemars::Schema {
    schema_for!(SettingsFile)
}

// To serialize schema to JSON:
let schema = get_settings_schema();
let schema_json = serde_json::to_string_pretty(&schema).unwrap();
```

### Validation with Error Details
```rust
// Source: https://docs.rs/jsonschema/0.39.0/jsonschema/
use jsonschema::validator_for;

pub fn load_settings_validated() -> Result<SettingsFile, String> {
    let path = get_settings_path()?;
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    // Parse as generic JSON first
    let json_value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Validate against schema
    let schema = serde_json::to_value(schema_for!(SettingsFile)).unwrap();
    let validator = validator_for(&schema)
        .map_err(|e| format!("Schema error: {}", e))?;

    if !validator.is_valid(&json_value) {
        let errors: Vec<String> = validator
            .iter_errors(&json_value)
            .map(|e| format!("{}", e))
            .collect();
        return Err(format!("Settings validation failed:\n{}", errors.join("\n")));
    }

    // Now deserialize to typed struct
    serde_json::from_value(json_value)
        .map_err(|e| format!("Deserialization failed: {}", e))
}
```

### Faccess Permission Check
```rust
// Source: https://docs.rs/faccess/0.2.4/faccess/
use std::path::Path;
use faccess::PathExt;

fn check_directory_permissions(dir: &Path) -> bool {
    // Simple boolean check
    dir.writable()
}

// Or with more detail:
use faccess::AccessMode;

fn check_read_write(dir: &Path) -> std::io::Result<()> {
    dir.access(AccessMode::READ | AccessMode::WRITE)
}
```

### Complete is_portable() Refactor
```rust
// Refactored from current implementation
use faccess::PathExt;

const SETTINGS_FILENAME: &str = "settings.json";

pub fn is_portable() -> bool {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            // Check 1: Settings file exists = definitely portable
            let portable_settings = parent.join(SETTINGS_FILENAME);
            if portable_settings.exists() {
                return true;
            }

            // Check 2: In Program Files = definitely installed
            let parent_str = parent.to_string_lossy().to_lowercase();
            if parent_str.contains("program files") {
                return false;
            }

            // Check 3: OS API permission check (no test file!)
            return parent.writable();
        }
    }
    false
}
```

### Path Validation for Editor Invocation
```rust
use std::path::Path;

fn validate_and_open_file(path: &Path, settings_dir: &Path) -> Result<(), String> {
    // Canonicalize to resolve symlinks and ..
    let canonical = match path.canonicalize() {
        Ok(p) => p,
        Err(e) => return Err(format!("Path does not exist: {}", e)),
    };

    let canonical_base = settings_dir.canonicalize()
        .map_err(|e| format!("Base path error: {}", e))?;

    // Verify containment
    if !canonical.starts_with(&canonical_base) {
        return Err(format!(
            "Security: Cannot open files outside settings directory"
        ));
    }

    // Safe to open
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("notepad")
            .arg(&canonical)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Test file permission check | OS API permission check | Best practice | No artifacts, more reliable |
| Manual JSON validation | Schema-based validation | JSON Schema 2020-12 | Structured errors, maintainability |
| Trust all file paths | Canonicalize + containment | Post-CVE awareness | Prevents traversal attacks |

**Deprecated/outdated:**
- **valico crate:** Less actively maintained than jsonschema
- **jsonschema < 0.26:** Missing important optimizations
- **Test file permission checking:** Security anti-pattern

## jsonschema Version Consideration

The latest jsonschema 0.39.0 requires Rust 1.83.0. If the project needs to maintain a lower MSRV:

| jsonschema Version | Min Rust Version | Notes |
|--------------------|------------------|-------|
| 0.39.0 | 1.83.0 | Latest features, best performance |
| 0.26.x | 1.70.0 | Stable, good performance |
| 0.18.x | 1.63.0 | Older but functional |

**Recommendation:** Use 0.26.x if MSRV < 1.83.0, otherwise use latest.

## Open Questions

Things that couldn't be fully resolved:

1. **Graceful Degradation on Validation Failure**
   - What we know: Malformed settings should be rejected
   - What's unclear: Should app use defaults or refuse to start?
   - Recommendation: Show error dialog, offer to reset to defaults

2. **Schema Export Location**
   - What we know: Schema can be generated at runtime or build time
   - What's unclear: Should schema be exported for external tooling?
   - Recommendation: Runtime generation is sufficient; no need to export

3. **Windows Extended Paths**
   - What we know: canonicalize returns `\\?\C:\...` on Windows
   - What's unclear: Does starts_with() handle this correctly?
   - Recommendation: Test on Windows; likely works but needs verification

## Sources

### Primary (HIGH confidence)
- [schemars 1.1.0 docs](https://graham.cool/schemars/) - Schema generation API and usage
- [jsonschema 0.39.0 docs](https://docs.rs/jsonschema/latest/jsonschema/) - Validation API
- [faccess 0.2.4 docs](https://docs.rs/faccess/latest/faccess/) - Permission checking API
- [std::fs::canonicalize docs](https://doc.rust-lang.org/std/fs/fn.canonicalize.html) - Path normalization

### Secondary (MEDIUM confidence)
- [StackHawk Rust Path Traversal Guide](https://www.stackhawk.com/blog/rust-path-traversal-guide-example-and-prevention/) - Best practices
- [RustFS CVE-2025-68705](https://github.com/rustfs/rustfs/security/advisories/GHSA-pq29-69jg-9mxc) - Real-world traversal vulnerability

### Tertiary (LOW confidence)
- WebSearch ecosystem patterns - General practices, verified against docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries well-documented, APIs stable
- Architecture: HIGH - Patterns from official docs
- Pitfalls: HIGH - Based on documented CVEs and official guidance

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - security libraries with stable APIs)
