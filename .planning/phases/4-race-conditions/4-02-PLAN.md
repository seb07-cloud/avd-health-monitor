---
phase: 4-race-conditions
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/App.tsx
autonomous: true

must_haves:
  truths:
    - "Test trigger subscription has no setTimeout"
    - "Tests run immediately when pendingTestTrigger becomes true"
    - "Endpoints are guaranteed loaded before tests run"
  artifacts:
    - path: "src/App.tsx"
      provides: "Race-condition-free test trigger"
      contains: "!prevState.pendingTestTrigger"
  key_links:
    - from: "src/App.tsx pendingTestTrigger subscription"
      to: "runAllTests callback"
      via: "direct call (no setTimeout)"
      pattern: "if.*pendingTestTrigger.*runAllTests\\(\\)"
---

<objective>
Remove setTimeout from App.tsx test trigger subscription

Purpose: Complete race condition elimination by removing the second setTimeout workaround
Output: App.tsx with direct test triggering in subscribe callback
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/4-race-conditions/4-RESEARCH.md

# Current file to modify
@src/App.tsx (has setTimeout on lines 293-296)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove setTimeout from pendingTestTrigger subscription</name>
  <files>src/App.tsx</files>
  <action>
Modify the `pendingTestTrigger` subscription effect in `src/App.tsx` (around lines 284-301).

BEFORE (current code with setTimeout):
```typescript
// Watch for pending test trigger (e.g., after mode switch)
// Use Zustand subscribe to avoid React re-render timing issues
useEffect(() => {
  const unsubscribe = useAppStore.subscribe(
    (state, prevState) => {
      // Check if pendingTestTrigger changed from false to true
      if (state.pendingTestTrigger && !prevState.pendingTestTrigger) {
        // Clear the trigger immediately
        useAppStore.getState().clearTestTrigger();
        // Small delay to ensure endpoints are fully loaded in the store
        setTimeout(() => {
          runAllTests();
        }, 100);
      }
    }
  );
  return () => unsubscribe();
}, [runAllTests]);
```

AFTER (direct call, no setTimeout):
```typescript
// Watch for pending test trigger (e.g., after mode switch)
// Use Zustand subscribe to avoid React re-render timing issues
// Note: No setTimeout needed because triggerTestNow() is only called
// after waitForEndpointsLoaded() resolves (see SettingsPanel.tsx)
useEffect(() => {
  const unsubscribe = useAppStore.subscribe(
    (state, prevState) => {
      // Check if pendingTestTrigger changed from false to true
      if (state.pendingTestTrigger && !prevState.pendingTestTrigger) {
        // Clear the trigger immediately
        useAppStore.getState().clearTestTrigger();
        // Run tests directly - endpoints are guaranteed loaded
        // (waitForEndpointsLoaded in SettingsPanel ensures this)
        runAllTests();
      }
    }
  );
  return () => unsubscribe();
}, [runAllTests]);
```

WHY this is safe:
1. The only caller of `triggerTestNow()` is `SettingsPanel.handleModeChange`
2. Plan 4-01 updated that to call `await waitForEndpointsLoaded()` BEFORE `triggerTestNow()`
3. Therefore, when `pendingTestTrigger` becomes true, endpoints are already loaded
4. No delay needed - can call `runAllTests()` immediately

The comment update documents this contract between SettingsPanel and App.tsx.
  </action>
  <verify>
    - No setTimeout in the pendingTestTrigger subscription effect
    - TypeScript compiles: `pnpm exec tsc --noEmit`
    - App builds: `pnpm build`
  </verify>
  <done>
    - App.tsx pendingTestTrigger effect has no setTimeout
    - RACE-02 requirement addressed: "App.tsx test triggers use Zustand subscribe pattern"
    - RACE-03 requirement addressed: "Endpoint loading completes before tests trigger"
  </done>
</task>

<task type="auto">
  <name>Task 2: Verify no other setTimeout race workarounds</name>
  <files>src/App.tsx, src/components/SettingsPanel.tsx</files>
  <action>
Audit both files to confirm no setTimeout workarounds remain:

1. Run: `grep -n "setTimeout" src/App.tsx`
   - Should show NO matches related to state timing
   - (Note: setTimeout in runEndpointTests simulated test is OK if it exists)

2. Run: `grep -n "setTimeout" src/components/SettingsPanel.tsx`
   - Should show NO matches

3. Verify runAllTests and runEndpointTests use `useAppStore.getState()`:
   - runEndpointTests already uses `const state = useAppStore.getState()` (line 137)
   - runFSLogixTests already uses `const state = useAppStore.getState()` (line 186)
   - This pattern avoids stale closure issues (documented in research)

4. Document any remaining setTimeout usage:
   - If any legitimate setTimeout exists (not race workaround), note in summary
  </action>
  <verify>
    - `grep -n "setTimeout" src/App.tsx` returns no race-condition workarounds
    - `grep -n "setTimeout" src/components/SettingsPanel.tsx` returns nothing
    - Fresh state pattern (`useAppStore.getState()`) is used in test functions
  </verify>
  <done>
    - No setTimeout race workarounds in App.tsx or SettingsPanel.tsx
    - Fresh state pattern confirmed in test callbacks
    - Phase 4 race condition elimination complete
  </done>
</task>

</tasks>

<verification>
```bash
# TypeScript compiles
pnpm exec tsc --noEmit

# Build succeeds
pnpm build

# Verify no setTimeout in App.tsx pendingTestTrigger effect
grep -n "setTimeout" src/App.tsx

# Verify no setTimeout in SettingsPanel
grep -n "setTimeout" src/components/SettingsPanel.tsx

# Run tests
pnpm test:run
```
</verification>

<success_criteria>
- App.tsx pendingTestTrigger subscription calls runAllTests() directly (no setTimeout)
- No setTimeout race workarounds in App.tsx or SettingsPanel.tsx
- TypeScript compiles without errors
- Build succeeds
- All requirements addressed: RACE-01, RACE-02, RACE-03
</success_criteria>

<output>
After completion, create `.planning/phases/4-race-conditions/4-02-SUMMARY.md`
</output>
