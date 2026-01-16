# Phase 3: State Refactor - Research

**Researched:** 2026-01-16
**Domain:** Zustand state management, store slicing patterns
**Confidence:** HIGH

## Summary

This phase splits the monolithic `useAppStore` into domain-specific slices while preserving the existing persist middleware behavior. The current store at ~720 lines contains config, endpoint, fslogix, and UI state mixed together with complex persistence logic.

Zustand's official slices pattern enables modular store composition through the `StateCreator` type and spread-operator merging. The key architectural decision is: **apply middleware (persist) at the combined store level, not individual slices**. This is explicitly stated in Zustand documentation as a requirement - applying middleware in individual slices leads to unexpected issues.

**Primary recommendation:** Create four slice files (`configSlice.ts`, `endpointSlice.ts`, `fslogixSlice.ts`, `uiSlice.ts`) plus a persistence module (`persistence.ts`), then combine them in a refactored `useAppStore.ts` with persist middleware applied at the root level.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.9 | State management | Already in use, slices pattern is built-in |
| zustand/middleware | 5.0.9 | persist, devtools | Already using persist middleware |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand-slices | N/A | Type-safe slice composition | Optional - only if manual typing becomes too complex |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single combined store | Multiple separate stores | Separate stores = more scoped subscriptions, but no cross-slice coordination without context |
| Manual slicing | zustand-slices library | Library adds dependency but simplifies TypeScript typing |

**Decision:** Use manual slicing pattern (no new dependencies). Zustand 5.x typing is mature enough, and keeping zero additional dependencies is valuable.

## Architecture Patterns

### Recommended Project Structure
```
src/store/
├── useAppStore.ts           # Combined store with persist
├── slices/
│   ├── configSlice.ts       # AppConfig state and actions
│   ├── endpointSlice.ts     # Endpoint state, statuses, actions
│   ├── fslogixSlice.ts      # FSLogix paths, statuses, actions
│   └── uiSlice.ts           # View state, monitoring flags
└── persistence/
    └── index.ts             # Persistence helpers, serialization, migration
```

### Pattern 1: StateCreator Slice Definition
**What:** Each slice is a function receiving `(set, get, store)` returning state + actions
**When to use:** Always - this is the canonical Zustand slice pattern

```typescript
// Source: https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md
import { StateCreator } from 'zustand';

// Define slice interface
interface ConfigSlice {
  config: AppConfig;
  setConfig: (config: Partial<AppConfig>) => void;
}

// Slice creator - note the combined state type
export const createConfigSlice: StateCreator<
  AppState, // Full combined state type
  [],       // No middleware at slice level
  [],       // No additional mutators
  ConfigSlice // This slice's return type
> = (set, get) => ({
  config: DEFAULT_CONFIG,
  setConfig: (updates) => {
    set((state) => ({ config: { ...state.config, ...updates } }));
    // Can access other slices via get()
    const { customEndpoints } = get();
    saveSettingsToFile(get().config, customEndpoints);
  },
});
```

### Pattern 2: Combining Slices with Persist
**What:** Merge slices at store creation, apply persist middleware once
**When to use:** When combining slices into final store

```typescript
// Source: https://zustand.docs.pmnd.rs/guides/slices-pattern
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAppStore = create<AppState>()(
  persist(
    (...args) => ({
      ...createConfigSlice(...args),
      ...createEndpointSlice(...args),
      ...createFslogixSlice(...args),
      ...createUiSlice(...args),
    }),
    {
      name: 'avd-health-monitor-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: state.config,
        customEndpoints: state.customEndpoints,
        historyData: serializeHistory(state.endpointStatuses),
      }),
      merge: customMerge,
      version: 10, // Increment from current v9
      migrate: handleMigration,
    }
  )
);
```

### Pattern 3: Cross-Slice Access
**What:** Slices can read/update other slices via `get()` and `set()`
**When to use:** When an action needs to coordinate across domains

```typescript
// In endpointSlice.ts
updateEndpointEnabled: (id, enabled) => {
  const state = get();
  const isCustom = state.customEndpoints.some((ep) => ep.id === id);

  set((state) => {
    // Update endpoints
    const endpoints = state.endpoints.map((ep) =>
      ep.id === id ? { ...ep, enabled } : ep
    );
    // Update statuses (cross-domain)
    const newStatuses = new Map(state.endpointStatuses);
    // ... update logic
    return { endpoints, endpointStatuses: newStatuses };
  });

  // Trigger persistence (uses get() to access other slices)
  if (isCustom) {
    saveSettingsToFile(get().config, get().customEndpoints);
  }
},
```

### Anti-Patterns to Avoid
- **Middleware in slices:** Never apply `persist` or `devtools` inside individual slice creators
- **Nested namespaces:** Zustand flattens to root level; don't try to nest like `state.config.endpoints`
- **Stale closure in callbacks:** Always use `get()` inside callbacks for fresh state after mode switches
- **Separate persist configs per slice:** Persist must be applied once at root with single partialize function

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Type inference for slices | Manual typing each field | StateCreator<Combined, [], [], Slice> | Zustand's typing handles cross-slice access |
| Persistence serialization | Custom JSON logic | persist middleware's partialize + merge | Handles hydration, versioning, migration |
| Version migration | Manual localStorage parsing | persist middleware's version + migrate | Automatic version detection and migration |
| Map serialization | Inline JSON conversion | Dedicated serializeHistory/deserializeHistory | Already exists, keep isolated in persistence module |

**Key insight:** The existing codebase already has working persistence logic with Map serialization, history cleanup, and migration. The refactor should isolate this logic, not rewrite it.

## Common Pitfalls

### Pitfall 1: Applying Middleware Per-Slice
**What goes wrong:** Type errors, unexpected behavior, middleware runs multiple times
**Why it happens:** Documentation examples show middleware on create(), easy to assume it goes on slices
**How to avoid:** Only apply persist/devtools in the final `create()` call that combines all slices
**Warning signs:** TypeScript errors about `$$storeMutators`, middleware effects happening multiple times

### Pitfall 2: Hydration Breaking Actions
**What goes wrong:** Actions like `setConfig` become undefined after page reload
**Why it happens:** JSON.stringify only persists primitives, functions are lost during hydration
**How to avoid:** Use `merge` option to restore actions from current state during hydration
**Warning signs:** "Cannot call undefined" errors after reload, actions missing from state

### Pitfall 3: Stale Closures After Mode Switch
**What goes wrong:** Actions operate on old endpoint list after switching session host / end user mode
**Why it happens:** React useCallback/useEffect closures capture state at creation time
**How to avoid:** Use `get()` inside action callbacks to get fresh state; existing code already does this correctly
**Warning signs:** Wrong endpoints being tested after mode switch

### Pitfall 4: Breaking Existing localStorage Data
**What goes wrong:** Users lose their config/history after update
**Why it happens:** Changing persist key name, changing state structure without migration
**How to avoid:** Keep storage key `avd-health-monitor-state`, increment version to 10, write migration from v9
**Warning signs:** Config resets to defaults after update, history data lost

### Pitfall 5: TypeScript StateCreator Complexity
**What goes wrong:** Complex type errors when combining slices with middleware
**Why it happens:** StateCreator has 4 type parameters, easy to get wrong order
**How to avoid:** Follow exact pattern: `StateCreator<CombinedState, [], [], ThisSlice>`
**Warning signs:** Generic constraint errors, missing properties on store

## Code Examples

Verified patterns from current codebase and official sources:

### Slice Interface Definition
```typescript
// Source: Current useAppStore.ts + Zustand docs
interface ConfigSlice {
  config: AppConfig;
  setConfig: (config: Partial<AppConfig>) => void;
}

interface EndpointSlice {
  endpoints: Endpoint[];
  customEndpoints: CustomEndpoint[];
  modeInfo: ModeInfo | null;
  endpointStatuses: Map<string, EndpointStatus>;
  setEndpoints: (endpoints: Endpoint[]) => void;
  setModeInfo: (modeInfo: ModeInfo) => void;
  updateEndpointEnabled: (id: string, enabled: boolean) => void;
  updateEndpointMuted: (id: string, muted: boolean) => void;
  updateModeEndpoint: (id: string, updates: { name?: string; url?: string; port?: number }) => void;
  addCustomEndpoint: (endpoint: Omit<CustomEndpoint, 'id'>) => void;
  updateCustomEndpoint: (id: string, updates: Partial<CustomEndpoint>) => void;
  removeCustomEndpoint: (id: string) => void;
  setCustomEndpoints: (endpoints: CustomEndpoint[]) => void;
  updateLatency: (endpointId: string, latency: number, success: boolean, error?: unknown) => void;
  setEndpointLoading: (endpointId: string, isLoading: boolean) => void;
  setAllEndpointsLoading: (isLoading: boolean) => void;
  clearEndpointError: (endpointId: string) => void;
  getEndpointStatus: (endpointId: string) => EndpointStatus | undefined;
  restoreHistoryForEndpoints: (endpoints: Endpoint[]) => void;
}

interface FslogixSlice {
  fslogixPaths: FSLogixPath[];
  fslogixStatuses: Map<string, FSLogixStatus>;
  setFSLogixPaths: (paths: FSLogixPath[]) => void;
  updateFSLogixStatus: (pathId: string, reachable: boolean, latency: number | null, error: string | null) => void;
  setFSLogixLoading: (pathId: string, isLoading: boolean) => void;
  setAllFSLogixLoading: (isLoading: boolean) => void;
  updateFSLogixPathMuted: (pathId: string, muted: boolean) => void;
}

interface UiSlice {
  currentView: 'dashboard' | 'settings';
  isMonitoring: boolean;
  isPaused: boolean;
  pendingTestTrigger: boolean;
  setCurrentView: (view: 'dashboard' | 'settings') => void;
  setMonitoring: (isMonitoring: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  triggerTestNow: () => void;
  clearTestTrigger: () => void;
}

// Combined state type
type AppState = ConfigSlice & EndpointSlice & FslogixSlice & UiSlice;
```

### Persistence Module Pattern
```typescript
// Source: Current useAppStore.ts
// persistence/index.ts

// Storage key - DO NOT CHANGE to preserve user data
export const STORAGE_KEY = 'avd-health-monitor-state';

// History retention (24 hours)
const HISTORY_RETENTION_MS = 24 * 60 * 60 * 1000;

export interface SerializedHistory {
  [endpointId: string]: {
    history: Array<{ timestamp: number; latency: number }>;
    lastUpdated: number | null;
  };
}

export interface PersistedState {
  config: AppConfig;
  customEndpoints: CustomEndpoint[];
  historyData?: SerializedHistory;
}

export const cleanupOldHistory = (
  history: Array<{ timestamp: number; latency: number }>
): Array<{ timestamp: number; latency: number }> => {
  const cutoff = Date.now() - HISTORY_RETENTION_MS;
  return history.filter((h) => h.timestamp > cutoff);
};

export const serializeHistory = (statuses: Map<string, EndpointStatus>): SerializedHistory => {
  const result: SerializedHistory = {};
  statuses.forEach((status, endpointId) => {
    result[endpointId] = {
      history: cleanupOldHistory(status.history),
      lastUpdated: status.lastUpdated,
    };
  });
  return result;
};

export const deserializeHistory = (
  historyData: SerializedHistory | undefined,
  endpoints: Endpoint[]
): Map<string, EndpointStatus> => {
  // ... existing logic
};

// Migration function
export const handleMigration = (persistedState: unknown, version: number): PersistedState => {
  const state = persistedState as PersistedState;
  if (version < 10) {
    // Migration from v9 to v10 (slice refactor)
    // State structure is compatible, no data migration needed
    return {
      config: { ...DEFAULT_CONFIG, ...(state.config || {}) },
      customEndpoints: state.customEndpoints || [],
      historyData: state.historyData || {},
    };
  }
  return state;
};
```

### File Write Helper Pattern
```typescript
// Extracted helper that slices can import
// persistence/index.ts or utils
export const saveSettingsToFile = async (
  config: AppConfig,
  customEndpoints: CustomEndpoint[]
): Promise<void> => {
  try {
    const settings = { version: 1, config, customEndpoints };
    await invoke('write_settings_file', { settings });
  } catch (error) {
    console.error('[persistence] Failed to save settings to JSON:', error);
  }
};

export const updateEndpointInFile = async (
  mode: string,
  endpointId: string,
  updates: { enabled?: boolean; muted?: boolean; name?: string; url?: string; port?: number }
): Promise<void> => {
  try {
    await invoke('update_endpoint', { mode, endpointId, ...updates });
  } catch (error) {
    console.error('[persistence] Failed to update endpoint in file:', error);
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single monolithic store file | Sliced stores with combined root | Zustand 3.x+ | Better maintainability for large stores |
| Middleware per slice | Middleware at root only | Always (documented) | Prevents type errors and double execution |
| Manual localStorage | persist middleware | Zustand 3.x+ | Built-in versioning, migration, hydration |

**Deprecated/outdated:**
- `create<T>()` without curried form when using middleware - use `create<T>()(...)` instead
- Applying `StateCreator` middleware types in slice definitions - let root `create` handle it

## Open Questions

Things that couldn't be fully resolved:

1. **Devtools middleware**
   - What we know: devtools can be added at root level with persist
   - What's unclear: Whether to add it in this phase or defer
   - Recommendation: Defer devtools to separate enhancement task; focus on slice structure

2. **Testing strategy for slices**
   - What we know: Current tests use `useAppStore.setState()` and `useAppStore.getState()`
   - What's unclear: Whether to test slices independently or only through combined store
   - Recommendation: Keep testing through combined store to verify integration; slice-level tests optional

## Sources

### Primary (HIGH confidence)
- [Zustand Slices Pattern Documentation](https://zustand.docs.pmnd.rs/guides/slices-pattern) - Core pattern reference
- [Zustand GitHub Slices Pattern](https://github.com/pmndrs/zustand/blob/main/docs/guides/slices-pattern.md) - Code examples
- Current `src/store/useAppStore.ts` - Existing implementation to preserve

### Secondary (MEDIUM confidence)
- [GitHub Discussion #2027](https://github.com/pmndrs/zustand/discussions/2027) - Slicing with persist middleware
- [GitHub Discussion #2164](https://github.com/pmndrs/zustand/discussions/2164) - TypeScript type errors and solutions
- [GitHub Discussion #937](https://github.com/pmndrs/zustand/discussions/937) - Store modularization patterns
- [Zustand Local Storage Migration Guide](https://dev.to/diballesteros/how-to-migrate-zustand-local-storage-store-to-a-new-version-njp) - Version migration patterns

### Tertiary (LOW confidence)
- [zustand-slices library](https://github.com/zustandjs/zustand-slices) - Alternative approach (not recommended for this project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing Zustand, patterns are official documentation
- Architecture: HIGH - Patterns verified against multiple official sources
- Pitfalls: HIGH - Documented issues from GitHub discussions and official docs
- Migration: MEDIUM - Existing v9 migration tested, v10 is straightforward but untested

**Research date:** 2026-01-16
**Valid until:** 60 days (stable pattern, Zustand 5.x is mature)
