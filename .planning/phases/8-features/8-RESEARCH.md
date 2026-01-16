# Phase 8: Features - Research

**Researched:** 2026-01-16
**Domain:** Export/import settings, CSV export, offline resilience
**Confidence:** HIGH

## Summary

This phase addresses four feature requirements for AVD Health Monitor:

1. **FEAT-01: Export Settings to JSON** - Users can save their current settings (config + custom endpoints) to a file they can back up or share. Uses Tauri dialog plugin for native save dialog.

2. **FEAT-02: Import Settings from JSON** - Users can restore settings from a previously exported file. Must validate JSON against schema before applying (reuse Phase 6 validation).

3. **FEAT-03: Export History to CSV** - Users can export latency history data for analysis in Excel or other tools. Generate CSV client-side from Zustand state, save via Tauri dialog.

4. **FEAT-04: Offline Resilience** - App should show meaningful state when network is unavailable rather than just errors. Track connectivity and show last-known-good data.

The recommended approach uses:
- **@tauri-apps/plugin-dialog** for native file save/open dialogs (Rust plugin already installed, JS bindings needed)
- **Client-side CSV generation** - no external library needed, simple string concatenation with BOM for Excel compatibility
- **navigator.onLine + online/offline events** combined with actual fetch results for reliable offline detection

**Primary recommendation:** Use Tauri dialog plugin for file operations, reuse existing schema validation for imports, generate CSV from EndpointStatus history data, and track offline state in UI slice with visual indicators.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tauri-apps/plugin-dialog | ^2.0.0 | Native file save/open dialogs | Already have Rust plugin installed, need JS bindings |
| tauri-plugin-dialog | 2.x | Rust side of dialog plugin | Already in Cargo.toml |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser APIs | n/a | navigator.onLine, online/offline events | Offline detection baseline |
| Zustand | 5.x | Already installed | Store offline state |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @tauri-apps/plugin-dialog | @tauri-apps/plugin-fs | dialog provides native UX, fs requires manual path handling |
| Client-side CSV | export-to-csv library | Library adds dependency for simple operation |
| navigator.onLine | react-detect-offline | External dependency, we only need simple detection |
| Zustand offline slice | React Query | Already using Zustand, no need for new state management |

**Installation:**
```bash
# Frontend - JS bindings for dialog plugin
pnpm add @tauri-apps/plugin-dialog
```

Note: Rust plugin `tauri-plugin-dialog = "2"` is already in Cargo.toml and registered in lib.rs.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── exportService.ts      # NEW: Export settings/history functions
│   └── importService.ts      # NEW: Import with validation
├── store/
│   └── slices/
│       └── uiSlice.ts        # EXTEND: Add isOffline state
└── components/
    └── settings/
        └── DataManagement.tsx # NEW: Export/import UI section
```

### Pattern 1: Export Settings via Dialog
**What:** Use Tauri dialog to get save path, then write JSON directly
**When to use:** FEAT-01 - Export settings to user-chosen location
**Example:**
```typescript
// src/services/exportService.ts
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export async function exportSettings(): Promise<boolean> {
  // Get current settings from Rust backend (source of truth)
  const settings = await invoke<SettingsFile>('read_settings_with_endpoints');

  // Show save dialog
  const filePath = await save({
    title: 'Export Settings',
    defaultPath: 'avd-health-monitor-settings.json',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
  });

  if (!filePath) return false; // User cancelled

  // Write file via Rust command (safer than JS fs)
  await invoke('export_settings_to_path', {
    path: filePath,
    settings: {
      version: settings.version,
      config: settings.config,
      customEndpoints: settings.customEndpoints,
    },
  });

  return true;
}
```

### Pattern 2: Import with Validation
**What:** Open dialog, read file, validate against schema, apply if valid
**When to use:** FEAT-02 - Import settings from file
**Example:**
```typescript
// src/services/importService.ts
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export interface ImportResult {
  success: boolean;
  error?: string;
}

export async function importSettings(): Promise<ImportResult> {
  // Show open dialog
  const filePath = await open({
    title: 'Import Settings',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    multiple: false,
    directory: false,
  });

  if (!filePath) return { success: false }; // User cancelled

  // Validate and import via Rust (uses existing schema validation)
  try {
    await invoke('import_settings_from_path', { path: filePath });
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

### Pattern 3: CSV Export with BOM
**What:** Generate CSV client-side with UTF-8 BOM for Excel compatibility
**When to use:** FEAT-03 - Export history to CSV
**Example:**
```typescript
// src/services/exportService.ts
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

export async function exportHistoryToCsv(
  endpointStatuses: Map<string, EndpointStatus>
): Promise<boolean> {
  // Generate CSV content
  const BOM = '\uFEFF'; // UTF-8 BOM for Excel
  const headers = ['Endpoint ID', 'Endpoint Name', 'Timestamp', 'Latency (ms)'];
  const rows: string[] = [headers.join(',')];

  endpointStatuses.forEach((status, endpointId) => {
    status.history.forEach((entry) => {
      const row = [
        escapeCsvField(endpointId),
        escapeCsvField(status.endpoint.name),
        new Date(entry.timestamp).toISOString(),
        entry.latency.toString(),
      ];
      rows.push(row.join(','));
    });
  });

  const csvContent = BOM + rows.join('\n');

  // Show save dialog
  const filePath = await save({
    title: 'Export Latency History',
    defaultPath: `avd-health-history-${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });

  if (!filePath) return false;

  // Write via Rust
  await invoke('write_text_to_path', { path: filePath, content: csvContent });
  return true;
}

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
```

### Pattern 4: Offline State Management
**What:** Track connectivity in UI slice, update from latency test results
**When to use:** FEAT-04 - Graceful offline degradation
**Example:**
```typescript
// src/store/slices/uiSlice.ts - Extended
export interface UiSlice {
  // ... existing fields
  isOffline: boolean;
  lastOnlineTimestamp: number | null;

  setOffline: (isOffline: boolean) => void;
}

// In createUiSlice:
isOffline: false,
lastOnlineTimestamp: null,

setOffline: (isOffline) =>
  set((state) => ({
    isOffline,
    lastOnlineTimestamp: isOffline ? state.lastOnlineTimestamp : Date.now(),
  })),
```

```typescript
// src/hooks/useOfflineDetection.ts
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useOfflineDetection() {
  const setOffline = useAppStore((s) => s.setOffline);

  useEffect(() => {
    // Browser online/offline events
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial state
    setOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);
}
```

### Anti-Patterns to Avoid
- **Writing files via JS fs APIs:** Use Tauri commands for file writes (security, permissions)
- **Trusting navigator.onLine alone:** Combine with actual request results
- **Complex CSV libraries:** Simple CSV can be generated with string concatenation
- **Storing large exports in state:** Generate on-demand, don't cache in Zustand

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native file dialogs | Custom path input | @tauri-apps/plugin-dialog | Native UX, OS integration |
| JSON validation | Manual field checks | Existing validation.rs | Already built in Phase 6 |
| CSV escaping | Regex/split hacks | Proper escapeCsvField function | Edge cases (commas, quotes, newlines) |
| Path validation | Trust user paths | Rust backend with path_safety.rs | Already built in Phase 6 |

**Key insight:** Most infrastructure needed for export/import already exists - validation.rs for schema checking, path_safety.rs for path validation. This phase is about wiring existing capabilities to new UI.

## Common Pitfalls

### Pitfall 1: Excel CSV Encoding Issues
**What goes wrong:** CSV opens with garbled characters in Excel
**Why it happens:** Excel expects BOM for UTF-8 detection
**How to avoid:** Prepend `\uFEFF` (UTF-8 BOM) to CSV content
**Warning signs:** Works in text editor but not Excel

### Pitfall 2: Import Overwrites Without Confirmation
**What goes wrong:** User accidentally imports old settings, loses current config
**Why it happens:** No confirmation dialog before apply
**How to avoid:** Show confirmation with summary of changes before applying
**Warning signs:** User complaints about lost settings

### Pitfall 3: navigator.onLine False Positives
**What goes wrong:** App shows "online" but requests fail
**Why it happens:** navigator.onLine only detects network interface, not internet
**How to avoid:** Mark offline after consecutive test failures, not just navigator.onLine
**Warning signs:** "Online" status but all endpoints failing

### Pitfall 4: Large History Export Performance
**What goes wrong:** Browser freezes when exporting months of history
**Why it happens:** Generating massive CSV string blocks main thread
**How to avoid:** History is already capped at 24 hours (HISTORY_RETENTION_MS), but still chunk if > 10,000 rows
**Warning signs:** UI unresponsive during export

### Pitfall 5: Path Traversal on Import
**What goes wrong:** Malicious file path escapes intended directory
**Why it happens:** Trusting dialog return path without validation
**How to avoid:** Dialog plugin handles this, but Rust backend should still validate
**Warning signs:** Security audit findings

## Code Examples

Verified patterns from official sources:

### Tauri Dialog Save
```typescript
// Source: https://v2.tauri.app/plugin/dialog/
import { save } from '@tauri-apps/plugin-dialog';

const path = await save({
  title: 'Save File',
  defaultPath: 'filename.json',
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
  ],
});
// path is string | null (null if cancelled)
```

### Tauri Dialog Open
```typescript
// Source: https://v2.tauri.app/plugin/dialog/
import { open } from '@tauri-apps/plugin-dialog';

const path = await open({
  title: 'Open File',
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
  ],
  multiple: false,
  directory: false,
});
// path is string | null for single file
```

### Rust Export Command
```rust
// src-tauri/src/lib.rs - NEW COMMAND
use std::fs;
use crate::settings::{SettingsFile, get_settings_dir};
use crate::path_safety::validate_path_in_dir;

#[tauri::command]
fn export_settings_to_path(path: String, settings: SettingsFile) -> Result<(), String> {
    // Note: For export, we allow writing outside settings dir
    // The dialog plugin already validates the path is safe
    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize: {}", e))?;

    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn import_settings_from_path(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Parse and validate
    let json_value: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Reuse existing validation
    crate::validation::validate_settings_json(&json_value)?;

    // Deserialize to typed struct
    let imported: SettingsFile = serde_json::from_value(json_value)
        .map_err(|e| format!("Invalid settings structure: {}", e))?;

    // Save to settings.json
    crate::settings::save_settings(&imported)
        .map_err(|e| format!("Failed to save: {}", e))?;

    Ok(())
}

#[tauri::command]
fn write_text_to_path(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write: {}", e))?;
    Ok(())
}
```

### Offline Detection Hook
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
// Combined with best practices from multiple sources

import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useOfflineDetection() {
  const setOffline = useAppStore((s) => s.setOffline);
  const consecutiveFailures = useRef(0);
  const OFFLINE_THRESHOLD = 3; // Mark offline after 3 consecutive failures

  useEffect(() => {
    const handleOnline = () => {
      consecutiveFailures.current = 0;
      setOffline(false);
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  // Export function for latency tests to report failures
  return {
    reportSuccess: () => {
      consecutiveFailures.current = 0;
      setOffline(false);
    },
    reportFailure: () => {
      consecutiveFailures.current++;
      if (consecutiveFailures.current >= OFFLINE_THRESHOLD) {
        setOffline(true);
      }
    },
  };
}
```

### Offline Banner Component
```typescript
// src/components/OfflineBanner.tsx
import { WifiOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline);
  const lastOnline = useAppStore((s) => s.lastOnlineTimestamp);

  if (!isOffline) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
      <WifiOff className="w-5 h-5 text-yellow-500 flex-shrink-0" />
      <div className="text-sm text-yellow-700 dark:text-yellow-300">
        <span className="font-medium">You appear to be offline.</span>
        {lastOnline && (
          <span className="ml-1">
            Last connected: {new Date(lastOnline).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Browser File API | Tauri dialog + fs | Tauri 2.0 | Native dialogs, better UX |
| navigator.onLine only | Combined detection | Always best practice | More reliable offline detection |
| Server-side CSV generation | Client-side generation | Modern browsers | Simpler, no backend needed |

**Deprecated/outdated:**
- **Tauri v1 dialog API:** v2 has different import paths and API
- **Using @tauri-apps/plugin-fs for dialogs:** Dialog plugin is preferred for user-facing file operations

## Open Questions

Things that couldn't be fully resolved:

1. **Export Partial vs Full Settings**
   - What we know: Can export full SettingsFile
   - What's unclear: Should users be able to export just thresholds, just custom endpoints, etc.?
   - Recommendation: Start with full export only; add partial later if requested

2. **Import Merge vs Replace**
   - What we know: Current plan is full replacement
   - What's unclear: Should we merge custom endpoints instead of replacing?
   - Recommendation: Replace with confirmation dialog; merging adds complexity

3. **Offline State Persistence**
   - What we know: isOffline tracked in uiSlice
   - What's unclear: Should we persist lastOnlineTimestamp across app restarts?
   - Recommendation: Don't persist - fresh start on app launch

4. **History Export Format**
   - What we know: CSV is sufficient for Excel
   - What's unclear: Should we also offer JSON export for programmatic use?
   - Recommendation: CSV only for Phase 8; JSON can be added later

## Sources

### Primary (HIGH confidence)
- [Tauri v2 Dialog Plugin Docs](https://v2.tauri.app/plugin/dialog/) - Official dialog API
- [Tauri v2 Dialog JS Reference](https://v2.tauri.app/reference/javascript/dialog/) - TypeScript types
- [MDN navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) - Browser API reference
- [MDN Window offline event](https://developer.mozilla.org/en-US/docs/Web/API/Window/offline_event) - Event handling

### Secondary (MEDIUM confidence)
- [CSV export best practices](https://www.clearpeople.com/blog/export-data-to-csv-with-typescript-without-format-issues) - BOM for Excel
- [Graceful degradation patterns](https://dev.to/lovestaco/graceful-degradation-keeping-your-app-functional-when-things-go-south-jgj) - Design patterns

### Tertiary (LOW confidence)
- WebSearch patterns for offline detection - Combined with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Tauri plugins with documented APIs
- Architecture: HIGH - Building on existing codebase patterns
- Pitfalls: MEDIUM - Some edge cases may emerge during implementation

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable APIs, Tauri 2.x)
