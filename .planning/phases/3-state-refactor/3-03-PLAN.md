---
phase: 3-state-refactor
plan: 03
type: execute
wave: 2
depends_on: ["3-01"]
files_modified:
  - src/store/slices/endpointSlice.ts
autonomous: true

must_haves:
  truths:
    - "endpointSlice manages all endpoint state"
    - "Custom endpoints persist to settings file"
    - "Mode endpoints persist to endpoint JSON file"
    - "Latency updates create EndpointStatus entries"
  artifacts:
    - path: "src/store/slices/endpointSlice.ts"
      provides: "Endpoint state and all endpoint actions"
      exports: ["createEndpointSlice"]
      min_lines: 200
  key_links:
    - from: "src/store/slices/endpointSlice.ts"
      to: "src/store/persistence/index.ts"
      via: "saveSettingsToFile, updateEndpointInFile imports"
      pattern: "import.*from.*persistence"
    - from: "src/store/slices/endpointSlice.ts"
      to: "src/lib/utils"
      via: "getLatencyStatus for status calculation"
      pattern: "getLatencyStatus"
---

<objective>
Create endpointSlice - the largest slice with endpoint management, custom endpoints, and latency tracking.

Purpose: This slice contains the bulk of the store logic - 15 actions managing endpoints, custom endpoints, and endpoint statuses. Isolating it improves maintainability.

Output: `src/store/slices/endpointSlice.ts` with all endpoint-related state and actions.
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
@src/errors.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create endpointSlice with state and basic actions</name>
  <files>src/store/slices/endpointSlice.ts</files>
  <action>
Create `src/store/slices/endpointSlice.ts` with initial state and simpler actions:

1. Import StateCreator from zustand
2. Import types from '../types' (AppState, EndpointSlice)
3. Import from '../persistence' (DEFAULT_ENDPOINTS, STORAGE_KEY, saveSettingsToFile, updateEndpointInFile, cleanupOldHistory, SerializedHistory)
4. Import { getLatencyStatus } from '../../lib/utils'
5. Import { parseBackendError, getUserFriendlyErrorMessage } from '../../errors'
6. Import EndpointStatus, EndpointError from '../../types'

Create the slice creator:
```typescript
export const createEndpointSlice: StateCreator<
  AppState,
  [],
  [],
  EndpointSlice
> = (set, get) => ({
  // Initial state
  endpoints: DEFAULT_ENDPOINTS,
  customEndpoints: [],
  modeInfo: null,
  endpointStatuses: new Map(),

  // Actions - copy logic from useAppStore.ts
  setEndpoints: (endpoints) => set({ endpoints }),
  setModeInfo: (modeInfo) => set({ modeInfo }),

  // ... continue with all 15 actions
});
```

Copy these actions from useAppStore.ts, adapting to use get() for cross-slice access:
- setEndpoints
- setModeInfo
- updateEndpointEnabled (uses get().config.mode for file path)
- updateEndpointMuted (uses get().config.mode)
- updateModeEndpoint (uses get().config.mode)
- addCustomEndpoint (uses saveSettingsToFile with get().config)
- updateCustomEndpoint (uses saveSettingsToFile with get().config)
- removeCustomEndpoint (uses saveSettingsToFile with get().config)
- setCustomEndpoints
- updateLatency (uses get().config.thresholds for status calculation)
- setEndpointLoading
- setAllEndpointsLoading
- clearEndpointError
- getEndpointStatus
- restoreHistoryForEndpoints (uses STORAGE_KEY constant)

Key adaptations:
- Replace `state.config` with `get().config` for cross-slice access
- Import STORAGE_KEY from persistence for restoreHistoryForEndpoints
- Keep all Map operations identical
  </action>
  <verify>TypeScript compiles: `cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit`</verify>
  <done>endpointSlice.ts exists with all 15 actions, cross-slice access uses get()</done>
</task>

<task type="auto">
  <name>Task 2: Verify endpointSlice completeness</name>
  <files>src/store/slices/endpointSlice.ts</files>
  <action>
Review endpointSlice.ts and verify:

1. All 15 actions from EndpointSlice interface are implemented:
   - setEndpoints
   - setModeInfo
   - updateEndpointEnabled
   - updateEndpointMuted
   - updateModeEndpoint
   - addCustomEndpoint
   - updateCustomEndpoint
   - removeCustomEndpoint
   - setCustomEndpoints
   - updateLatency
   - setEndpointLoading
   - setAllEndpointsLoading
   - clearEndpointError
   - getEndpointStatus
   - restoreHistoryForEndpoints

2. Cross-slice access patterns are correct:
   - `get().config` for accessing config (from ConfigSlice)
   - `get().customEndpoints` for custom endpoint list

3. Persistence calls are correct:
   - Custom endpoint changes call saveSettingsToFile(get().config, get().customEndpoints)
   - Mode endpoint changes call updateEndpointInFile(get().config.mode, id, updates)

4. Error handling preserved:
   - updateLatency uses parseBackendError and getUserFriendlyErrorMessage
   - EndpointError structure maintained
  </action>
  <verify>
Run TypeScript check and grep for all action names:
```bash
cd /Users/seb/Git/avd-health-monitor && pnpm exec tsc --noEmit
grep -E "setEndpoints|setModeInfo|updateEndpointEnabled|updateEndpointMuted|updateModeEndpoint|addCustomEndpoint|updateCustomEndpoint|removeCustomEndpoint|setCustomEndpoints|updateLatency|setEndpointLoading|setAllEndpointsLoading|clearEndpointError|getEndpointStatus|restoreHistoryForEndpoints" src/store/slices/endpointSlice.ts | wc -l
```
Should show >= 15 matches (one per action).
  </verify>
  <done>All 15 actions implemented, cross-slice access correct, persistence calls verified</done>
</task>

</tasks>

<verification>
After both tasks:
1. `pnpm exec tsc --noEmit` passes
2. endpointSlice.ts has all 15 actions from EndpointSlice interface
3. Cross-slice access uses get() pattern correctly
4. Persistence logic preserved for custom and mode endpoints
</verification>

<success_criteria>
- endpointSlice created with all endpoint state and actions
- Custom endpoint CRUD persists to settings file
- Mode endpoint updates persist to endpoint JSON file
- Latency updates calculate status using config thresholds
- TypeScript compilation successful
</success_criteria>

<output>
After completion, create `.planning/phases/3-state-refactor/3-03-SUMMARY.md`
</output>
