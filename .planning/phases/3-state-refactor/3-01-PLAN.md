---
phase: 3-state-refactor
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/store/persistence/index.ts
  - src/store/types.ts
autonomous: true

must_haves:
  truths:
    - "Persistence helpers can be imported by slice files"
    - "Slice type definitions enable StateCreator pattern"
    - "Storage key remains 'avd-health-monitor-state'"
  artifacts:
    - path: "src/store/persistence/index.ts"
      provides: "Persistence helpers, serialization, migration"
      exports: ["STORAGE_KEY", "DEFAULT_CONFIG", "serializeHistory", "deserializeHistory", "cleanupOldHistory", "saveSettingsToFile", "updateEndpointInFile", "handleMigration"]
    - path: "src/store/types.ts"
      provides: "Slice interface types and combined AppState"
      exports: ["ConfigSlice", "EndpointSlice", "FslogixSlice", "UiSlice", "AppState", "PersistedState", "SerializedHistory"]
  key_links:
    - from: "src/store/persistence/index.ts"
      to: "@tauri-apps/api/core"
      via: "invoke for file operations"
      pattern: "invoke\\("
---

<objective>
Extract persistence logic and define slice types for the state refactor.

Purpose: Create the foundation that all slice files will import - persistence helpers and type definitions must exist before slices can be created.

Output: `src/store/persistence/index.ts` with all persistence logic, `src/store/types.ts` with slice interfaces.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/3-state-refactor/3-RESEARCH.md
@src/store/useAppStore.ts
@src/types.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create persistence module</name>
  <files>src/store/persistence/index.ts</files>
  <action>
Create `src/store/persistence/index.ts` by extracting from `useAppStore.ts`:

1. Export `STORAGE_KEY = 'avd-health-monitor-state'` (DO NOT change - preserves user data)
2. Export `HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000`
3. Export `DEFAULT_THRESHOLDS` and `DEFAULT_CONFIG` constants
4. Export `DEFAULT_ENDPOINTS` fallback array
5. Export `SerializedHistory` interface
6. Export `PersistedState` interface
7. Export `cleanupOldHistory` function
8. Export `serializeHistory` function
9. Export `deserializeHistory` function
10. Export `saveSettingsToFile` async function (uses invoke)
11. Export `updateEndpointInFile` async function (uses invoke)
12. Export `handleMigration` function that handles v9 -> v10 migration (state structure compatible, just ensure defaults)

Import types from `../types` (the existing src/types.ts).
Import `invoke` from `@tauri-apps/api/core`.

The migration function should:
- Accept `(persistedState: unknown, version: number)`
- Return `PersistedState`
- For version < 10: spread DEFAULT_CONFIG over persisted config, preserve customEndpoints and historyData
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>persistence/index.ts exists with all helpers exported, TypeScript has no errors</done>
</task>

<task type="auto">
  <name>Task 2: Create slice type definitions</name>
  <files>src/store/types.ts</files>
  <action>
Create `src/store/types.ts` with slice interface definitions:

1. `ConfigSlice` interface:
   - `config: AppConfig`
   - `setConfig: (config: Partial<AppConfig>) => void`

2. `EndpointSlice` interface:
   - `endpoints: Endpoint[]`
   - `customEndpoints: CustomEndpoint[]`
   - `modeInfo: ModeInfo | null`
   - `endpointStatuses: Map<string, EndpointStatus>`
   - All endpoint actions from current AppState (setEndpoints, setModeInfo, updateEndpointEnabled, updateEndpointMuted, updateModeEndpoint, addCustomEndpoint, updateCustomEndpoint, removeCustomEndpoint, setCustomEndpoints, updateLatency, setEndpointLoading, setAllEndpointsLoading, clearEndpointError, getEndpointStatus, restoreHistoryForEndpoints)

3. `FslogixSlice` interface:
   - `fslogixPaths: FSLogixPath[]`
   - `fslogixStatuses: Map<string, FSLogixStatus>`
   - All FSLogix actions (setFSLogixPaths, updateFSLogixStatus, setFSLogixLoading, setAllFSLogixLoading, updateFSLogixPathMuted)

4. `UiSlice` interface:
   - `currentView: 'dashboard' | 'settings'`
   - `isMonitoring: boolean`
   - `isPaused: boolean`
   - `pendingTestTrigger: boolean`
   - All UI actions (setCurrentView, setMonitoring, setPaused, triggerTestNow, clearTestTrigger)

5. `AppState` type: `ConfigSlice & EndpointSlice & FslogixSlice & UiSlice`

Import domain types from `../types` (Endpoint, AppConfig, etc).
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>src/store/types.ts exists with all slice interfaces and combined AppState type</done>
</task>

</tasks>

<verification>
After both tasks:
1. `pnpm exec tsc --noEmit` passes
2. `src/store/persistence/index.ts` exports all persistence functions
3. `src/store/types.ts` exports all slice interfaces
4. No changes to `useAppStore.ts` yet (slices will use these in later plans)
</verification>

<success_criteria>
- Persistence module created with STORAGE_KEY unchanged
- All slice interfaces defined with correct action signatures
- TypeScript compilation successful
- Foundation ready for slice creation in Plan 02-04
</success_criteria>

<output>
After completion, create `.planning/phases/3-state-refactor/3-01-SUMMARY.md`
</output>
