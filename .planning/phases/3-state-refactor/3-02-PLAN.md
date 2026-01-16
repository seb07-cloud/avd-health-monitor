---
phase: 3-state-refactor
plan: 02
type: execute
wave: 2
depends_on: ["3-01"]
files_modified:
  - src/store/slices/configSlice.ts
  - src/store/slices/uiSlice.ts
autonomous: true

must_haves:
  truths:
    - "configSlice manages AppConfig state"
    - "uiSlice manages view and monitoring flags"
    - "setConfig triggers file persistence"
  artifacts:
    - path: "src/store/slices/configSlice.ts"
      provides: "Config state and setConfig action"
      exports: ["createConfigSlice"]
    - path: "src/store/slices/uiSlice.ts"
      provides: "UI state and view/monitoring actions"
      exports: ["createUiSlice"]
  key_links:
    - from: "src/store/slices/configSlice.ts"
      to: "src/store/persistence/index.ts"
      via: "saveSettingsToFile import"
      pattern: "import.*saveSettingsToFile.*from"
---

<objective>
Create configSlice and uiSlice using Zustand's StateCreator pattern.

Purpose: These are the two smallest slices - config has 1 action, ui has 4 simple actions. Creating them together demonstrates the slice pattern before tackling larger slices.

Output: `src/store/slices/configSlice.ts` and `src/store/slices/uiSlice.ts` ready for store combination.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/3-state-refactor/3-RESEARCH.md
@src/store/useAppStore.ts
@src/store/types.ts
@src/store/persistence/index.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create configSlice</name>
  <files>src/store/slices/configSlice.ts</files>
  <action>
Create `src/store/slices/configSlice.ts`:

```typescript
import { StateCreator } from 'zustand';
import type { AppState, ConfigSlice } from '../types';
import { DEFAULT_CONFIG, saveSettingsToFile } from '../persistence';

export const createConfigSlice: StateCreator<
  AppState,
  [],
  [],
  ConfigSlice
> = (set, get) => ({
  config: DEFAULT_CONFIG,

  setConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
    // Auto-save to JSON file
    const state = get();
    saveSettingsToFile(state.config, state.customEndpoints);
  },
});
```

Key points:
- Use `StateCreator<AppState, [], [], ConfigSlice>` typing (4 type params)
- First param is combined state type (enables cross-slice access via get())
- Empty arrays for middleware (applied at root only)
- Last param is this slice's return type
- setConfig uses get() to access customEndpoints from EndpointSlice for persistence
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>configSlice.ts exists with createConfigSlice export, types correct</done>
</task>

<task type="auto">
  <name>Task 2: Create uiSlice</name>
  <files>src/store/slices/uiSlice.ts</files>
  <action>
Create `src/store/slices/uiSlice.ts`:

```typescript
import { StateCreator } from 'zustand';
import type { AppState, UiSlice } from '../types';

export const createUiSlice: StateCreator<
  AppState,
  [],
  [],
  UiSlice
> = (set) => ({
  currentView: 'dashboard',
  isMonitoring: false,
  isPaused: false,
  pendingTestTrigger: false,

  setCurrentView: (view) => set({ currentView: view }),
  setMonitoring: (isMonitoring) => set({ isMonitoring }),
  setPaused: (isPaused) => set({ isPaused }),
  triggerTestNow: () => set({ pendingTestTrigger: true }),
  clearTestTrigger: () => set({ pendingTestTrigger: false }),
});
```

Key points:
- Simple state setters, no cross-slice access needed
- No persistence - these are runtime UI flags
- Uses `set` only (no `get` needed)
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>uiSlice.ts exists with createUiSlice export, types correct</done>
</task>

</tasks>

<verification>
After both tasks:
1. `pnpm exec tsc --noEmit` passes
2. Both slice files export their createXSlice functions
3. Slice creators follow StateCreator<AppState, [], [], SliceType> pattern
4. configSlice imports saveSettingsToFile from persistence
</verification>

<success_criteria>
- configSlice created with setConfig that persists to file
- uiSlice created with all 5 UI actions
- Both use correct StateCreator typing
- TypeScript compilation successful
</success_criteria>

<output>
After completion, create `.planning/phases/3-state-refactor/3-02-SUMMARY.md`
</output>
