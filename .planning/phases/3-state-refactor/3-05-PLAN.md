---
phase: 3-state-refactor
plan: 05
type: execute
wave: 3
depends_on: ["3-02", "3-03", "3-04"]
files_modified:
  - src/store/useAppStore.ts
autonomous: true

must_haves:
  truths:
    - "Store combines all 4 slices"
    - "Persist middleware applied at root level only"
    - "Storage key unchanged (avd-health-monitor-state)"
    - "Version incremented to 10"
    - "Existing tests pass without modification"
  artifacts:
    - path: "src/store/useAppStore.ts"
      provides: "Combined store with persist middleware"
      exports: ["useAppStore"]
      max_lines: 100
  key_links:
    - from: "src/store/useAppStore.ts"
      to: "src/store/slices/index.ts"
      via: "imports all slice creators"
      pattern: "import.*from.*slices"
    - from: "src/store/useAppStore.ts"
      to: "src/store/persistence/index.ts"
      via: "imports persistence config"
      pattern: "import.*from.*persistence"
---

<objective>
Combine all slices into the final useAppStore with persist middleware.

Purpose: Replace the monolithic store with the slice-based architecture while preserving all existing behavior and ensuring tests pass.

Output: Refactored `src/store/useAppStore.ts` that combines slices with persist middleware at root level.
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
@src/store/slices/index.ts
@src/store/useAppStore.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace useAppStore with slice-based implementation</name>
  <files>src/store/useAppStore.ts</files>
  <action>
Replace `src/store/useAppStore.ts` entirely with the slice-based implementation:

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppState } from './types';
import type { PersistedState } from './persistence';
import {
  createConfigSlice,
  createEndpointSlice,
  createFslogixSlice,
  createUiSlice,
} from './slices';
import {
  STORAGE_KEY,
  DEFAULT_CONFIG,
  serializeHistory,
  deserializeHistory,
  handleMigration,
} from './persistence';

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createConfigSlice(...args),
      ...createEndpointSlice(...args),
      ...createFslogixSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        config: state.config,
        customEndpoints: state.customEndpoints,
        historyData: serializeHistory(state.endpointStatuses),
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as PersistedState | undefined;
        return {
          ...currentState,
          config: persisted?.config
            ? { ...DEFAULT_CONFIG, ...persisted.config }
            : currentState.config,
          customEndpoints: persisted?.customEndpoints ?? [],
          endpoints: currentState.endpoints,
          endpointStatuses: persisted?.historyData
            ? deserializeHistory(persisted.historyData, currentState.endpoints)
            : currentState.endpointStatuses,
        };
      },
      version: 10, // Incremented from v9 for slice refactor
      migrate: handleMigration,
    }
  )
);
```

Key points:
- Spread all 4 slice creators using `...args` pattern
- Persist middleware applied ONLY at root level (not in slices)
- STORAGE_KEY unchanged to preserve user data
- Version incremented to 10 (migration handles v9 -> v10)
- partialize, merge, and migrate functions imported from persistence module
- File should be ~50 lines (down from ~720)
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>useAppStore.ts refactored to slice-based implementation, under 100 lines</done>
</task>

<task type="auto">
  <name>Task 2: Run tests and verify no regressions</name>
  <files>src/store/useAppStore.test.ts</files>
  <action>
Run the existing test suite to verify all functionality preserved:

```bash
cd /Users/seb/Git/avd-health-monitor && pnpm test:run
```

Tests should pass WITHOUT modification because:
- The store API (useAppStore.getState(), useAppStore.setState()) is unchanged
- All actions have identical signatures
- All state shape is identical

If tests fail, debug the slice implementation - do NOT modify tests unless there's a genuine API change (there shouldn't be).

Expected test results:
- "should initialize with default config" - passes (DEFAULT_CONFIG preserved)
- "should have default endpoints" - passes (DEFAULT_ENDPOINTS preserved)
- "should update config" - passes (setConfig works)
- "should add custom endpoint" - passes (addCustomEndpoint works)
- "should update endpoint enabled state" - passes (updateEndpointEnabled works)
- "should remove custom endpoint" - passes (removeCustomEndpoint works)
- "should update latency" - passes (updateLatency works)
- "should toggle monitoring state" - passes (setMonitoring works)
- "should toggle paused state" - passes (setPaused works)
  </action>
  <verify>`pnpm test:run` shows all tests passing</verify>
  <done>All 9 existing tests pass, no functionality regressions</done>
</task>

<task type="auto">
  <name>Task 3: Verify file structure and line counts</name>
  <files></files>
  <action>
Verify the refactor achieved its goals:

1. Check useAppStore.ts line count (should be under 100):
```bash
wc -l src/store/useAppStore.ts
```

2. Verify store directory structure:
```bash
ls -la src/store/
ls -la src/store/slices/
ls -la src/store/persistence/
```

Expected structure:
```
src/store/
├── useAppStore.ts        (~50 lines)
├── useAppStore.test.ts   (unchanged)
├── types.ts              (new - slice interfaces)
├── slices/
│   ├── index.ts          (barrel export)
│   ├── configSlice.ts
│   ├── endpointSlice.ts
│   ├── fslogixSlice.ts
│   └── uiSlice.ts
└── persistence/
    └── index.ts          (persistence helpers)
```

3. Verify TypeScript compilation:
```bash
pnpm exec tsc --noEmit
```
  </action>
  <verify>
- useAppStore.ts under 100 lines
- All expected files exist
- TypeScript compiles without errors
  </verify>
  <done>Store split into slices, persistence isolated, structure verified</done>
</task>

</tasks>

<verification>
After all tasks:
1. `pnpm test:run` - all 9 tests pass
2. `pnpm exec tsc --noEmit` - no TypeScript errors
3. useAppStore.ts is under 100 lines
4. Store structure matches expected layout
5. Version 10 in persist config
</verification>

<success_criteria>
- Store combines 4 slices using spread pattern
- Persist middleware at root only
- Storage key unchanged (user data preserved)
- Version incremented to 10
- All existing tests pass
- useAppStore.ts under 100 lines (down from ~720)
</success_criteria>

<output>
After completion, create `.planning/phases/3-state-refactor/3-05-SUMMARY.md`
</output>
