---
phase: 7-testing
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/__mocks__/zustand.ts
  - src/test/setup.ts
  - src/test/tauriMocks.ts
  - src/store/slices/uiSlice.test.ts
  - src/store/slices/configSlice.test.ts
  - src/store/slices/fslogixSlice.test.ts
  - src/store/slices/endpointSlice.test.ts
autonomous: true

must_haves:
  truths:
    - "Store slices have unit tests covering core actions"
    - "Tests reset state between runs (no cross-test pollution)"
    - "Tauri commands are mockable for settings operations"
  artifacts:
    - path: "src/__mocks__/zustand.ts"
      provides: "Automatic Zustand state reset between tests"
      min_lines: 30
    - path: "src/test/tauriMocks.ts"
      provides: "Centralized Tauri mock setup for settings commands"
      min_lines: 20
    - path: "src/store/slices/uiSlice.test.ts"
      provides: "Unit tests for UI slice"
      min_lines: 30
    - path: "src/store/slices/configSlice.test.ts"
      provides: "Unit tests for config slice"
      min_lines: 20
    - path: "src/store/slices/fslogixSlice.test.ts"
      provides: "Unit tests for FSLogix slice"
      min_lines: 40
    - path: "src/store/slices/endpointSlice.test.ts"
      provides: "Unit tests for endpoint slice"
      min_lines: 60
  key_links:
    - from: "src/__mocks__/zustand.ts"
      to: "useAppStore"
      via: "vi.mock intercept"
      pattern: "storeResetFns"
    - from: "src/store/slices/*.test.ts"
      to: "useAppStore"
      via: "getState/setState"
      pattern: "useAppStore\\.getState\\(\\)"
---

<objective>
Create test infrastructure and unit tests for all Zustand store slices.

Purpose: Establishes proper testing foundation with automatic state reset between tests, expanded Tauri mocking, and comprehensive slice-level unit tests. Satisfies TEST-03 requirement.

Output: Zustand mock file, Tauri mock helpers, 4 slice test files with full action coverage.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/7-testing/7-RESEARCH.md

@src/test/setup.ts
@src/store/useAppStore.ts
@src/store/slices/uiSlice.ts
@src/store/slices/configSlice.ts
@src/store/slices/fslogixSlice.ts
@src/store/slices/endpointSlice.ts
@src/store/useAppStore.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Zustand mock and expand Tauri mocks</name>
  <files>
    src/__mocks__/zustand.ts
    src/test/tauriMocks.ts
    src/test/setup.ts
  </files>
  <action>
Create proper Zustand mock for automatic state reset between tests:

1. Create `src/__mocks__/zustand.ts`:
   - Follow the official Zustand testing pattern from https://zustand.docs.pmnd.rs/guides/testing
   - Use `vi.importActual` to get real create/createStore functions
   - Track all stores in a `storeResetFns` Set
   - Register reset function for each store using `getInitialState()`
   - Export afterEach hook that resets all stores via `act()`
   - Important: Use async `vi.importActual` pattern for ESM compatibility

2. Create `src/test/tauriMocks.ts`:
   - Export a `mockSettingsResponse` object with realistic settings data:
     - version: 1
     - config: full AppConfig with mode 'sessionhost', testInterval 10, thresholds, etc.
     - endpoints: array with at least one endpoint (Azure AD Authentication)
     - modeInfo: { name: 'Session Host Mode', description: '...' }
   - Export `setupTauriMocks()` function that calls `mockIPC()` with handlers for:
     - `read_settings_with_endpoints` -> return mockSettingsResponse
     - `read_settings_for_mode` -> return modified mockSettingsResponse with args.mode
     - `write_settings_file` -> return undefined (success)
     - `update_endpoint` -> return undefined
     - `update_fslogix_path_muted` -> return undefined
   - Export `cleanupTauriMocks()` that calls `clearMocks()`

3. Update `src/test/setup.ts`:
   - Import and use the new tauriMocks.ts
   - Keep existing localStorage mock
   - Add afterEach call to cleanupTauriMocks

Note: Do NOT add `vi.mock('zustand')` to setup.ts - let test files opt-in to the mock by using vi.mock themselves if needed.
  </action>
  <verify>
Run `pnpm test:run` - existing tests in useAppStore.test.ts and utils.test.ts should still pass.
  </verify>
  <done>
Zustand mock file exists at src/__mocks__/zustand.ts, Tauri mock helpers at src/test/tauriMocks.ts, setup.ts updated.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create slice unit tests</name>
  <files>
    src/store/slices/uiSlice.test.ts
    src/store/slices/configSlice.test.ts
    src/store/slices/fslogixSlice.test.ts
    src/store/slices/endpointSlice.test.ts
  </files>
  <action>
Create comprehensive unit tests for each Zustand slice. These tests use `useAppStore.getState()` and `useAppStore.setState()` directly (no component rendering).

1. `src/store/slices/uiSlice.test.ts`:
   - Test setCurrentView: switching between 'dashboard' and 'settings'
   - Test setMonitoring: toggling true/false
   - Test setPaused: toggling true/false
   - Test triggerTestNow: sets pendingTestTrigger to true
   - Test clearTestTrigger: sets pendingTestTrigger to false
   - Use beforeEach to reset store state (call useAppStore.setState with initial UI state)

2. `src/store/slices/configSlice.test.ts`:
   - Test setConfig with partial updates (testInterval only)
   - Test setConfig preserves existing config values
   - Test setConfig with thresholds update
   - Mock the Tauri invoke for write_settings_file (uses vi.mock or the tauriMocks helper)
   - Use beforeEach to reset store state

3. `src/store/slices/fslogixSlice.test.ts`:
   - Test setFSLogixPaths: sets array of paths
   - Test updateFSLogixStatus: creates new status entry
   - Test updateFSLogixStatus: increments consecutiveFailures on failure
   - Test updateFSLogixStatus: resets consecutiveFailures on success
   - Test setFSLogixLoading: sets isLoading for specific path
   - Test setAllFSLogixLoading: sets isLoading for all paths
   - Test updateFSLogixPathMuted: updates muted flag (mock invoke)
   - Create mock FSLogixPath objects for tests
   - Use beforeEach to reset store state

4. `src/store/slices/endpointSlice.test.ts`:
   - Test setEndpoints: replaces endpoint list
   - Test setModeInfo: sets mode info object
   - Test updateEndpointEnabled: toggles enabled, updates endpointStatuses
   - Test updateEndpointMuted: toggles muted flag
   - Test addCustomEndpoint: adds to customEndpoints and endpoints, generates ID
   - Test updateCustomEndpoint: updates properties
   - Test removeCustomEndpoint: removes from both arrays
   - Test updateLatency: creates/updates status, adds to history
   - Test updateLatency with error: sets error field
   - Test setEndpointLoading: sets isLoading flag
   - Test setAllEndpointsLoading: sets loading for all enabled endpoints
   - Test clearEndpointError: clears error field
   - Mock Tauri invoke calls (write_settings_file, update_endpoint)
   - Use beforeEach to reset store state

Pattern for each test file:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../useAppStore';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}));

describe('sliceName', () => {
  beforeEach(() => {
    // Reset to initial state
    useAppStore.setState({
      // relevant initial values
    });
  });

  describe('actionName', () => {
    it('should do expected behavior', () => {
      const { actionName } = useAppStore.getState();
      actionName(args);
      expect(useAppStore.getState().property).toBe(expected);
    });
  });
});
```
  </action>
  <verify>
Run `pnpm test:run` - all slice tests pass along with existing tests. Run `pnpm test:run -- --coverage` to see coverage improvement.
  </verify>
  <done>
All 4 slice test files exist and pass. Store slices have comprehensive unit test coverage for their actions.
  </done>
</task>

</tasks>

<verification>
- [ ] `pnpm test:run` passes with 0 failures
- [ ] src/__mocks__/zustand.ts exists with storeResetFns pattern
- [ ] src/test/tauriMocks.ts exists with mockSettingsResponse and setup/cleanup functions
- [ ] All 4 slice test files exist in src/store/slices/
- [ ] Each slice test file tests all public actions
- [ ] Tests use getState()/setState() pattern (no component rendering)
</verification>

<success_criteria>
TEST-03 satisfied: Zustand store slices have unit tests covering all core actions. Test infrastructure supports proper state isolation between tests.
</success_criteria>

<output>
After completion, create `.planning/phases/7-testing/7-01-SUMMARY.md`
</output>
