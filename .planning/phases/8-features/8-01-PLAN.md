---
phase: 8-features
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/src/lib.rs
  - src-tauri/src/export.rs
  - src/services/exportService.ts
  - src/services/importService.ts
  - src/components/settings/DataManagement.tsx
  - src/components/SettingsPanel.tsx
autonomous: true

must_haves:
  truths:
    - "User can export settings to a JSON file they choose"
    - "User can import settings from a previously exported JSON file"
    - "Invalid import files are rejected with clear error message"
    - "Successful import refreshes the UI with new settings"
  artifacts:
    - path: "src-tauri/src/export.rs"
      provides: "Export/import Rust commands"
      exports: ["export_settings_to_path", "import_settings_from_path"]
    - path: "src/services/exportService.ts"
      provides: "Export service using Tauri dialog"
      exports: ["exportSettings"]
    - path: "src/services/importService.ts"
      provides: "Import service with validation"
      exports: ["importSettings", "ImportResult"]
    - path: "src/components/settings/DataManagement.tsx"
      provides: "Export/import UI buttons"
      min_lines: 50
  key_links:
    - from: "src/services/exportService.ts"
      to: "@tauri-apps/plugin-dialog"
      via: "save() dialog call"
      pattern: "save\\("
    - from: "src/services/importService.ts"
      to: "@tauri-apps/plugin-dialog"
      via: "open() dialog call"
      pattern: "open\\("
    - from: "src/services/importService.ts"
      to: "import_settings_from_path"
      via: "invoke call"
      pattern: "invoke.*import_settings_from_path"
    - from: "src/components/settings/DataManagement.tsx"
      to: "exportService.ts"
      via: "import and button onClick"
      pattern: "exportSettings"
---

<objective>
Implement settings export and import functionality (FEAT-01, FEAT-02).

Purpose: Allow users to backup and restore their configuration, share settings between machines, or recover from misconfiguration.

Output: Working export/import buttons in Settings panel with native file dialogs.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/8-features/8-RESEARCH.md

@src-tauri/src/lib.rs
@src-tauri/src/settings.rs
@src-tauri/src/validation.rs
@src/components/SettingsPanel.tsx
@src/hooks/useSettingsSync.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add Rust export/import commands</name>
  <files>src-tauri/src/export.rs, src-tauri/src/lib.rs</files>
  <action>
Create new `src-tauri/src/export.rs` module with three Tauri commands:

1. `export_settings_to_path(path: String, settings: SettingsFile) -> Result<(), String>`
   - Write settings to user-chosen path as pretty-printed JSON
   - Path comes from dialog (already validated by Tauri)
   - Use `serde_json::to_string_pretty`

2. `import_settings_from_path(app: AppHandle, path: String) -> Result<SettingsResponse, String>`
   - Read file from path
   - Parse as JSON Value first
   - Call `validation::validate_settings_json(&value)` to validate schema
   - Deserialize to SettingsFile
   - Save to settings.json via `settings::save_settings()`
   - Return the new SettingsResponse so frontend can update state

3. `write_text_to_path(path: String, content: String) -> Result<(), String>`
   - Simple text file writer for CSV export (used by Plan 02)
   - Just `fs::write(path, content)`

In `lib.rs`:
- Add `mod export;`
- Import the three commands
- Register in `invoke_handler![]`
  </action>
  <verify>
`cd src-tauri && cargo check` passes without errors.
  </verify>
  <done>
Three new Tauri commands available: export_settings_to_path, import_settings_from_path, write_text_to_path.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create frontend export/import services</name>
  <files>src/services/exportService.ts, src/services/importService.ts</files>
  <action>
Install dialog plugin JS bindings:
```bash
pnpm add @tauri-apps/plugin-dialog
```

Create `src/services/exportService.ts`:
```typescript
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { SettingsFile } from '../types';

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
```

Create `src/services/importService.ts`:
```typescript
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import type { SettingsResponse } from '../types';

export interface ImportResult {
  success: boolean;
  data?: SettingsResponse;
  error?: string;
}

export async function importSettings(): Promise<ImportResult> {
  const filePath = await open({
    title: 'Import Settings',
    filters: [{ name: 'JSON Files', extensions: ['json'] }],
    multiple: false,
    directory: false,
  });

  if (!filePath || Array.isArray(filePath)) {
    return { success: false }; // User cancelled or multiple files
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
```
  </action>
  <verify>
`pnpm exec tsc --noEmit` passes without type errors.
  </verify>
  <done>
Export and import services created with proper Tauri dialog integration.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add DataManagement component to SettingsPanel</name>
  <files>src/components/settings/DataManagement.tsx, src/components/SettingsPanel.tsx</files>
  <action>
Create `src/components/settings/DataManagement.tsx`:
- Import exportSettings and importSettings from services
- Import useAppStore to get current config and customEndpoints
- Import useSettingsSync for reloading after import
- Two buttons: "Export Settings" and "Import Settings"
- Export button:
  - Calls exportSettings with { version: 1, config, customEndpoints }
  - Shows success/error feedback (use useState for status message)
- Import button:
  - Calls importSettings()
  - On success: call loadSettings() from useSettingsSync to refresh state
  - On error: display the error message
- Use existing UI patterns from other settings components (collapsible section style)
- Include Download and Upload icons from lucide-react

Add to SettingsPanel.tsx:
- Import DataManagement component
- Add new collapsible section at bottom (after FSLogix): "Data Management"
- Add 'data' to collapsedSections state initialization
- Render DataManagement component when not collapsed
  </action>
  <verify>
`pnpm tauri dev` - Navigate to Settings, see "Data Management" section with Export/Import buttons.
  </verify>
  <done>
Export and Import buttons visible in Settings panel, functional with native file dialogs.
  </done>
</task>

</tasks>

<verification>
1. `cd src-tauri && cargo check` - Rust compiles
2. `pnpm exec tsc --noEmit` - TypeScript compiles
3. `pnpm tauri dev` - App runs
4. Settings > Data Management > Export Settings - Opens save dialog, creates valid JSON file
5. Edit the exported file (change a threshold), then Import Settings - Settings update in UI
6. Try importing malformed JSON - Error message displayed
</verification>

<success_criteria>
- User can click "Export Settings" and save to any location
- User can click "Import Settings" and load from any JSON file
- Invalid files rejected with user-friendly error message
- UI refreshes after successful import
- No console errors during export/import flow
</success_criteria>

<output>
After completion, create `.planning/phases/8-features/8-01-SUMMARY.md`
</output>
