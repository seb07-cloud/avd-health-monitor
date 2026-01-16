---
phase: 8-features
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/services/historyExportService.ts
  - src/components/settings/DataManagement.tsx
autonomous: true

must_haves:
  truths:
    - "User can export latency history to a CSV file"
    - "CSV opens correctly in Excel with proper encoding"
    - "CSV contains endpoint ID, name, timestamp, and latency columns"
  artifacts:
    - path: "src/services/historyExportService.ts"
      provides: "CSV generation and export"
      exports: ["exportHistoryToCsv"]
      min_lines: 40
  key_links:
    - from: "src/services/historyExportService.ts"
      to: "@tauri-apps/plugin-dialog"
      via: "save() dialog call"
      pattern: "save\\("
    - from: "src/services/historyExportService.ts"
      to: "write_text_to_path"
      via: "invoke call for file write"
      pattern: "invoke.*write_text_to_path"
    - from: "src/components/settings/DataManagement.tsx"
      to: "historyExportService.ts"
      via: "import and button onClick"
      pattern: "exportHistoryToCsv"
---

<objective>
Implement latency history export to CSV (FEAT-03).

Purpose: Allow users to analyze endpoint latency data in Excel or other spreadsheet tools for reporting or troubleshooting.

Output: "Export History" button in Data Management section that saves CSV with UTF-8 BOM for Excel compatibility.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/8-features/8-RESEARCH.md

@src/store/slices/endpointSlice.ts
@src/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create history export service with CSV generation</name>
  <files>src/services/historyExportService.ts</files>
  <action>
Create `src/services/historyExportService.ts`:

```typescript
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

  // Write via Rust command (created in Plan 01)
  await invoke('write_text_to_path', {
    path: filePath,
    content: csvContent,
  });

  return true;
}
```

Key implementation notes:
- UTF-8 BOM (`\uFEFF`) prefix ensures Excel opens the file with correct encoding
- Proper CSV escaping handles endpoint names with commas or quotes
- ISO 8601 timestamp format for universal compatibility
- Date-stamped default filename for easy organization
- Uses `write_text_to_path` command from Plan 01
  </action>
  <verify>
`pnpm exec tsc --noEmit` passes without type errors.
  </verify>
  <done>
History export service created with proper CSV generation and Excel compatibility.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Export History button to DataManagement</name>
  <files>src/components/settings/DataManagement.tsx</files>
  <action>
Update `src/components/settings/DataManagement.tsx` to add history export:

1. Import `exportHistoryToCsv` from `../services/historyExportService`
2. Get `endpointStatuses` from useAppStore
3. Add state for history export status (success/error message)
4. Add "Export History" button with FileSpreadsheet icon from lucide-react
5. Button onClick handler:
   - Check if endpointStatuses has any data with history
   - Call exportHistoryToCsv(endpointStatuses)
   - Show success message on completion
   - Catch errors and display user-friendly message

Layout suggestion:
- Group the three buttons (Export Settings, Import Settings, Export History) in a grid or flex layout
- Export History button should be visually distinct (different color) as it's a different type of export

Error handling:
- If no history data exists, show "No history data to export" message
- If export fails, show the error
  </action>
  <verify>
`pnpm tauri dev` - Navigate to Settings > Data Management, see "Export History" button alongside Export/Import Settings.
  </verify>
  <done>
Export History button visible and functional in Data Management section.
  </done>
</task>

</tasks>

<verification>
1. `pnpm exec tsc --noEmit` - TypeScript compiles
2. `pnpm tauri dev` - App runs
3. Let some endpoints collect history data (wait 30-60 seconds)
4. Settings > Data Management > Export History - Opens save dialog
5. Save the CSV file
6. Open in Excel - Data displays correctly with proper columns
7. Open in text editor - Verify BOM is present (file starts with invisible character)
8. Try exporting with no history - Error message displayed
</verification>

<success_criteria>
- Export History button visible in Data Management section
- CSV file saves to user-chosen location
- CSV opens correctly in Excel without encoding issues
- CSV contains: Endpoint ID, Endpoint Name, Timestamp (ISO), Latency (ms)
- Empty history shows appropriate error message
</success_criteria>

<output>
After completion, create `.planning/phases/8-features/8-02-SUMMARY.md`
</output>
