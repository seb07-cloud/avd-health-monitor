# Phase 7: Testing - Research

**Researched:** 2026-01-16
**Domain:** Frontend testing (Vitest + React Testing Library), Zustand store testing, Tauri command mocking
**Confidence:** HIGH

## Summary

Phase 7 requires implementing meaningful test coverage for critical paths in the AVD Health Monitor application. The project already has a solid Vitest testing foundation with existing tests for utils and the main Zustand store. The requirements specify testing settings roundtrip, mode switching, store slices, FSLogix path parsing, and tray icon state.

The existing test infrastructure uses Vitest 4.x with happy-dom, @testing-library/react 16.x, and a basic Tauri mock setup. The main gaps are: (1) no proper Zustand mock file for automatic state reset between tests, (2) Tauri mock needs expansion for settings commands, (3) individual slice tests don't exist, and (4) no integration tests for settings save/load roundtrip.

**Primary recommendation:** Add proper Zustand mock file at `src/__mocks__/zustand.ts`, expand Tauri mock to handle settings commands, create slice-specific unit tests, and add integration tests for settings and mode switching flows.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | ^4.0.16 | Test runner | Fast, Vite-native, ESM support |
| @testing-library/react | ^16.3.1 | React component testing | Standard for React testing |
| @testing-library/jest-dom | ^6.9.1 | DOM assertions | Standard matchers for DOM testing |
| happy-dom | ^20.0.11 | DOM environment | Faster than jsdom for Vitest |

### Tauri Testing (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @tauri-apps/api/mocks | ^2 | Mock Tauri IPC | All tests involving `invoke()` |

### Rust Testing (Built-in)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tempfile | 3.x | Temp file testing | Settings roundtrip tests in Rust |
| serde_json (test features) | 1.x | JSON test helpers | Serialization tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| happy-dom | jsdom | jsdom is slower but more complete DOM implementation |
| Manual Tauri mocks | @tauri-apps/api/mocks | Official mocks are cleaner and maintained |

**Installation (nothing new needed):**
```bash
# All required packages already installed
pnpm install
```

## Architecture Patterns

### Recommended Test File Structure
```
src/
├── __mocks__/
│   └── zustand.ts              # NEW: Zustand auto-reset mock
├── store/
│   ├── slices/
│   │   ├── configSlice.test.ts      # NEW: Config slice tests
│   │   ├── endpointSlice.test.ts    # NEW: Endpoint slice tests
│   │   ├── fslogixSlice.test.ts     # NEW: FSLogix slice tests
│   │   └── uiSlice.test.ts          # NEW: UI slice tests
│   └── persistence/
│       └── index.test.ts            # NEW: Persistence helpers tests
├── lib/
│   └── utils.test.ts           # EXISTS: Utility tests
├── errors.test.ts              # NEW: Error parsing tests
└── test/
    ├── setup.ts                # EXISTS: Test setup
    └── integration/
        ├── settingsRoundtrip.test.ts  # NEW: Settings integration
        └── modeSwitching.test.ts      # NEW: Mode switching integration

src-tauri/
├── src/
│   ├── settings.rs             # EXISTS: Has basic tests
│   ├── fslogix.rs              # EXISTS: Has path parsing tests
│   ├── tray_icon.rs            # EXISTS: Has icon generation tests
│   ├── path_safety.rs          # EXISTS: Has traversal tests
│   └── validation.rs           # EXISTS: Has schema tests
└── tests/
    └── settings_roundtrip.rs   # NEW: Integration test file
```

### Pattern 1: Zustand Store Testing Without Components

**What:** Test Zustand store actions directly using `getState()` and `setState()`
**When to use:** Unit testing store slices in isolation
**Example:**
```typescript
// Source: https://zustand.docs.pmnd.rs/guides/testing
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('configSlice', () => {
  beforeEach(() => {
    // Reset to initial state
    useAppStore.setState({
      config: {
        mode: 'sessionhost',
        testInterval: 10,
        // ... other defaults
      },
    });
  });

  it('should update config', () => {
    const { setConfig } = useAppStore.getState();
    setConfig({ testInterval: 20 });

    const state = useAppStore.getState();
    expect(state.config.testInterval).toBe(20);
  });
});
```

### Pattern 2: Tauri Command Mocking

**What:** Mock Tauri `invoke()` calls to test frontend without backend
**When to use:** Integration tests for settings loading, mode switching
**Example:**
```typescript
// Source: https://v2.tauri.app/develop/tests/mocking/
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/core';
import { afterEach, beforeEach, describe, it, expect } from 'vitest';

describe('settings integration', () => {
  beforeEach(() => {
    mockIPC((cmd, args) => {
      if (cmd === 'read_settings_with_endpoints') {
        return {
          version: 1,
          config: { mode: 'sessionhost', testInterval: 10 },
          endpoints: [],
          modeInfo: { name: 'Session Host Mode' },
        };
      }
      if (cmd === 'write_settings_file') {
        return undefined; // Success
      }
    });
  });

  afterEach(() => {
    clearMocks();
  });

  it('should load settings', async () => {
    const result = await invoke('read_settings_with_endpoints');
    expect(result.config.mode).toBe('sessionhost');
  });
});
```

### Pattern 3: Rust Integration Tests with tempfile

**What:** Test settings save/load roundtrip with temporary directories
**When to use:** Rust-side integration tests for file operations
**Example:**
```rust
// src-tauri/tests/settings_roundtrip.rs
use tempfile::tempdir;
use std::fs;

#[test]
fn test_settings_roundtrip() {
    let dir = tempdir().unwrap();
    let settings_path = dir.path().join("settings.json");

    let settings = SettingsFile::default();
    let content = serde_json::to_string_pretty(&settings).unwrap();
    fs::write(&settings_path, &content).unwrap();

    let loaded = fs::read_to_string(&settings_path).unwrap();
    let parsed: SettingsFile = serde_json::from_str(&loaded).unwrap();

    assert_eq!(parsed.config.mode, AppMode::SessionHost);
}
```

### Anti-Patterns to Avoid
- **Testing implementation details:** Test behavior, not internal state structure
- **Shared mutable state between tests:** Always reset store state in `beforeEach`
- **Not clearing mocks:** Always call `clearMocks()` in `afterEach` for Tauri tests
- **Testing async without waiting:** Use `await` or `waitFor` for async operations
- **Over-mocking:** Mock only what's necessary (Tauri commands, not Zustand internals)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Zustand state reset | Manual cleanup | `__mocks__/zustand.ts` pattern | Automatic reset, tracks all stores |
| Tauri IPC mocking | `window.__TAURI__` manipulation | `@tauri-apps/api/mocks` | Official, maintained, handles edge cases |
| DOM environment | Custom JSDOM setup | happy-dom via Vitest config | Already configured, faster |
| Async state assertions | setTimeout loops | `waitFor` from @testing-library | Handles timing properly |
| Temporary test files | Manual file cleanup | `tempfile` crate (Rust) | Auto-cleanup on drop |

**Key insight:** The testing ecosystem is mature. Use official mocking tools (Tauri mocks, Zustand mock pattern) rather than hand-rolling solutions that will break on updates.

## Common Pitfalls

### Pitfall 1: Zustand State Persisting Between Tests
**What goes wrong:** Tests pass individually but fail when run together because store state leaks
**Why it happens:** Zustand stores are singletons that persist across tests
**How to avoid:** Add proper `__mocks__/zustand.ts` file with automatic reset, OR manually reset state in `beforeEach`
**Warning signs:** Tests pass in isolation (`vitest test.ts`) but fail in suite (`vitest run`)

### Pitfall 2: Tauri Mocks Not Clearing
**What goes wrong:** Mock responses from one test affect another test
**Why it happens:** `mockIPC()` modifies globals that persist
**How to avoid:** Always call `clearMocks()` in `afterEach`
**Warning signs:** Test results depend on execution order

### Pitfall 3: Testing Async Operations Incorrectly
**What goes wrong:** Tests pass even when async operations fail
**Why it happens:** Not awaiting promises, not using `waitFor` for state changes
**How to avoid:** Always `await` invoke calls, use `waitFor` for store state assertions
**Warning signs:** Tests complete instantly despite async operations

### Pitfall 4: WebCrypto Not Available in Tests
**What goes wrong:** `crypto.randomUUID()` throws in tests
**Why it happens:** happy-dom doesn't include WebCrypto by default
**How to avoid:** Already handled in existing `src/test/setup.ts` - but ensure new tests don't bypass setup
**Warning signs:** "crypto is not defined" errors

### Pitfall 5: Vitest Mock Directory Location
**What goes wrong:** `vi.mock('zustand')` doesn't find the mock file
**Why it happens:** Vitest looks for `__mocks__` relative to test root, not project root
**How to avoid:** Place `__mocks__` directory at `src/__mocks__` since tests are in `src/`
**Warning signs:** "Cannot find module" errors despite mock file existing

## Code Examples

Verified patterns from official sources:

### Zustand Mock File (Required for Automatic State Reset)
```typescript
// src/__mocks__/zustand.ts
// Source: https://github.com/pmndrs/zustand/blob/main/docs/guides/testing.md
import { act } from '@testing-library/react';
import type * as ZustandExportedTypes from 'zustand';
export * from 'zustand';

const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandExportedTypes>('zustand');

export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

export const create = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  return typeof stateCreator === 'function'
    ? createUncurried(stateCreator)
    : createUncurried;
}) as typeof ZustandExportedTypes.create;

const createStoreUncurried = <T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  const store = actualCreateStore(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

export const createStore = (<T>(
  stateCreator: ZustandExportedTypes.StateCreator<T>,
) => {
  return typeof stateCreator === 'function'
    ? createStoreUncurried(stateCreator)
    : createStoreUncurried;
}) as typeof ZustandExportedTypes.createStore;

afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});
```

### Tauri Mock Setup for Settings Commands
```typescript
// In test file or shared setup
// Source: https://v2.tauri.app/develop/tests/mocking/
import { mockIPC, clearMocks } from '@tauri-apps/api/mocks';
import { afterEach, beforeEach } from 'vitest';

const mockSettingsResponse = {
  version: 1,
  config: {
    mode: 'sessionhost',
    testInterval: 10,
    retentionDays: 30,
    thresholds: { excellent: 30, good: 80, warning: 150 },
    notificationsEnabled: true,
    autoStart: true,
    theme: 'system',
    alertThreshold: 3,
    alertCooldown: 5,
    graphTimeRange: 1,
    fslogixEnabled: true,
    fslogixTestInterval: 60,
    fslogixAlertThreshold: 3,
    fslogixAlertCooldown: 5,
  },
  endpoints: [
    {
      id: 'azure-login',
      name: 'Azure AD Authentication',
      url: 'login.microsoftonline.com',
      enabled: true,
      port: 443,
      protocol: 'tcp',
    },
  ],
  modeInfo: {
    name: 'Session Host Mode',
    description: 'For AVD session host VMs',
  },
};

beforeEach(() => {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'read_settings_with_endpoints':
        return mockSettingsResponse;
      case 'read_settings_for_mode':
        return {
          ...mockSettingsResponse,
          config: { ...mockSettingsResponse.config, mode: args.mode },
        };
      case 'write_settings_file':
        return undefined;
      case 'update_endpoint':
        return undefined;
      default:
        console.warn(`Unmocked Tauri command: ${cmd}`);
        return undefined;
    }
  });
});

afterEach(() => {
  clearMocks();
});
```

### Slice Unit Test Template
```typescript
// src/store/slices/uiSlice.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';

describe('uiSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentView: 'dashboard',
      isMonitoring: false,
      isPaused: false,
      pendingTestTrigger: false,
    });
  });

  describe('setCurrentView', () => {
    it('should update current view', () => {
      const { setCurrentView } = useAppStore.getState();
      setCurrentView('settings');
      expect(useAppStore.getState().currentView).toBe('settings');
    });
  });

  describe('setMonitoring', () => {
    it('should update monitoring state', () => {
      const { setMonitoring } = useAppStore.getState();
      setMonitoring(true);
      expect(useAppStore.getState().isMonitoring).toBe(true);
    });
  });

  describe('triggerTestNow', () => {
    it('should set pending test trigger', () => {
      const { triggerTestNow } = useAppStore.getState();
      triggerTestNow();
      expect(useAppStore.getState().pendingTestTrigger).toBe(true);
    });
  });
});
```

### FSLogix Path Parsing Test (Rust)
```rust
// Already exists in src-tauri/src/fslogix.rs - verify coverage
#[test]
fn test_extract_hostname_azure_storage() {
    let path = r"\\mystorageaccount.file.core.windows.net\fslogix";
    assert_eq!(
        extract_hostname(path),
        Some("mystorageaccount.file.core.windows.net".to_string())
    );
}

#[test]
fn test_parse_vhd_locations_multiple() {
    let value = r"\\server1\share1;\\server2\share2;\\server3\share3";
    let result = parse_vhd_locations(value);
    assert_eq!(result.len(), 3);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jest.mock | vi.mock | Vitest 1.0+ | Same syntax, different import |
| renderHook from @testing-library/react-hooks | renderHook from @testing-library/react | RTL 13.1+ | Package consolidated |
| jsdom | happy-dom (preferred for speed) | Vitest 2.0 | ~3x faster test execution |

**Deprecated/outdated:**
- **@testing-library/react-hooks:** Merged into @testing-library/react
- **enzyme:** Replaced by Testing Library patterns

## Open Questions

Things that couldn't be fully resolved:

1. **Rust Integration Test Organization**
   - What we know: Can use `tests/` directory or inline `#[cfg(test)]` modules
   - What's unclear: Whether settings roundtrip needs actual file system or can use in-memory mocks
   - Recommendation: Use tempfile crate for true file system tests since settings.rs already interacts with filesystem

2. **Coverage Threshold**
   - What we know: Vitest has built-in coverage with v8 provider
   - What's unclear: What coverage percentage target is appropriate
   - Recommendation: Start without thresholds, add after baseline established

3. **CI Test Parallelism**
   - What we know: Vitest runs tests in parallel by default
   - What's unclear: Whether store tests with shared state need isolation
   - Recommendation: The Zustand mock file handles state reset; keep parallel execution

## Sources

### Primary (HIGH confidence)
- [Zustand Testing Guide](https://zustand.docs.pmnd.rs/guides/testing) - Complete Vitest mock pattern
- [Tauri Mock API v2](https://v2.tauri.app/develop/tests/mocking/) - mockIPC, clearMocks usage
- [Zustand GitHub testing.md](https://github.com/pmndrs/zustand/blob/main/docs/guides/testing.md) - Mock file code

### Secondary (MEDIUM confidence)
- [Vitest Mocking Guide](https://v2.vitest.dev/guide/mocking) - vi.mock patterns
- [tempfile crate](https://github.com/Stebalien/tempfile) - Rust temp file testing

### Tertiary (LOW confidence)
- WebSearch results for Vitest + Zustand patterns - confirms mock file approach is standard

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using already-installed, well-documented tools
- Architecture: HIGH - Following official Zustand and Tauri testing patterns
- Pitfalls: HIGH - Common issues documented in official repos and discussions

**Research date:** 2026-01-16
**Valid until:** 2026-04-16 (libraries are stable, patterns unlikely to change)
