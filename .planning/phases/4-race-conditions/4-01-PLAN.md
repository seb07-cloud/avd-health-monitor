---
phase: 4-race-conditions
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/stateUtils.ts
  - src/components/SettingsPanel.tsx
autonomous: true

must_haves:
  truths:
    - "Mode switch triggers tests only after endpoints are loaded"
    - "No setTimeout in SettingsPanel mode switch handler"
    - "waitForState utility resolves when condition is met"
  artifacts:
    - path: "src/lib/stateUtils.ts"
      provides: "Promise-based state wait utility"
      exports: ["waitForState", "waitForEndpointsLoaded"]
    - path: "src/components/SettingsPanel.tsx"
      provides: "Mode switch using waitForEndpointsLoaded"
      contains: "await waitForEndpointsLoaded"
  key_links:
    - from: "src/components/SettingsPanel.tsx"
      to: "src/lib/stateUtils.ts"
      via: "import waitForEndpointsLoaded"
      pattern: "import.*waitForEndpointsLoaded.*from.*stateUtils"
    - from: "src/lib/stateUtils.ts"
      to: "src/store/useAppStore.ts"
      via: "useAppStore.subscribe"
      pattern: "useAppStore\\.subscribe"
---

<objective>
Create waitForState utility and fix SettingsPanel mode switch race condition

Purpose: Replace setTimeout workaround with proper Zustand subscribe-based state waiting
Output: stateUtils.ts with waitForState/waitForEndpointsLoaded, updated SettingsPanel.tsx
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/4-race-conditions/4-RESEARCH.md

# Current files to modify
@src/lib/utils.ts (existing lib structure)
@src/components/SettingsPanel.tsx (has setTimeout on line 53-55)
@src/store/useAppStore.ts (provides subscribe)
@src/store/types.ts (AppState type)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create stateUtils.ts with waitForState utility</name>
  <files>src/lib/stateUtils.ts</files>
  <action>
Create new file `src/lib/stateUtils.ts` with:

1. Import AppState type from store/types
2. Import useAppStore from store/useAppStore

3. `waitForState<T>` function:
   - Generic function that takes selector and predicate
   - Returns Promise<T> that resolves when predicate becomes true
   - CHECK current state first (immediate resolve if already true)
   - THEN subscribe only if condition not yet met
   - Include 5000ms timeout with reject (prevents hanging)
   - Properly clean up subscription on resolve/reject/timeout

```typescript
export const waitForState = <T>(
  selector: (state: AppState) => T,
  predicate: (value: T) => boolean,
  timeoutMs = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Check current state first - avoids subscribe if already true
    const currentValue = selector(useAppStore.getState());
    if (predicate(currentValue)) {
      resolve(currentValue);
      return;
    }

    // Set up timeout
    const timeout = setTimeout(() => {
      unsub();
      reject(new Error('waitForState timed out'));
    }, timeoutMs);

    // Subscribe and wait for condition
    const unsub = useAppStore.subscribe((state) => {
      const value = selector(state);
      if (predicate(value)) {
        clearTimeout(timeout);
        unsub();
        resolve(value);
      }
    });
  });
};
```

4. `waitForEndpointsLoaded` convenience function:
   - Calls waitForState with endpoints selector
   - Predicate: endpoints.length > 1 (more than default fallback)
   - Default timeout of 5000ms

```typescript
export const waitForEndpointsLoaded = (timeoutMs = 5000) =>
  waitForState(
    (state) => state.endpoints,
    (endpoints) => endpoints.length > 1,
    timeoutMs
  );
```
  </action>
  <verify>
    - File exists at src/lib/stateUtils.ts
    - TypeScript compiles: `pnpm exec tsc --noEmit`
    - Exports waitForState and waitForEndpointsLoaded
  </verify>
  <done>
    - stateUtils.ts exports both functions
    - No TypeScript errors
  </done>
</task>

<task type="auto">
  <name>Task 2: Update SettingsPanel to use waitForEndpointsLoaded</name>
  <files>src/components/SettingsPanel.tsx</files>
  <action>
Modify `src/components/SettingsPanel.tsx`:

1. Add import at top:
```typescript
import { waitForEndpointsLoaded } from '../lib/stateUtils';
```

2. Update `handleModeChange` function (around line 46-57):

BEFORE (current code with setTimeout):
```typescript
const handleModeChange = async (mode: AppMode) => {
  const success = await loadSettingsForMode(mode);
  if (success) {
    setTimeout(() => {
      triggerTestNow();
    }, 50);
  }
};
```

AFTER (using waitForEndpointsLoaded):
```typescript
const handleModeChange = async (mode: AppMode) => {
  const success = await loadSettingsForMode(mode);
  if (success) {
    // Wait for endpoints to be loaded before triggering tests
    // This replaces setTimeout workaround with proper state sequencing
    try {
      await waitForEndpointsLoaded();
      triggerTestNow();
    } catch (error) {
      console.error('[SettingsPanel] Timeout waiting for endpoints:', error);
      // Still trigger test - endpoints may have loaded via different path
      triggerTestNow();
    }
  }
};
```

The try/catch ensures test still triggers even if timeout occurs (graceful degradation).
  </action>
  <verify>
    - No setTimeout in handleModeChange function
    - TypeScript compiles: `pnpm exec tsc --noEmit`
    - App builds: `pnpm build`
  </verify>
  <done>
    - SettingsPanel uses waitForEndpointsLoaded instead of setTimeout
    - RACE-01 requirement addressed: "Mode switch uses proper state sequencing (no setTimeout)"
  </done>
</task>

</tasks>

<verification>
```bash
# TypeScript compiles
pnpm exec tsc --noEmit

# Build succeeds
pnpm build

# Verify no setTimeout in mode switch handler
grep -n "setTimeout" src/components/SettingsPanel.tsx  # Should return nothing
```
</verification>

<success_criteria>
- src/lib/stateUtils.ts exists with waitForState and waitForEndpointsLoaded exports
- SettingsPanel.tsx imports waitForEndpointsLoaded
- SettingsPanel.tsx handleModeChange has no setTimeout
- TypeScript compiles without errors
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/4-race-conditions/4-01-SUMMARY.md`
</output>
