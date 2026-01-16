---
phase: 2-component-refactor
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/settings/ModeSelector.tsx
  - src/components/settings/ThresholdSettings.tsx
  - src/components/SettingsPanel.tsx
autonomous: true

must_haves:
  truths:
    - "Mode selection buttons render and function correctly"
    - "Clicking mode button switches application mode"
    - "Threshold inputs display current values"
    - "Threshold validation errors display correctly"
    - "Threshold scale visualization updates with values"
  artifacts:
    - path: "src/components/settings/ModeSelector.tsx"
      provides: "Mode selection UI with Session Host and End User buttons"
      exports: ["ModeSelector"]
      min_lines: 80
    - path: "src/components/settings/ThresholdSettings.tsx"
      provides: "Latency threshold configuration with validation"
      exports: ["ThresholdSettings"]
      min_lines: 100
  key_links:
    - from: "src/components/SettingsPanel.tsx"
      to: "src/components/settings/ModeSelector.tsx"
      via: "import and render"
      pattern: "import.*ModeSelector.*from.*settings/ModeSelector"
    - from: "src/components/SettingsPanel.tsx"
      to: "src/components/settings/ThresholdSettings.tsx"
      via: "import and render"
      pattern: "import.*ThresholdSettings.*from.*settings/ThresholdSettings"
    - from: "src/components/settings/ModeSelector.tsx"
      to: "useSettingsSync"
      via: "loadSettingsForMode call"
      pattern: "loadSettingsForMode\\(mode\\)"
---

<objective>
Extract ModeSelector and ThresholdSettings components from SettingsPanel.tsx

Purpose: Begin the component refactor by extracting two self-contained UI sections into dedicated components, establishing the settings/ subfolder structure and patterns for remaining extractions.

Output: Two new component files in src/components/settings/, updated SettingsPanel.tsx imports
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
@src/components/SettingsPanel.tsx (lines 1-650 relevant)
@src/components/EndpointTile.tsx (reference pattern for Zustand selectors)
@src/types.ts
@src/lib/utils.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ModeSelector component</name>
  <files>src/components/settings/ModeSelector.tsx</files>
  <action>
Extract the Mode Selection section (SettingsPanel.tsx lines 245-348) into a new ModeSelector component.

Create `src/components/settings/` directory if it doesn't exist.

Component requirements:
- Props interface: `{ config: AppConfig; modeInfo: ModeInfo | null; onModeChange: (mode: AppMode) => Promise<void> }`
- Import types from `../../types` (AppConfig, AppMode, ModeInfo)
- Import cn from `../../lib/utils`
- Import icons: Monitor, User, ExternalLink from lucide-react
- Render both mode buttons (Session Host and End User)
- Show mode info and source link when modeInfo provided
- Use existing Tailwind classes exactly as in source

Pattern to follow (from EndpointTile.tsx):
```typescript
interface ModeSelectorProps {
  config: AppConfig;
  modeInfo: ModeInfo | null;
  onModeChange: (mode: AppMode) => Promise<void>;
}

export function ModeSelector({ config, modeInfo, onModeChange }: ModeSelectorProps) {
  // Component implementation
}
```

Do NOT access Zustand store directly in this component - receive props from parent.
  </action>
  <verify>
File exists at src/components/settings/ModeSelector.tsx
TypeScript compiles: `pnpm exec tsc --noEmit`
  </verify>
  <done>
ModeSelector.tsx exists with proper TypeScript interface, renders mode buttons, handles mode change via callback prop
  </done>
</task>

<task type="auto">
  <name>Task 2: Create ThresholdSettings component</name>
  <files>src/components/settings/ThresholdSettings.tsx</files>
  <action>
Extract the Latency Thresholds section (SettingsPanel.tsx lines 522-645) into a new ThresholdSettings component.

Component requirements:
- Props interface: `{ thresholds: LatencyThresholds; onThresholdChange: (field: 'excellent' | 'good' | 'warning', value: string) => void }`
- Import types from `../../types` (LatencyThresholds)
- Import cn, validateThresholds from `../../lib/utils`
- Import XCircle from lucide-react
- Use useMemo for threshold validation (call validateThresholds)
- Render three input fields (excellent, good, warning)
- Show validation errors inline
- Render the threshold scale visualization bar
- Use existing Tailwind classes exactly as in source

Pattern:
```typescript
import { useMemo } from 'react';

interface ThresholdSettingsProps {
  thresholds: LatencyThresholds;
  onThresholdChange: (field: 'excellent' | 'good' | 'warning', value: string) => void;
}

export function ThresholdSettings({ thresholds, onThresholdChange }: ThresholdSettingsProps) {
  const thresholdErrors = useMemo(() => {
    return validateThresholds(thresholds);
  }, [thresholds]);

  // Rest of component
}
```

Include the full threshold scale visualization (the colored bar showing Excellent/Good/Warning/Critical ranges).
  </action>
  <verify>
File exists at src/components/settings/ThresholdSettings.tsx
TypeScript compiles: `pnpm exec tsc --noEmit`
  </verify>
  <done>
ThresholdSettings.tsx exists with proper TypeScript interface, renders threshold inputs with validation, includes scale visualization
  </done>
</task>

<task type="auto">
  <name>Task 3: Update SettingsPanel to use new components</name>
  <files>src/components/SettingsPanel.tsx</files>
  <action>
Update SettingsPanel.tsx to import and use the new components.

Changes required:

1. Add imports at top:
```typescript
import { ModeSelector } from './settings/ModeSelector';
import { ThresholdSettings } from './settings/ThresholdSettings';
```

2. Replace Mode Selection section (lines 245-348) with:
```tsx
<ModeSelector
  config={config}
  modeInfo={modeInfo}
  onModeChange={handleModeChange}
/>
```

3. Replace Latency Thresholds section (lines 522-645) with:
```tsx
<ThresholdSettings
  thresholds={config.thresholds}
  onThresholdChange={handleThresholdChange}
/>
```

4. Keep the handleModeChange and handleThresholdChange functions in SettingsPanel (they handle store interaction).

5. Remove now-unused imports if any (Monitor, User, ExternalLink if only used by ModeSelector).

Do NOT remove:
- The collapsible section wrapper (stays in parent)
- The "Endpoint Monitoring" section header
- Other sections (Custom Endpoints, Mode Endpoints, FSLogix)
  </action>
  <verify>
TypeScript compiles: `pnpm exec tsc --noEmit`
App builds: `pnpm build`
Run dev server: `pnpm tauri dev` and verify Settings panel renders correctly
  </verify>
  <done>
SettingsPanel imports and renders ModeSelector and ThresholdSettings, app compiles and runs, no visual regressions in Settings UI
  </done>
</task>

</tasks>

<verification>
1. TypeScript compilation: `pnpm exec tsc --noEmit` passes with no errors
2. Build succeeds: `pnpm build` completes without errors
3. New files exist in correct location:
   - src/components/settings/ModeSelector.tsx
   - src/components/settings/ThresholdSettings.tsx
4. Functional verification (manual):
   - Mode selection buttons render and switch modes
   - Threshold inputs accept values and show validation errors
   - Threshold scale visualization updates correctly
</verification>

<success_criteria>
- ModeSelector.tsx is 80-120 lines and fully functional
- ThresholdSettings.tsx is 100-150 lines and includes validation + visualization
- SettingsPanel.tsx reduced by ~200 lines from these extractions
- All existing functionality preserved
- No TypeScript errors
- App builds and runs successfully
</success_criteria>

<output>
After completion, create `.planning/phases/2-component-refactor/2-01-SUMMARY.md`
</output>
