# Testing Patterns

**Analysis Date:** 2026-01-16

## Test Framework

**Frontend Runner:**
- Vitest 4.x
- Config: `vite.config.ts` (test section)

**Backend Runner:**
- Cargo test (built-in Rust testing)
- Config: None required (standard Cargo)

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`)
- `@testing-library/jest-dom` matchers for DOM assertions

**Run Commands:**
```bash
pnpm test              # Run tests in watch mode
pnpm test:run          # Run all tests once
pnpm test:ui           # Run with Vitest UI
pnpm test:coverage     # Run with coverage report

cd src-tauri && cargo test  # Run Rust tests
```

## Test File Organization

**Location:**
- Frontend: Co-located with source files (e.g., `src/lib/utils.test.ts` next to `src/lib/utils.ts`)
- Backend: Inline in source files using `#[cfg(test)]` module

**Naming:**
- Frontend: `{filename}.test.ts` (e.g., `utils.test.ts`, `useAppStore.test.ts`)
- Backend: Inline `mod tests` at bottom of source file

**Structure:**
```
src/
├── lib/
│   ├── utils.ts
│   └── utils.test.ts       # Co-located test
├── store/
│   ├── useAppStore.ts
│   └── useAppStore.test.ts # Co-located test
└── test/
    └── setup.ts            # Global test setup

src-tauri/src/
├── latency.rs              # Contains #[cfg(test)] mod tests
└── settings.rs             # Contains #[cfg(test)] mod tests
```

## Test Structure

**Frontend Suite Organization:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { functionUnderTest } from './module';

describe('functionUnderTest', () => {
  // Optional setup
  beforeEach(() => {
    // Reset state or mocks
  });

  it('should handle success case', () => {
    expect(functionUnderTest(input)).toBe(expectedOutput);
  });

  it('should handle edge case', () => {
    expect(functionUnderTest(null)).toBe('N/A');
  });
});
```

**Nested Describe Blocks:**
```typescript
describe('utils', () => {
  describe('getLatencyStatus', () => {
    const thresholds = { excellent: 30, good: 80, warning: 150 };

    it('should return excellent for low latency', () => {
      expect(getLatencyStatus(20, thresholds)).toBe('excellent');
    });

    it('should return critical for very high latency', () => {
      expect(getLatencyStatus(200, thresholds)).toBe('critical');
    });
  });

  describe('formatLatency', () => {
    it('should format latency with one decimal place', () => {
      expect(formatLatency(45.678)).toBe('45.7ms');
    });
  });
});
```

**Backend Test Organization (Rust):**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = SettingsFile::default();
        assert_eq!(settings.version, 1);
        assert_eq!(settings.config.mode, AppMode::SessionHost);
    }

    #[tokio::test]
    async fn test_tcp_connection_success() {
        let result = test_tcp_latency("www.google.com", 443).await;
        assert!(result.is_ok());
        let latency = result.unwrap();
        assert!(latency > 0.0);
    }
}
```

## Mocking

**Framework:** Vitest built-in mocking + manual mocks in setup

**Global Mock Setup (`src/test/setup.ts`):**
```typescript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorageMock.clear();
});

// Mock Tauri API
(globalThis as any).window = (globalThis as any).window || {};
(globalThis as any).window.__TAURI__ = {
  invoke: async () => Promise.resolve(),
  event: {
    listen: () => Promise.resolve(() => {}),
    emit: () => Promise.resolve(),
  },
};
```

**What to Mock:**
- Tauri `invoke` calls (mocked globally)
- Tauri event listeners (mocked globally)
- localStorage (mocked globally)
- Browser APIs not available in test environment

**What NOT to Mock:**
- Pure functions (test directly)
- Zustand store (use `useAppStore.setState()` to set test state)
- React components (use React Testing Library)

## Fixtures and Factories

**Test Data:**
```typescript
// Inline test data for simple cases
const thresholds = {
  excellent: 30,
  good: 80,
  warning: 150,
};

// For store tests, use setState to set initial state
beforeEach(() => {
  useAppStore.setState({
    endpointStatuses: new Map(),
    isMonitoring: false,
    isPaused: false,
    customEndpoints: [],
  });
});

// Create test objects inline
const newEndpoint = {
  name: 'Test Endpoint',
  url: 'test.example.com',
  port: 443,
  protocol: 'tcp' as const,
  category: 'Custom',
  enabled: true,
};
```

**Location:**
- No separate fixtures directory
- Test data defined inline in test files
- Complex test data can be in the test file itself

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**Coverage Config (vite.config.ts):**
```typescript
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html"],
  exclude: [
    "node_modules/",
    "src/test/",
    "**/*.d.ts",
    "**/*.config.*",
    "**/mockData",
    "dist/",
  ],
},
```

**View Coverage:**
```bash
pnpm test:coverage
# Opens HTML report in coverage/ directory
```

## Test Types

**Unit Tests:**
- Pure function tests in `src/lib/utils.test.ts`
- Test individual functions in isolation
- No async operations, no side effects

**Store Tests:**
- Zustand store tests in `src/store/useAppStore.test.ts`
- Test state mutations and actions
- Use `useAppStore.getState()` and `useAppStore.setState()`

**Integration Tests:**
- Not currently implemented for frontend
- Rust has integration-style tests for network functions (hit real endpoints)

**E2E Tests:**
- Not implemented
- Tauri provides `@tauri-apps/api` mocking for unit tests instead

## Common Patterns

**Async Testing (Rust):**
```rust
#[tokio::test]
async fn test_tcp_connection_success() {
    let result = test_tcp_latency("www.google.com", 443).await;
    assert!(result.is_ok());
    let latency = result.unwrap();
    assert!(latency > 0.0);
    assert!(latency < 5000.0); // Should be less than 5 seconds
}
```

**Store State Testing:**
```typescript
it('should update config', () => {
  const { setConfig } = useAppStore.getState();
  setConfig({ testInterval: 20 });

  const state = useAppStore.getState();
  expect(state.config.testInterval).toBe(20);
});
```

**Testing State After Actions:**
```typescript
it('should add custom endpoint', () => {
  const { addCustomEndpoint } = useAppStore.getState();

  addCustomEndpoint({
    name: 'Test Endpoint',
    url: 'test.example.com',
    port: 443,
    protocol: 'tcp' as const,
    category: 'Custom',
    enabled: true,
  });

  const state = useAppStore.getState();
  expect(state.customEndpoints.length).toBe(1);
  expect(state.customEndpoints[0].name).toBe('Test Endpoint');
});
```

**Error Case Testing (Rust):**
```rust
#[tokio::test]
async fn test_tcp_connection_timeout() {
    // Use an IP that will timeout (non-routable IP)
    let result = test_tcp_latency("192.0.2.1", 443).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_tcp_connection_invalid_host() {
    let result = test_tcp_latency("invalid.host.that.does.not.exist.example", 443).await;
    assert!(result.is_err());
}
```

**Testing Multiple Return Values:**
```typescript
describe('getStatusColor', () => {
  it('should return correct color classes', () => {
    expect(getStatusColor('excellent')).toBe('text-green-500');
    expect(getStatusColor('good')).toBe('text-yellow-500');
    expect(getStatusColor('warning')).toBe('text-orange-500');
    expect(getStatusColor('critical')).toBe('text-red-500');
    expect(getStatusColor('unknown')).toBe('text-gray-500');
  });
});
```

## Test Environment

**Vitest Config:**
```typescript
test: {
  globals: true,             // Use global describe/it/expect
  environment: "happy-dom",  // DOM simulation
  setupFiles: ["./src/test/setup.ts"],
}
```

**Happy-DOM:**
- Used instead of jsdom for faster performance
- Provides DOM APIs for React component testing
- Configured in `vite.config.ts`

## Running Specific Tests

```bash
# Run single test file
pnpm test src/lib/utils.test.ts

# Run tests matching pattern
pnpm test -t "getLatencyStatus"

# Run Rust tests with output
cd src-tauri && cargo test -- --nocapture

# Run specific Rust test
cd src-tauri && cargo test test_default_settings
```

## Test Coverage Gaps

**Currently Untested:**
- React component rendering (no component tests)
- Hook behavior with React Testing Library
- Tauri command integration (mocked globally)
- Error boundary recovery behavior
- FSLogix service functions

**Partially Tested:**
- Store actions (basic tests exist)
- Utility functions (good coverage)
- Rust latency functions (network tests)

---

*Testing analysis: 2026-01-16*
