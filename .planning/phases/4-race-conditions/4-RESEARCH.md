# Phase 4: Race Conditions - Research

**Researched:** 2026-01-16
**Domain:** Zustand state sequencing, async coordination, subscribe patterns
**Confidence:** HIGH

## Summary

This phase eliminates setTimeout workarounds in the mode switch flow by implementing proper state sequencing using Zustand's subscribe pattern. Currently, the app has two setTimeout calls (50ms and 100ms) that work around a race condition where test triggers fire before endpoints are loaded into the store.

The core issue is a multi-step async flow that spans:
1. User clicks mode change -> `loadSettingsForMode()` invokes Tauri backend (async)
2. Backend returns new endpoints -> `setEndpoints()` updates store (sync)
3. App needs to test endpoints -> but React hasn't re-rendered with new endpoints yet

Zustand's `subscribeWithSelector` middleware with `fireImmediately` option provides the proper solution: subscribe to the specific state change (endpoints loaded) and trigger tests only when that condition is met.

**Primary recommendation:** Replace setTimeout workarounds with Promise-based `waitForEndpointsLoaded()` pattern using Zustand subscribe, then trigger tests synchronously once endpoints are confirmed in store.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.9 | State management | Already in use, subscribe API is built-in |
| zustand/middleware | 5.0.9 | subscribeWithSelector | Official middleware for selective subscriptions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | N/A | No additional libraries needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| subscribeWithSelector | Basic subscribe + selector in callback | Less type safety, more boilerplate |
| Promise-based wait | RxJS observables | Overkill, adds dependency for simple use case |
| Store-level coordination | React useEffect dependencies | Stale closure issues, timing-dependent |

**Decision:** Use Zustand's built-in subscribe API without additional middleware. The current store already has subscribe capabilities; `subscribeWithSelector` adds convenience but is not strictly required since we can check state in the callback.

## Architecture Patterns

### Recommended Pattern: Promise-based State Wait

**What:** Wrap Zustand subscribe in a Promise that resolves when a condition is met
**When to use:** When async action needs to wait for specific state before continuing

```typescript
// Source: Zustand discussions, verified pattern
const waitForState = <T>(
  selector: (state: AppState) => T,
  predicate: (value: T) => boolean
): Promise<T> => {
  return new Promise((resolve) => {
    // Check current state first
    const currentValue = selector(useAppStore.getState());
    if (predicate(currentValue)) {
      resolve(currentValue);
      return;
    }

    // Subscribe and wait for condition
    const unsub = useAppStore.subscribe((state) => {
      const value = selector(state);
      if (predicate(value)) {
        unsub();
        resolve(value);
      }
    });
  });
};

// Usage: wait for endpoints to be loaded
await waitForState(
  (state) => state.endpoints,
  (endpoints) => endpoints.length > 1  // More than fallback endpoint
);
```

### Pattern 2: Atomic Mode Switch Action

**What:** Combine mode switch and test trigger into a single coordinated action
**When to use:** When multiple state changes need to happen in sequence

```typescript
// In a store action or hook
const switchModeAndTest = async (mode: 'sessionhost' | 'enduser') => {
  // 1. Load settings from backend (updates store synchronously)
  const success = await loadSettingsForMode(mode);
  if (!success) return;

  // 2. Wait for endpoints to be in store
  await waitForState(
    (state) => state.endpoints,
    (endpoints) => endpoints.length > 1
  );

  // 3. Now safe to run tests - endpoints are guaranteed loaded
  runAllTests();
};
```

### Pattern 3: Endpoint-Ready Signal

**What:** Use a dedicated `endpointsReady` flag instead of checking endpoints.length
**When to use:** When you need explicit "load complete" signal separate from data

```typescript
// In store types
interface UiSlice {
  // ... existing
  endpointsReady: boolean;
  setEndpointsReady: (ready: boolean) => void;
}

// In setEndpoints action (endpointSlice)
setEndpoints: (endpoints) => {
  set({ endpoints, endpointsReady: false });  // Clear ready flag
  // ... after endpoints are set
  set({ endpointsReady: true });  // Signal ready
}

// In App.tsx - subscribe to ready signal
useEffect(() => {
  const unsub = useAppStore.subscribe(
    (state, prevState) => {
      if (state.endpointsReady && !prevState.endpointsReady) {
        runAllTests();
      }
    }
  );
  return () => unsub();
}, [runAllTests]);
```

### Anti-Patterns to Avoid

- **setTimeout for state sync:** Never use setTimeout to "wait" for React/Zustand updates
- **useEffect dependency arrays for async coordination:** React batching can cause stale closures
- **Polling state in intervals:** Wasteful and still racy
- **Checking state.endpoints.length > 0 without additional signal:** May match during loading

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Waiting for state condition | Polling with setInterval | Zustand subscribe + Promise | Polling is wasteful, subscribe is reactive |
| Detecting state change | useEffect with many dependencies | Zustand subscribe outside React | subscribe fires synchronously on state change |
| Cross-cutting state coordination | Multiple useState/useEffect | Store-level actions with get() | Avoids stale closure issues |
| Async action sequencing | Nested async/await with delays | Promise.resolve chain with state waits | Clear, predictable execution |

**Key insight:** Zustand's subscribe fires synchronously on every state change. This makes it ideal for detecting when a specific condition becomes true, unlike React's batched/async rendering.

## Common Pitfalls

### Pitfall 1: Stale Closure in useCallback

**What goes wrong:** Callback references old `endpoints` array after mode switch
**Why it happens:** useCallback captures state at creation time; mode switch updates store but callback still sees old value
**How to avoid:** Always use `useAppStore.getState().endpoints` inside callbacks, never the destructured value
**Warning signs:** Tests run against wrong endpoints after mode switch

```typescript
// BAD - stale closure
const runTests = useCallback(async () => {
  const enabledEndpoints = endpoints.filter((e) => e.enabled); // OLD endpoints!
  // ...
}, [endpoints]); // Even with dependency, timing issues

// GOOD - fresh state
const runTests = useCallback(async () => {
  const currentEndpoints = useAppStore.getState().endpoints;
  const enabledEndpoints = currentEndpoints.filter((e) => e.enabled);
  // ...
}, []); // No dependencies needed, always fresh
```

### Pitfall 2: React Batching Defeats useEffect

**What goes wrong:** Multiple state updates batch, useEffect fires once with final state
**Why it happens:** React 18+ batches state updates in async functions
**How to avoid:** Use Zustand subscribe for immediate state change detection
**Warning signs:** Expected intermediate states never trigger effects

### Pitfall 3: Subscribe Callback Runs Before Setup

**What goes wrong:** `fireImmediately: true` callback runs before `unsub` is defined
**Why it happens:** Callback executes synchronously during subscribe call
**How to avoid:** Check state first, only subscribe if condition not yet met
**Warning signs:** "Cannot read property of undefined" on unsub()

```typescript
// BAD - unsub undefined on immediate fire
const unsub = store.subscribe(callback, { fireImmediately: true });
// callback may call unsub() before this line executes

// GOOD - check first, then subscribe
const currentValue = selector(store.getState());
if (predicate(currentValue)) {
  resolve(currentValue);
  return; // Don't subscribe at all
}
const unsub = store.subscribe(callback);
```

### Pitfall 4: Memory Leak from Uncleared Subscriptions

**What goes wrong:** Subscriptions accumulate, callbacks fire on stale components
**Why it happens:** Promise-based waits that resolve don't unsubscribe on component unmount
**How to avoid:** Store unsub reference, call on cleanup; use AbortController for cancellation
**Warning signs:** Console errors about updates to unmounted components

### Pitfall 5: Zustand set() is Synchronous but Renders are Not

**What goes wrong:** Assuming React has re-rendered immediately after store.setState()
**Why it happens:** Zustand updates store sync, but React schedules re-render
**How to avoid:** Use subscribe for state-dependent logic, not useEffect
**Warning signs:** Component shows stale data briefly after state change

## Code Examples

Verified patterns from Zustand documentation and codebase analysis:

### Complete Mode Switch Without setTimeout

```typescript
// In SettingsPanel.tsx
const handleModeChange = async (mode: AppMode) => {
  // 1. Load new endpoints from backend
  const success = await loadSettingsForMode(mode);
  if (!success) return;

  // 2. Wait for endpoints to be loaded (replaces setTimeout)
  await new Promise<void>((resolve) => {
    // Check if already loaded
    const current = useAppStore.getState().endpoints;
    if (current.length > 1) {
      resolve();
      return;
    }
    // Subscribe and wait
    const unsub = useAppStore.subscribe((state) => {
      if (state.endpoints.length > 1) {
        unsub();
        resolve();
      }
    });
  });

  // 3. Now safe to trigger tests
  triggerTestNow();
};
```

### Refactored Test Trigger Subscription

```typescript
// In App.tsx - replace existing subscribe effect
useEffect(() => {
  const unsubscribe = useAppStore.subscribe(
    (state, prevState) => {
      // Check if pendingTestTrigger changed from false to true
      if (state.pendingTestTrigger && !prevState.pendingTestTrigger) {
        // Clear the trigger immediately
        useAppStore.getState().clearTestTrigger();

        // NO setTimeout needed - endpoints are already in store
        // because triggerTestNow() is only called after waitForEndpoints
        runAllTests();
      }
    }
  );
  return () => unsubscribe();
}, [runAllTests]);
```

### Reusable Wait Utility

```typescript
// src/lib/stateUtils.ts
import { useAppStore } from '../store/useAppStore';
import type { AppState } from '../store/types';

/**
 * Wait for a specific state condition to become true.
 * Resolves immediately if condition is already met.
 */
export const waitForState = <T>(
  selector: (state: AppState) => T,
  predicate: (value: T) => boolean,
  timeoutMs = 5000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    // Check current state first
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

// Convenience: wait for endpoints to be loaded
export const waitForEndpointsLoaded = () =>
  waitForState(
    (state) => state.endpoints,
    (endpoints) => endpoints.length > 1
  );
```

### Test for State Sequencing

```typescript
// src/store/useAppStore.test.ts - new test
it('should support subscribe-based state waiting', async () => {
  const { setEndpoints } = useAppStore.getState();

  // Start waiting for endpoints
  const waitPromise = waitForEndpointsLoaded();

  // Simulate async endpoint load (like from Tauri)
  setTimeout(() => {
    setEndpoints([
      { id: '1', name: 'Test 1', url: 'test1.com', port: 443, protocol: 'tcp', category: 'Test', enabled: true },
      { id: '2', name: 'Test 2', url: 'test2.com', port: 443, protocol: 'tcp', category: 'Test', enabled: true },
    ]);
  }, 10);

  // Wait should resolve once endpoints are set
  const endpoints = await waitPromise;
  expect(endpoints.length).toBe(2);
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setTimeout for state sync | Promise-based subscribe wait | Zustand 4.x+ | Deterministic, no arbitrary delays |
| useEffect for state reactions | Zustand subscribe | Always recommended | Avoids React batching issues |
| Polling for condition | Subscribe with predicate | Always | Reactive, efficient |
| Manual request deduplication | Ref-based guards (current) | N/A | Already implemented correctly |

**Deprecated/outdated:**
- Using `subscribeWithSelector` for simple cases - plain subscribe with callback check is sufficient
- setTimeout/setInterval for state coordination - always a code smell in Zustand

## Open Questions

Things that couldn't be fully resolved:

1. **Initial test trigger timing**
   - What we know: `hasRunInitialTest.current` guards against double-run on startup
   - What's unclear: Whether initial test should also use subscribe pattern vs current useEffect
   - Recommendation: Keep current approach for initial test; it works and is simpler

2. **AbortController for cancelled mode switches**
   - What we know: User could click mode switch twice quickly
   - What's unclear: Whether to cancel in-flight waitForState on new switch
   - Recommendation: Implement timeout only; rapid switching is edge case, tests deduplicate via refs

## Sources

### Primary (HIGH confidence)
- [Zustand subscribeWithSelector docs](https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector) - Middleware documentation
- [Zustand GitHub discussions #2034](https://github.com/pmndrs/zustand/discussions/2034) - Race conditions discussion
- [Zustand GitHub discussions #1892](https://github.com/pmndrs/zustand/discussions/1892) - Combining persist and subscribeWithSelector
- Current codebase analysis - `src/App.tsx`, `src/components/SettingsPanel.tsx`, `src/hooks/useSettingsSync.ts`

### Secondary (MEDIUM confidence)
- [Zustand GitHub discussions #844](https://github.com/pmndrs/zustand/discussions/844) - Subscribe within actions pattern
- [React 18 automatic batching](https://github.com/reactwg/react-18/discussions/21) - Batching behavior context

### Tertiary (LOW confidence)
- N/A - all critical patterns verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Zustand, no new dependencies
- Architecture patterns: HIGH - Verified against Zustand docs and GitHub discussions
- Pitfalls: HIGH - Analyzed from current codebase race conditions
- Code examples: HIGH - Derived from codebase and official patterns

**Research date:** 2026-01-16
**Valid until:** 90 days (stable patterns, Zustand 5.x is mature)
