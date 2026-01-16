---
phase: 8-features
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/store/slices/uiSlice.ts
  - src/store/types.ts
  - src/hooks/useOfflineDetection.ts
  - src/components/OfflineBanner.tsx
  - src/components/Dashboard.tsx
autonomous: true

must_haves:
  truths:
    - "App shows meaningful state when offline"
    - "Offline banner appears when network is unavailable"
    - "Banner shows last connected time"
    - "App recovers automatically when network returns"
  artifacts:
    - path: "src/store/slices/uiSlice.ts"
      provides: "isOffline and lastOnlineTimestamp state"
      contains: "isOffline"
    - path: "src/hooks/useOfflineDetection.ts"
      provides: "Hook for offline detection"
      exports: ["useOfflineDetection"]
      min_lines: 30
    - path: "src/components/OfflineBanner.tsx"
      provides: "Visual offline indicator"
      min_lines: 20
  key_links:
    - from: "src/hooks/useOfflineDetection.ts"
      to: "uiSlice.ts"
      via: "setOffline action call"
      pattern: "setOffline"
    - from: "src/components/OfflineBanner.tsx"
      to: "useAppStore"
      via: "isOffline selector"
      pattern: "isOffline"
    - from: "src/components/Dashboard.tsx"
      to: "OfflineBanner.tsx"
      via: "component import and render"
      pattern: "OfflineBanner"
---

<objective>
Implement offline resilience with meaningful UI state (FEAT-04).

Purpose: When network is unavailable, show users a clear indicator rather than just errors, helping them understand why endpoints are failing and when connectivity was last available.

Output: Offline banner component that appears when network is down, showing last connected time.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/8-features/8-RESEARCH.md

@src/store/slices/uiSlice.ts
@src/store/types.ts
@src/components/Dashboard.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Extend UI slice with offline state</name>
  <files>src/store/slices/uiSlice.ts, src/store/types.ts</files>
  <action>
Update `src/store/types.ts` - extend UiSlice interface:
```typescript
export interface UiSlice {
  // ... existing fields
  isOffline: boolean;
  lastOnlineTimestamp: number | null;

  // ... existing methods
  setOffline: (isOffline: boolean) => void;
}
```

Update `src/store/slices/uiSlice.ts`:
1. Add initial state:
   - `isOffline: false`
   - `lastOnlineTimestamp: null`

2. Add setOffline action:
```typescript
setOffline: (isOffline) =>
  set((state) => ({
    isOffline,
    // Update lastOnlineTimestamp when going from offline to online
    lastOnlineTimestamp: !isOffline ? Date.now() : state.lastOnlineTimestamp,
  })),
```

Note: lastOnlineTimestamp is updated when we come BACK online, so we always know the most recent successful connection time.
  </action>
  <verify>
`pnpm exec tsc --noEmit` passes without type errors.
  </verify>
  <done>
UI slice extended with isOffline state and setOffline action.
  </done>
</task>

<task type="auto">
  <name>Task 2: Create offline detection hook</name>
  <files>src/hooks/useOfflineDetection.ts</files>
  <action>
Create `src/hooks/useOfflineDetection.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

const OFFLINE_THRESHOLD = 3; // Mark offline after 3 consecutive failures

/**
 * Hook to detect and track offline state
 * Uses navigator.onLine + online/offline events as baseline,
 * but also tracks consecutive test failures for more accurate detection
 */
export function useOfflineDetection() {
  const setOffline = useAppStore((s) => s.setOffline);
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    const handleOnline = () => {
      consecutiveFailures.current = 0;
      setOffline(false);
    };

    const handleOffline = () => {
      setOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      setOffline(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOffline]);

  // Functions to report test results - can be used by latency service
  const reportSuccess = useCallback(() => {
    consecutiveFailures.current = 0;
    setOffline(false);
  }, [setOffline]);

  const reportFailure = useCallback(() => {
    consecutiveFailures.current++;
    if (consecutiveFailures.current >= OFFLINE_THRESHOLD) {
      setOffline(true);
    }
  }, [setOffline]);

  return { reportSuccess, reportFailure };
}
```

This hook:
- Listens to browser online/offline events
- Provides reportSuccess/reportFailure callbacks for latency tests
- Only marks offline after OFFLINE_THRESHOLD consecutive failures (avoids false positives)
- Immediately marks online when any test succeeds or browser reports online
  </action>
  <verify>
`pnpm exec tsc --noEmit` passes without type errors.
  </verify>
  <done>
Offline detection hook created with browser events and failure tracking.
  </done>
</task>

<task type="auto">
  <name>Task 3: Create OfflineBanner component and integrate</name>
  <files>src/components/OfflineBanner.tsx, src/components/Dashboard.tsx</files>
  <action>
Create `src/components/OfflineBanner.tsx`:

```typescript
import { WifiOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline);
  const lastOnline = useAppStore((s) => s.lastOnlineTimestamp);

  if (!isOffline) return null;

  const formatLastOnline = () => {
    if (!lastOnline) return null;
    return new Date(lastOnline).toLocaleTimeString();
  };

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4 flex items-center gap-3">
      <WifiOff className="w-5 h-5 text-yellow-500 flex-shrink-0" />
      <div className="text-sm text-yellow-700 dark:text-yellow-300">
        <span className="font-medium">You appear to be offline.</span>
        {lastOnline && (
          <span className="ml-1">
            Last connected: {formatLastOnline()}
          </span>
        )}
        <span className="ml-1 text-yellow-600 dark:text-yellow-400">
          Monitoring will resume when connection is restored.
        </span>
      </div>
    </div>
  );
}
```

Update `src/components/Dashboard.tsx`:
1. Import OfflineBanner: `import { OfflineBanner } from './OfflineBanner';`
2. Import useOfflineDetection: `import { useOfflineDetection } from '../hooks/useOfflineDetection';`
3. Call the hook at component top level: `useOfflineDetection();`
4. Render OfflineBanner at the top of the dashboard content (after the header, before endpoint cards):
   ```tsx
   <OfflineBanner />
   ```

The hook is called in Dashboard so it runs when the app is open. The banner conditionally renders based on isOffline state.
  </action>
  <verify>
`pnpm tauri dev` - Disconnect network (disable WiFi/Ethernet), offline banner appears. Reconnect, banner disappears.
  </verify>
  <done>
Offline banner component created and integrated into Dashboard.
  </done>
</task>

</tasks>

<verification>
1. `pnpm exec tsc --noEmit` - TypeScript compiles
2. `pnpm tauri dev` - App runs
3. Disable network (airplane mode, disable adapter, disconnect WiFi)
4. Offline banner appears with yellow styling and WifiOff icon
5. Enable network
6. Banner disappears automatically
7. Banner shows "Last connected: [time]" after reconnecting then disconnecting again
</verification>

<success_criteria>
- Offline banner appears when network is unavailable
- Banner includes WifiOff icon, "You appear to be offline" message
- Banner shows last connected time (if available)
- Banner auto-hides when network returns
- No console errors during offline/online transitions
- Existing monitoring continues to work normally when online
</success_criteria>

<output>
After completion, create `.planning/phases/8-features/8-03-SUMMARY.md`
</output>
