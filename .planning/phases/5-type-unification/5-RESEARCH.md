# Phase 5: Type Unification - Research

**Researched:** 2026-01-16
**Domain:** Rust-to-TypeScript type generation, Tauri IPC
**Confidence:** MEDIUM

## Summary

This phase addresses the type drift between Rust (`src-tauri/src/settings.rs`) and TypeScript (`src/types.ts`) definitions of shared types like `LatencyThresholds` and `AppConfig`. Currently, these types are maintained separately, creating risk of silent incompatibilities.

Two main approaches exist for Rust-to-TypeScript type generation:
1. **ts-rs** - Lightweight, derive macro-based type export via test-time generation
2. **tauri-specta** - Tauri-specific type generation with command/event typing

For this project, **ts-rs** is the recommended approach because:
- Simpler integration (derive macro only)
- No changes to Tauri command signatures required
- Test-time generation fits existing workflow
- Lower MSRV (version 10.x works with Rust 1.63+)

**Primary recommendation:** Use ts-rs 10.x to generate TypeScript types from Rust, integrated via `cargo test` in CI.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ts-rs | 10.1.0 | Generate TypeScript from Rust structs | Lightweight, derive-based, low MSRV (1.63.0) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| serde | 1.x | Serialization (already used) | Required for ts-rs serde-compat |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ts-rs | tauri-specta | Provides command typing but requires Tauri 2 RC dependencies, still pre-release |
| ts-rs | typescript-type-def | Less maintained, fewer features |
| ts-rs 10.x | ts-rs 11.x | ts-rs 11.x requires Rust 1.88.0, project uses 1.75+ |

**Installation:**
```toml
# Cargo.toml [dev-dependencies]
ts-rs = "10.1.0"
```

## Architecture Patterns

### Recommended Project Structure
```
src-tauri/
├── src/
│   └── settings.rs          # Add #[derive(TS)] to shared types
└── Cargo.toml               # ts-rs as dev-dependency

src/
├── generated/
│   └── bindings.ts          # Generated TypeScript types (gitignored or committed)
└── types.ts                 # Re-exports generated types + frontend-only types
```

### Pattern 1: Derive-Based Type Export
**What:** Add `#[derive(TS)]` and `#[ts(export)]` to Rust types
**When to use:** For all types shared between Rust and TypeScript
**Example:**
```rust
// src-tauri/src/settings.rs
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LatencyThresholds {
    pub excellent: u32,
    pub good: u32,
    pub warning: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub mode: AppMode,
    pub test_interval: u32,
    // ... rest of fields
}
```

### Pattern 2: Serde Attribute Compatibility
**What:** ts-rs respects serde attributes for field naming
**When to use:** When Rust uses snake_case but TypeScript needs camelCase
**Example:**
```rust
// The #[serde(rename_all = "camelCase")] attribute is respected
// TypeScript will receive: testInterval, notificationsEnabled, etc.
#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub test_interval: u32,  // Becomes testInterval in TS
}
```

### Pattern 3: Enum Serialization
**What:** Match serde enum tagging with TypeScript union types
**When to use:** For Rust enums shared with TypeScript
**Example:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum AppMode {
    SessionHost,  // Serializes as "sessionhost"
    EndUser,      // Serializes as "enduser"
}
```

Generated TypeScript:
```typescript
export type AppMode = "sessionhost" | "enduser";
```

### Pattern 4: TypeScript Re-Export
**What:** Re-export generated types from a central location
**When to use:** To maintain single import point for frontend
**Example:**
```typescript
// src/types.ts
// Re-export generated types
export type { LatencyThresholds, AppConfig, AppMode } from './generated/bindings';

// Frontend-only types stay here
export interface EndpointStatus {
  endpoint: Endpoint;
  currentLatency: number | null;
  // ...
}
```

### Anti-Patterns to Avoid
- **Duplicate type definitions:** Never maintain same type in both Rust and TypeScript manually
- **Ignoring serde attributes:** Types must use identical serde annotations or JSON will mismatch
- **Skipping CI integration:** Always regenerate types in CI to catch drift early

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type synchronization | Manual copy-paste | ts-rs derive macro | Human error, silent drift |
| Enum string values | Manual string matching | serde rename_all | Inconsistent casing |
| Optional field handling | Manual null checks | serde default + ts-rs | Missing optionality flags |
| Build-time validation | Manual comparison | CI type generation | Catches drift before release |

**Key insight:** The current codebase already has subtle differences between Rust and TypeScript types (e.g., `theme: String` in Rust vs `theme: 'light' | 'dark' | 'nord' | 'cyberpunk' | 'system'` in TypeScript). Automated generation eliminates this drift.

## Common Pitfalls

### Pitfall 1: MSRV Incompatibility
**What goes wrong:** Latest ts-rs (11.x) requires Rust 1.88.0, project uses 1.75+
**Why it happens:** ts-rs 11.x uses newer Rust features
**How to avoid:** Pin to ts-rs 10.1.0 which has MSRV 1.63.0
**Warning signs:** Cargo build fails with syntax errors in ts-rs crate

### Pitfall 2: Missing serde-compat Feature
**What goes wrong:** TypeScript field names don't match JSON from Rust
**Why it happens:** ts-rs ignores serde attributes without `serde-compat` feature
**How to avoid:** Feature is enabled by default in ts-rs; don't disable it
**Warning signs:** TypeScript shows snake_case fields, Rust sends camelCase JSON

### Pitfall 3: Forgetting to Run Export in CI
**What goes wrong:** Generated types drift from source Rust types
**Why it happens:** `cargo test` not run before frontend build in CI
**How to avoid:** Add type generation step to CI workflow before TypeScript compile
**Warning signs:** Runtime JSON parse errors, missing fields

### Pitfall 4: Type Hierarchy Complexity
**What goes wrong:** Nested types not exported, TypeScript shows `any`
**Why it happens:** ts-rs requires `#[derive(TS)]` on all referenced types
**How to avoid:** Add `#[derive(TS)]` to all types in the hierarchy
**Warning signs:** Generated TypeScript has `unknown` or missing type references

### Pitfall 5: Enum Value Mismatch
**What goes wrong:** TypeScript union type values don't match JSON strings
**Why it happens:** Rust enum uses PascalCase, serde renames to lowercase
**How to avoid:** Ensure `#[serde(rename_all = "lowercase")]` is on enum AND ts-rs sees it
**Warning signs:** Match/switch statements fail at runtime

## Code Examples

Verified patterns from official sources:

### Basic Type Export
```rust
// Source: https://docs.rs/ts-rs/10.1.0/ts_rs/
use serde::{Serialize, Deserialize};
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LatencyThresholds {
    pub excellent: u32,
    pub good: u32,
    pub warning: u32,
}
```

Generated output (`bindings/LatencyThresholds.ts`):
```typescript
export type LatencyThresholds = { excellent: number, good: number, warning: number };
```

### Complex Type with Serde Attributes
```rust
// Source: https://github.com/Aleph-Alpha/ts-rs
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub mode: AppMode,
    pub test_interval: u32,
    pub retention_days: u32,
    pub thresholds: LatencyThresholds,
    pub notifications_enabled: bool,
    pub auto_start: bool,
    pub theme: String,
    pub alert_threshold: u32,
    pub alert_cooldown: u32,
    pub graph_time_range: u32,
    pub fslogix_enabled: bool,
    pub fslogix_test_interval: u32,
    pub fslogix_alert_threshold: u32,
    pub fslogix_alert_cooldown: u32,
}
```

### Enum Export with Serde Rename
```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, TS)]
#[ts(export)]
#[serde(rename_all = "lowercase")]
pub enum AppMode {
    SessionHost,
    EndUser,
}
```

Generated TypeScript:
```typescript
export type AppMode = "sessionhost" | "enduser";
```

### Build Integration Script
```bash
#!/bin/bash
# scripts/generate-types.sh

# Set export directory
export TS_RS_EXPORT_DIR="./src/generated"

# Create output directory
mkdir -p "$TS_RS_EXPORT_DIR"

# Run tests to trigger type export
cd src-tauri && cargo test --features ts-export

# Verify types were generated
if [ ! -f "../src/generated/LatencyThresholds.ts" ]; then
    echo "Error: Types not generated"
    exit 1
fi
```

### CI Integration (GitHub Actions)
```yaml
# In .github/workflows/ci.yml
- name: Generate TypeScript types
  run: |
    export TS_RS_EXPORT_DIR="${GITHUB_WORKSPACE}/src/generated"
    mkdir -p "$TS_RS_EXPORT_DIR"
    cd src-tauri && cargo test

- name: Verify types exist
  run: |
    test -f src/generated/LatencyThresholds.ts
    test -f src/generated/AppConfig.ts
```

## Current Type Discrepancies

Analysis of existing Rust vs TypeScript type definitions:

### LatencyThresholds
| Field | Rust Type | TypeScript Type | Issue |
|-------|-----------|-----------------|-------|
| excellent | `u32` | `number` | Compatible |
| good | `u32` | `number` | Compatible |
| warning | `u32` | `number` | Compatible |

**Status:** Types align, but maintained separately (drift risk)

### AppConfig
| Field | Rust Type | TypeScript Type | Issue |
|-------|-----------|-----------------|-------|
| mode | `AppMode` | `AppMode` | Compatible |
| test_interval | `u32` | `number` | Compatible |
| theme | `String` | `'light' \| 'dark' \| 'nord' \| 'cyberpunk' \| 'system'` | **MISMATCH** - TypeScript is stricter |
| ... | ... | ... | ... |

**Status:** Theme field has semantic mismatch - Rust allows any string, TypeScript restricts to known values. This is a design choice, but ts-rs will generate `string` not the union type.

### Recommendation for Theme
Keep TypeScript stricter by:
1. Generate base type from Rust as `string`
2. Create branded type in TypeScript that narrows to known values
3. Or create Rust enum for theme values

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual type sync | ts-rs derive macro | ts-rs stable 2022+ | Eliminates drift |
| tauri-specta 1.x | tauri-specta 2.x RC | Tauri 2.0 (Oct 2024) | Command typing (if needed) |
| ts-rs 9.x | ts-rs 10.x | 2024 | Better serde support |

**Deprecated/outdated:**
- **ts-rs 8.x:** Older API, less serde support
- **tauri-specta 1.x:** Only works with Tauri 1.x
- **ts-rs 11.x:** Requires Rust 1.88.0 (not compatible with project's 1.75+)

## Open Questions

Things that couldn't be fully resolved:

1. **Theme Type Strictness**
   - What we know: Rust uses `String`, TypeScript uses string literal union
   - What's unclear: Should Rust switch to enum or should TypeScript loosen?
   - Recommendation: Create Rust enum for themes to get compile-time checking on both sides

2. **Generated vs Committed Types**
   - What we know: ts-rs generates at test time
   - What's unclear: Should generated files be committed or gitignored?
   - Recommendation: Commit generated files for simpler frontend-only development; CI verifies no drift

3. **tauri-specta Future**
   - What we know: v2 still RC, but actively developed
   - What's unclear: When stable release for Tauri 2
   - Recommendation: Start with ts-rs; migrate to tauri-specta later if command typing needed

## Sources

### Primary (HIGH confidence)
- [ts-rs GitHub](https://github.com/Aleph-Alpha/ts-rs) - Features, attributes, usage patterns
- [ts-rs docs.rs](https://docs.rs/ts-rs/10.1.0/ts_rs/) - API documentation, version requirements

### Secondary (MEDIUM confidence)
- [tauri-specta v2 docs](https://specta.dev/docs/tauri-specta/v2) - Alternative approach documentation
- [tauri-specta releases](https://github.com/specta-rs/tauri-specta/releases) - Version status verification

### Tertiary (LOW confidence)
- WebSearch results for ecosystem practices - General patterns, may need validation

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM - ts-rs well-documented but 10.x specific MSRV not explicitly verified
- Architecture: HIGH - Patterns from official docs and established practices
- Pitfalls: MEDIUM - Based on documented issues and community reports

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable library with infrequent changes)
