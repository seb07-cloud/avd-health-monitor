---
phase: 7-testing
plan: 02
type: execute
wave: 2
depends_on: ["7-01"]
files_modified:
  - src/test/integration/settingsRoundtrip.test.ts
  - src/test/integration/modeSwitching.test.ts
autonomous: true

must_haves:
  truths:
    - "Settings save/load roundtrip can be tested"
    - "Mode switching flow can be tested"
    - "Integration tests verify full flow behavior"
  artifacts:
    - path: "src/test/integration/settingsRoundtrip.test.ts"
      provides: "Integration tests for settings persistence"
      min_lines: 50
    - path: "src/test/integration/modeSwitching.test.ts"
      provides: "Integration tests for mode switch flow"
      min_lines: 40
  key_links:
    - from: "settingsRoundtrip.test.ts"
      to: "@tauri-apps/api/core"
      via: "mocked invoke"
      pattern: "invoke.*read_settings|write_settings"
    - from: "modeSwitching.test.ts"
      to: "useAppStore"
      via: "getState/setState"
      pattern: "setConfig.*mode"
---

<objective>
Create integration tests for settings roundtrip and mode switching flows.

Purpose: Tests the full flow of saving/loading settings and switching between Session Host and End User modes. Satisfies TEST-01 and TEST-02 requirements.

Output: Two integration test files verifying settings persistence and mode switching behavior.
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
@.planning/phases/7-testing/7-01-SUMMARY.md

@src/test/setup.ts
@src/test/tauriMocks.ts
@src/store/useAppStore.ts
@src/store/persistence/index.ts
@src/lib/waitForState.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create settings roundtrip integration test</name>
  <files>
    src/test/integration/settingsRoundtrip.test.ts
  </files>
  <action>
Create integration test for settings save/load roundtrip.

Create `src/test/integration/settingsRoundtrip.test.ts`:

1. Test structure:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../store/useAppStore';
```

2. Test cases:

**"settings roundtrip preserves config values":**
- Set up mockIPC to track write_settings_file calls
- Use useAppStore.getState().setConfig() to change settings
- Verify the mock was called with updated config values
- Mock read_settings_with_endpoints to return the saved values
- Call invoke('read_settings_with_endpoints')
- Verify returned config matches what was saved

**"settings roundtrip preserves custom endpoints":**
- Add a custom endpoint via addCustomEndpoint()
- Verify write_settings_file was called with the custom endpoint
- Mock read_settings_with_endpoints to return saved custom endpoints
- Verify custom endpoints are preserved

**"settings handles missing fields with defaults":**
- Mock read_settings_with_endpoints to return partial config (missing thresholds)
- Verify store uses default values for missing fields

**"settings handles empty JSON":**
- Mock read_settings_with_endpoints to return { version: 1, config: {}, endpoints: [], modeInfo: null }
- Verify store applies defaults

3. Use beforeEach to:
   - Reset store state
   - Set up mockIPC with tracking

4. Use afterEach to:
   - clearMocks()

5. Pattern for tracking mock calls:
```typescript
let writtenSettings: unknown = null;
mockIPC((cmd, args) => {
  if (cmd === 'write_settings_file') {
    writtenSettings = args;
    return undefined;
  }
  // ... other handlers
});
```

Note: This tests the frontend's perspective of the roundtrip. The actual file I/O is in Rust and tested separately.
  </action>
  <verify>
Run `pnpm test:run src/test/integration/settingsRoundtrip.test.ts` - all tests pass.
  </verify>
  <done>
Settings roundtrip integration tests verify config persistence, custom endpoint persistence, and default handling.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create mode switching integration test</name>
  <files>
    src/test/integration/modeSwitching.test.ts
  </files>
  <action>
Create integration test for mode switching flow.

Create `src/test/integration/modeSwitching.test.ts`:

1. Test structure:
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { useAppStore } from '../../store/useAppStore';
```

2. Mock data setup:
```typescript
const sessionHostEndpoints = [
  { id: 'rdgateway', name: 'RD Gateway', url: 'gateway.example.com', port: 443, protocol: 'tcp', enabled: true },
];

const endUserEndpoints = [
  { id: 'rdclient', name: 'RD Client', url: 'rdweb.example.com', port: 443, protocol: 'tcp', enabled: true },
];
```

3. Test cases:

**"mode switch updates config.mode":**
- Start with mode 'sessionhost'
- Call setConfig({ mode: 'enduser' })
- Verify useAppStore.getState().config.mode === 'enduser'

**"mode switch triggers endpoint reload":**
- Mock read_settings_for_mode to return different endpoints per mode
- Start with 'sessionhost' mode and sessionHostEndpoints
- Switch to 'enduser' mode
- Simulate the endpoint reload (call setEndpoints with endUserEndpoints)
- Verify endpoints changed

**"mode switch preserves non-mode settings":**
- Set testInterval to 20
- Switch mode
- Verify testInterval still 20

**"mode switch triggers test (pendingTestTrigger)":**
- Verify pendingTestTrigger is false initially
- After mode switch flow completes (simulated), pendingTestTrigger should be true
- This tests the triggerTestNow() integration

**"mode switch does not affect custom endpoints":**
- Add a custom endpoint
- Switch mode
- Custom endpoints should still exist

4. Pattern for simulating mode switch flow:
```typescript
// Simulate the mode switch flow from SettingsPanel
const { setConfig, setEndpoints, triggerTestNow } = useAppStore.getState();

// 1. Update config
setConfig({ mode: 'enduser' });

// 2. Load new endpoints (normally done via invoke + setEndpoints)
setEndpoints(endUserEndpoints);

// 3. Trigger test
triggerTestNow();

// Verify final state
const state = useAppStore.getState();
expect(state.config.mode).toBe('enduser');
expect(state.pendingTestTrigger).toBe(true);
```

5. Use beforeEach/afterEach for cleanup.
  </action>
  <verify>
Run `pnpm test:run src/test/integration/modeSwitching.test.ts` - all tests pass.
  </verify>
  <done>
Mode switching integration tests verify config update, endpoint reload, settings preservation, and test trigger behavior.
  </done>
</task>

</tasks>

<verification>
- [ ] `pnpm test:run` passes all tests including new integration tests
- [ ] src/test/integration/settingsRoundtrip.test.ts exists with roundtrip tests
- [ ] src/test/integration/modeSwitching.test.ts exists with mode switch tests
- [ ] Tests use mocked Tauri IPC (no real file system calls)
- [ ] Tests verify both happy path and edge cases
</verification>

<success_criteria>
TEST-01 satisfied: Settings save/load roundtrip has integration tests.
TEST-02 satisfied: Mode switching flow has integration tests.
</success_criteria>

<output>
After completion, create `.planning/phases/7-testing/7-02-SUMMARY.md`
</output>
