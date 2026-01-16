---
phase: 3-state-refactor
plan: 04
type: execute
wave: 2
depends_on: ["3-01"]
files_modified:
  - src/store/slices/fslogixSlice.ts
autonomous: true

must_haves:
  truths:
    - "fslogixSlice manages FSLogix storage monitoring state"
    - "Muted state persists via Tauri command"
    - "Consecutive failures tracked for alerting"
  artifacts:
    - path: "src/store/slices/fslogixSlice.ts"
      provides: "FSLogix state and actions"
      exports: ["createFslogixSlice"]
  key_links:
    - from: "src/store/slices/fslogixSlice.ts"
      to: "@tauri-apps/api/core"
      via: "invoke for muted state persistence"
      pattern: "invoke\\("
---

<objective>
Create fslogixSlice for FSLogix storage path monitoring.

Purpose: FSLogix monitoring is a distinct domain (Session Host only) with its own state, status tracking, and persistence. Isolating it keeps the slice focused.

Output: `src/store/slices/fslogixSlice.ts` with FSLogix state and 5 actions.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create fslogixSlice</name>
  <files>src/store/slices/fslogixSlice.ts</files>
  <action>
Create `src/store/slices/fslogixSlice.ts`:

```typescript
import { StateCreator } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import type { AppState, FslogixSlice } from '../types';
import type { FSLogixStatus } from '../../types';

export const createFslogixSlice: StateCreator<
  AppState,
  [],
  [],
  FslogixSlice
> = (set, get) => ({
  fslogixPaths: [],
  fslogixStatuses: new Map(),

  setFSLogixPaths: (paths) => {
    set({ fslogixPaths: paths });
  },

  updateFSLogixStatus: (pathId, reachable, latency, error) =>
    set((state) => {
      const path = state.fslogixPaths.find((p) => p.id === pathId);
      if (!path) return state;

      const newStatuses = new Map(state.fslogixStatuses);
      const timestamp = Date.now();
      const currentStatus = newStatuses.get(pathId);

      // Track consecutive failures: increment on failure, reset on success
      const consecutiveFailures = reachable
        ? 0
        : (currentStatus?.consecutiveFailures ?? 0) + 1;

      const status: FSLogixStatus = {
        path,
        reachable,
        latency,
        error,
        isLoading: false,
        lastUpdated: timestamp,
        consecutiveFailures,
      };

      newStatuses.set(pathId, status);
      return { fslogixStatuses: newStatuses };
    }),

  setFSLogixLoading: (pathId, isLoading) =>
    set((state) => {
      const path = state.fslogixPaths.find((p) => p.id === pathId);
      if (!path) return state;

      const newStatuses = new Map(state.fslogixStatuses);
      const currentStatus = newStatuses.get(pathId);

      const status: FSLogixStatus = currentStatus
        ? { ...currentStatus, isLoading }
        : {
            path,
            reachable: false,
            latency: null,
            error: null,
            isLoading,
            lastUpdated: null,
            consecutiveFailures: 0,
          };

      newStatuses.set(pathId, status);
      return { fslogixStatuses: newStatuses };
    }),

  setAllFSLogixLoading: (isLoading) =>
    set((state) => {
      const newStatuses = new Map(state.fslogixStatuses);

      for (const path of state.fslogixPaths) {
        const currentStatus = newStatuses.get(path.id);

        const status: FSLogixStatus = currentStatus
          ? { ...currentStatus, isLoading }
          : {
              path,
              reachable: false,
              latency: null,
              error: null,
              isLoading,
              lastUpdated: null,
              consecutiveFailures: 0,
            };

        newStatuses.set(path.id, status);
      }

      return { fslogixStatuses: newStatuses };
    }),

  updateFSLogixPathMuted: (pathId, muted) => {
    // Update the path in state
    set((state) => {
      const fslogixPaths = state.fslogixPaths.map((path) =>
        path.id === pathId ? { ...path, muted } : path
      );

      // Also update the path reference in fslogixStatuses
      const newStatuses = new Map(state.fslogixStatuses);
      const currentStatus = newStatuses.get(pathId);
      if (currentStatus) {
        newStatuses.set(pathId, {
          ...currentStatus,
          path: { ...currentStatus.path, muted },
        });
      }

      return { fslogixPaths, fslogixStatuses: newStatuses };
    });

    // Persist to settings.json via Tauri command
    invoke('update_fslogix_path_muted', { pathId, muted }).catch((error) => {
      console.error('[fslogixSlice] Failed to persist FSLogix muted state:', error);
    });
  },
});
```

Key points:
- All 5 actions from FslogixSlice interface implemented
- Map operations for fslogixStatuses identical to current implementation
- Consecutive failure tracking preserved for alerting
- Muted state persists via Tauri invoke
- No cross-slice access needed (FSLogix is self-contained)
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>fslogixSlice.ts exists with all 5 actions, Map operations correct, muted persistence works</done>
</task>

<task type="auto">
  <name>Task 2: Create slices barrel export</name>
  <files>src/store/slices/index.ts</files>
  <action>
Create `src/store/slices/index.ts` as barrel export for all slices:

```typescript
export { createConfigSlice } from './configSlice';
export { createEndpointSlice } from './endpointSlice';
export { createFslogixSlice } from './fslogixSlice';
export { createUiSlice } from './uiSlice';
```

This allows the combined store to import all slices from a single location.
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>slices/index.ts exports all 4 slice creators</done>
</task>

</tasks>

<verification>
After both tasks:
1. `pnpm exec tsc --noEmit` passes
2. fslogixSlice.ts has all 5 actions from FslogixSlice interface
3. slices/index.ts exports all 4 createXSlice functions
4. FSLogix muted state persists via invoke command
</verification>

<success_criteria>
- fslogixSlice created with all FSLogix state and actions
- Consecutive failure tracking preserved
- Muted state persistence via Tauri command
- Barrel export ready for store combination
- TypeScript compilation successful
</success_criteria>

<output>
After completion, create `.planning/phases/3-state-refactor/3-04-SUMMARY.md`
</output>
