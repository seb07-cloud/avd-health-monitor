---
phase: 2-component-refactor
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/settings/CustomEndpointManager.tsx
  - src/components/settings/ModeEndpointList.tsx
  - src/components/settings/FSLogixSettings.tsx
  - src/components/SettingsPanel.tsx
autonomous: true

must_haves:
  truths:
    - "Custom endpoints can be added, edited, and removed"
    - "Custom endpoint test connection works"
    - "Mode endpoints display by category with edit/mute controls"
    - "FSLogix settings only appear in Session Host mode"
    - "FSLogix paths display when enabled and detected"
  artifacts:
    - path: "src/components/settings/CustomEndpointManager.tsx"
      provides: "Custom endpoint CRUD with test connection"
      exports: ["CustomEndpointManager"]
      min_lines: 150
    - path: "src/components/settings/ModeEndpointList.tsx"
      provides: "Mode-specific endpoint list with editing"
      exports: ["ModeEndpointList"]
      min_lines: 120
    - path: "src/components/settings/FSLogixSettings.tsx"
      provides: "FSLogix monitoring configuration"
      exports: ["FSLogixSettings"]
      min_lines: 100
  key_links:
    - from: "src/components/SettingsPanel.tsx"
      to: "src/components/settings/CustomEndpointManager.tsx"
      via: "import and render"
      pattern: "import.*CustomEndpointManager.*from.*settings/CustomEndpointManager"
    - from: "src/components/settings/CustomEndpointManager.tsx"
      to: "@tauri-apps/api/core"
      via: "invoke for test_latency"
      pattern: "invoke.*test_latency"
    - from: "src/components/settings/ModeEndpointList.tsx"
      to: "useAppStore"
      via: "Zustand selectors for endpoint actions"
      pattern: "useAppStore\\(.*updateEndpoint"
---

<objective>
Extract CustomEndpointManager, ModeEndpointList, and FSLogixSettings components from SettingsPanel.tsx

Purpose: Complete the component refactor by extracting the remaining three sections, achieving the target of SettingsPanel under 300 lines.

Output: Three new component files in src/components/settings/, fully refactored SettingsPanel.tsx under 300 lines
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/2-component-refactor/2-RESEARCH.md

Source files:
@src/components/SettingsPanel.tsx (lines 647-1160 relevant for these extractions)
@src/components/EndpointTile.tsx (reference pattern)
@src/types.ts
@src/lib/utils.ts
@src/store/useAppStore.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CustomEndpointManager component</name>
  <files>src/components/settings/CustomEndpointManager.tsx</files>
  <action>
Extract the Custom Endpoints section (SettingsPanel.tsx lines 647-846) into a new CustomEndpointManager component.

Component requirements:
- Import useState from react
- Import invoke from '@tauri-apps/api/core'
- Import icons: Plus, Trash2, Edit2, Check, X, Loader2, Wifi, XCircle from lucide-react
- Import types: CustomEndpoint from '../../types'
- Import cn, validateEndpointUrl from '../../lib/utils'
- Import useAppStore from '../../store/useAppStore'

This component manages its own local state for:
- New endpoint form: `useState<Partial<CustomEndpoint>>({ name: '', url: '', port: 443, protocol: 'tcp', enabled: true })`
- URL error: `useState<string | null>(null)`
- Testing state: `useState(false)`
- Test result: `useState<{ success: boolean; latency?: number; error?: string } | null>(null)`
- Edit mode: `useState<string | null>(null)` for editingId
- Edit form: `useState<Partial<CustomEndpoint>>({})`

Use Zustand selectors for:
```typescript
const customEndpoints = useAppStore((state) => state.customEndpoints);
const addCustomEndpoint = useAppStore((state) => state.addCustomEndpoint);
const updateCustomEndpoint = useAppStore((state) => state.updateCustomEndpoint);
const removeCustomEndpoint = useAppStore((state) => state.removeCustomEndpoint);
const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);
```

Include all handlers:
- handleTestConnection (invokes test_latency Tauri command)
- handleAddEndpoint
- startEditing, saveEdit, cancelEdit

Render:
- Existing custom endpoints list with edit/delete buttons
- Edit mode inline form
- Add new endpoint form (name, url, port, protocol, test, add buttons)
- URL validation error display
- Test result display

Use existing Tailwind classes exactly as in source.
  </action>
  <verify>
File exists at src/components/settings/CustomEndpointManager.tsx
TypeScript compiles: `pnpm exec tsc --noEmit`
  </verify>
  <done>
CustomEndpointManager.tsx exists with local state management, Tauri invoke for testing, full CRUD functionality
  </done>
</task>

<task type="auto">
  <name>Task 2: Create ModeEndpointList component</name>
  <files>src/components/settings/ModeEndpointList.tsx</files>
  <action>
Extract the Mode Endpoints section (SettingsPanel.tsx lines 848-984) into a new ModeEndpointList component.

Component requirements:
- Import useState, useMemo from react
- Import icons: Edit2, Check, X, BellOff, Bell from lucide-react
- Import types: Endpoint, ModeInfo from '../../types'
- Import cn, validateEndpointUrl from '../../lib/utils'
- Import useAppStore from '../../store/useAppStore'

Props interface:
```typescript
interface ModeEndpointListProps {
  modeInfo: ModeInfo | null;
}
```

Use Zustand selectors for:
```typescript
const endpoints = useAppStore((state) => state.endpoints);
const updateEndpointEnabled = useAppStore((state) => state.updateEndpointEnabled);
const updateEndpointMuted = useAppStore((state) => state.updateEndpointMuted);
const updateModeEndpoint = useAppStore((state) => state.updateModeEndpoint);
```

Local state for editing:
- `editingModeEndpointId: useState<string | null>(null)`
- `modeEndpointEditForm: useState<{ name: string; url: string; port: number }>({ name: '', url: '', port: 443 })`

Include useMemo for groupedEndpoints:
```typescript
const groupedEndpoints = useMemo(() => {
  return endpoints
    .filter((ep) => !ep.id.startsWith('custom-'))
    .reduce((acc, endpoint) => {
      const category = endpoint.category || 'Other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(endpoint);
      return acc;
    }, {} as Record<string, Endpoint[]>);
}, [endpoints]);
```

Include handlers: startEditingModeEndpoint, saveModeEndpointEdit, cancelModeEndpointEdit

Render endpoints grouped by category with:
- Enable/disable checkbox
- Edit button with inline edit form
- Mute/unmute button
- Optional badge for non-required endpoints

Use existing Tailwind classes exactly as in source.
  </action>
  <verify>
File exists at src/components/settings/ModeEndpointList.tsx
TypeScript compiles: `pnpm exec tsc --noEmit`
  </verify>
  <done>
ModeEndpointList.tsx exists with category grouping, inline editing, mute controls, proper Zustand integration
  </done>
</task>

<task type="auto">
  <name>Task 3: Create FSLogixSettings component</name>
  <files>src/components/settings/FSLogixSettings.tsx</files>
  <action>
Extract the FSLogix Settings section (SettingsPanel.tsx lines 989-1154) into a new FSLogixSettings component.

Component requirements:
- Import icons: HardDrive, FolderOpen, ChevronDown, ChevronUp from lucide-react
- Import types: AppConfig, FSLogixPath from '../../types'
- Import cn from '../../lib/utils'
- Import useAppStore from '../../store/useAppStore'

Props interface:
```typescript
interface FSLogixSettingsProps {
  isCollapsed: boolean;
  onToggle: () => void;
}
```

Use Zustand selectors for:
```typescript
const config = useAppStore((state) => state.config);
const fslogixPaths = useAppStore((state) => state.fslogixPaths);
const setConfig = useAppStore((state) => state.setConfig);
```

Component renders:
1. Collapsible header with HardDrive icon and toggle button
2. When expanded:
   - FSLogix enable/disable toggle (purple color scheme)
   - Test interval input (when enabled)
   - Alert threshold input (when enabled)
   - Alert cooldown input (when enabled)
   - Discovered storage paths list (when enabled and paths exist)
   - "No paths detected" message (when enabled but no paths)
   - Info text about auto-detection

Note: This component is only rendered when config.mode === 'sessionhost' (parent handles this condition).

Use existing Tailwind classes exactly as in source, including purple color scheme for FSLogix toggle.
  </action>
  <verify>
File exists at src/components/settings/FSLogixSettings.tsx
TypeScript compiles: `pnpm exec tsc --noEmit`
  </verify>
  <done>
FSLogixSettings.tsx exists with collapsible section, enable toggle, configuration inputs, path display
  </done>
</task>

<task type="auto">
  <name>Task 4: Complete SettingsPanel refactor</name>
  <files>src/components/SettingsPanel.tsx</files>
  <action>
Final update to SettingsPanel.tsx to use all extracted components and verify line count.

Changes required:

1. Add imports for new components (if not already present from 2-01):
```typescript
import { ModeSelector } from './settings/ModeSelector';
import { ThresholdSettings } from './settings/ThresholdSettings';
import { CustomEndpointManager } from './settings/CustomEndpointManager';
import { ModeEndpointList } from './settings/ModeEndpointList';
import { FSLogixSettings } from './settings/FSLogixSettings';
```

2. Remove all state and handlers that moved to child components:
   - Remove: newEndpoint, urlError, isTesting, testResult state (moved to CustomEndpointManager)
   - Remove: editingId, editForm state (moved to CustomEndpointManager)
   - Remove: editingModeEndpointId, modeEndpointEditForm state (moved to ModeEndpointList)
   - Remove: handleTestConnection, handleAddEndpoint (moved to CustomEndpointManager)
   - Remove: startEditing, saveEdit, cancelEdit (moved to CustomEndpointManager)
   - Remove: startEditingModeEndpoint, saveModeEndpointEdit, cancelModeEndpointEdit (moved to ModeEndpointList)
   - Remove: groupedEndpoints memo (moved to ModeEndpointList)

3. Keep in SettingsPanel:
   - collapsedSections state and toggleSection
   - handleModeChange (uses loadSettingsForMode hook)
   - handleThresholdChange (simple setter)
   - Store destructuring for: config, modeInfo, setConfig, setCurrentView, triggerTestNow
   - useSettingsSync hook

4. Replace Custom Endpoints section with:
```tsx
<CustomEndpointManager />
```

5. Replace Mode Endpoints section with:
```tsx
<ModeEndpointList modeInfo={modeInfo} />
```

6. Replace FSLogix section with:
```tsx
{config.mode === 'sessionhost' && (
  <FSLogixSettings
    isCollapsed={collapsedSections.fslogix}
    onToggle={() => toggleSection('fslogix')}
  />
)}
```

7. Clean up unused imports (remove icons and types only used by extracted components).

8. Verify final SettingsPanel.tsx is under 300 lines.

Final structure should be:
- Imports (~10 lines)
- Component function with minimal state (~20 lines)
- Handlers (~15 lines)
- JSX return with:
  - Header
  - ModeSelector
  - General Settings (theme only - kept inline, ~30 lines)
  - Endpoint Monitoring collapsible section containing:
    - Test interval, notifications, alerts (kept inline, ~80 lines)
    - ThresholdSettings component
    - CustomEndpointManager component
    - ModeEndpointList component
  - FSLogixSettings (conditional)
- Total target: ~250-280 lines
  </action>
  <verify>
TypeScript compiles: `pnpm exec tsc --noEmit`
Build succeeds: `pnpm build`
Line count check: `wc -l src/components/SettingsPanel.tsx` should be under 300
Run dev server: `pnpm tauri dev` and verify complete Settings panel functionality
  </verify>
  <done>
SettingsPanel.tsx is under 300 lines, all components properly integrated, full functionality preserved, app builds and runs
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation: `pnpm exec tsc --noEmit` passes with no errors
2. Build succeeds: `pnpm build` completes without errors
3. Line count: `wc -l src/components/SettingsPanel.tsx` returns under 300
4. New files exist:
   - src/components/settings/CustomEndpointManager.tsx
   - src/components/settings/ModeEndpointList.tsx
   - src/components/settings/FSLogixSettings.tsx
5. Functional verification (manual):
   - Custom endpoints: add, edit, delete, test connection
   - Mode endpoints: enable/disable, mute/unmute, edit
   - FSLogix: toggle enable, configure settings, view paths
   - Mode switch: Session Host / End User
   - Thresholds: input values, see validation errors
</verification>

<success_criteria>
- CustomEndpointManager.tsx is 150-200 lines with full CRUD + test functionality
- ModeEndpointList.tsx is 120-180 lines with category grouping and edit mode
- FSLogixSettings.tsx is 100-150 lines with collapsible section
- SettingsPanel.tsx is under 300 lines (COMP-06 requirement)
- All 5 components extracted (COMP-01 through COMP-05)
- No functionality regressions
- No TypeScript errors
- App builds and runs successfully
</success_criteria>

<output>
After completion, create `.planning/phases/2-component-refactor/2-02-SUMMARY.md`
</output>
