# Coding Conventions

**Analysis Date:** 2026-01-16

## Naming Patterns

**Files:**
- TypeScript components: PascalCase (`Dashboard.tsx`, `EndpointCard.tsx`, `ErrorBoundary.tsx`)
- TypeScript hooks: camelCase with `use` prefix (`useTrayIcon.ts`, `useSettingsSync.ts`)
- TypeScript services: camelCase with `Service` suffix (`latencyService.ts`, `fslogixService.ts`)
- TypeScript utilities: camelCase (`utils.ts`, `errors.ts`)
- TypeScript store: camelCase with `use` prefix (`useAppStore.ts`)
- TypeScript tests: same name as source file with `.test.ts` suffix (`utils.test.ts`, `useAppStore.test.ts`)
- Rust modules: snake_case (`tray_icon.rs`, `latency.rs`, `settings.rs`)

**Functions:**
- TypeScript: camelCase (`getLatencyStatus`, `formatLatency`, `testMultipleEndpoints`)
- React hooks: camelCase with `use` prefix (`useTrayIcon`, `useSettingsSync`)
- React components: PascalCase function names (`Dashboard`, `EndpointCard`)
- Rust functions: snake_case (`test_tcp_latency`, `update_tray_icon`, `load_settings`)
- Tauri commands: snake_case matching Rust function names (`test_latency`, `send_notification`)

**Variables:**
- TypeScript: camelCase (`averageLatency`, `endpointStatuses`, `isMonitoring`)
- React refs: camelCase with `Ref` suffix (`isTestingRef`, `isMounted`, `previousLatency`)
- Rust: snake_case (`icon_data`, `endpoint_file`, `settings_path`)

**Types:**
- TypeScript interfaces: PascalCase (`Endpoint`, `EndpointStatus`, `AppConfig`)
- TypeScript type aliases: PascalCase (`LatencyStatus`, `AppMode`)
- TypeScript enums: PascalCase with PascalCase members (`ErrorCode.NETWORK_ERROR`)
- Rust structs: PascalCase (`SettingsFile`, `EndpointDefinition`, `LatencyThresholds`)
- Rust enums: PascalCase with PascalCase variants (`AppMode::SessionHost`)

**Constants:**
- TypeScript: SCREAMING_SNAKE_CASE (`STORAGE_KEY`, `HISTORY_RETENTION_MS`)
- Rust: SCREAMING_SNAKE_CASE (`SETTINGS_FILENAME`, `MAX_RETRY_ATTEMPTS`)

## Code Style

**Formatting:**
- No explicit Prettier or ESLint config detected
- TypeScript: 2-space indentation inferred from files
- Rust: standard rustfmt (4-space indentation)
- Single quotes for TypeScript strings
- Semicolons required in TypeScript
- Trailing commas in TypeScript arrays/objects

**Linting:**
- TypeScript uses strict mode via `tsconfig.json`:
  - `"strict": true`
  - `"noUnusedLocals": true`
  - `"noUnusedParameters": true`
  - `"noFallthroughCasesInSwitch": true`
- Rust uses standard Clippy warnings

## Import Organization

**Order (TypeScript):**
1. React imports (`import { useEffect, useState } from 'react'`)
2. External library imports (`import { invoke } from '@tauri-apps/api/core'`)
3. Internal absolute imports (`import { useAppStore } from '../store/useAppStore'`)
4. Component imports (`import { Dashboard } from './components/Dashboard'`)
5. Type imports (use `import type` syntax: `import type { Endpoint } from '../types'`)
6. Utility imports (`import { cn, formatLatency } from '../lib/utils'`)

**Path Aliases:**
- No path aliases configured - use relative imports (`../`, `./`)

**Rust Module Organization:**
```rust
// External crates first
use serde::{Deserialize, Serialize};
use std::fs;

// Local modules
mod latency;
mod tray_icon;

// Local use statements
use tray_icon::generate_tray_icon;
```

## Error Handling

**TypeScript Patterns:**
- Custom error class hierarchy in `src/errors.ts`:
  ```typescript
  export class AppError extends Error {
    readonly code: ErrorCode;
    readonly timestamp: number;
    readonly recoverable: boolean;
  }
  ```
- Specialized error classes: `NetworkError`, `TimeoutError`, `ConnectionError`, `TauriError`
- Use `parseBackendError()` to convert unknown errors to typed errors
- Use `getUserFriendlyErrorMessage()` for user-facing messages
- ErrorBoundary component wraps the entire app for React error catching

**Tauri IPC Error Handling:**
```typescript
// Pattern: Parse backend errors and provide user-friendly messages
try {
  const result = await invoke<T>('command_name', args);
  return result;
} catch (error) {
  const parsedError = parseBackendError(error, endpoint);
  // Handle or rethrow with additional context
}
```

**Rust Error Handling:**
- Use `Result<T, String>` for Tauri commands (errors converted with `.map_err(|e| e.to_string())`)
- Use `Result<T, Box<dyn std::error::Error>>` for internal functions
- Use `?` operator for error propagation
- Use `std::io::Error` for file operations

## Logging

**Framework:** Console logging (`console.log`, `console.error`)

**Patterns:**
- Use bracketed prefixes for context: `[useAppStore]`, `[App]`, `[useTrayIcon]`, `[Settings]`
- Log startup information: `console.log('[App] Running initial test for', count, 'endpoints')`
- Log errors with context: `console.error('[useSettingsSync] Failed to load settings:', error)`
- Rust uses `println!` for info, `eprintln!` for errors with `[Settings]` prefix

## Comments

**When to Comment:**
- JSDoc for exported functions with complex behavior
- Inline comments for non-obvious logic
- Block comments for algorithm explanations

**JSDoc/TSDoc:**
```typescript
/**
 * Validates a URL string for endpoint configuration.
 * Returns an error message if invalid, or null if valid.
 */
export function validateEndpointUrl(url: string): string | null {
```

**Rust Doc Comments:**
```rust
/// Test TCP connection latency to an endpoint
pub async fn test_tcp_latency(host: &str, port: u16) -> Result<f64, Box<dyn std::error::Error>> {
```

## Function Design

**Size:** Functions typically 20-50 lines; complex components may be longer but are well-organized with helper functions

**Parameters:**
- Use destructured objects for hooks with many options:
  ```typescript
  export function useTrayIcon({
    averageLatency,
    thresholds,
    notificationsEnabled,
    // ...
  }: UseTrayIconProps) {
  ```
- Use optional parameters with defaults: `port: Option<u16>` / `port?: number`

**Return Values:**
- Async functions return `Promise<T>` or `Promise<void>`
- Validation functions return `string | null` (null = valid)
- Hooks return objects with named properties for destructuring

## Module Design

**React Components:**
- Named exports for components: `export function Dashboard() {`
- Props interfaces defined before component: `interface EndpointCardProps {`
- Internal helper components in same file if small (e.g., `CustomTooltip`)

**Hooks:**
- Named exports: `export function useTrayIcon() {`
- Return object with actions/values for flexibility

**Services:**
- Named exports for all functions
- Group related functions in one file

**Zustand Store:**
- Single store pattern in `src/store/useAppStore.ts`
- Interface for state shape (`AppState`)
- Actions defined inline with state
- Persist middleware for localStorage

## TypeScript Specifics

**Type Assertions:**
- Use `as const` for literal types
- Use type guards: `error instanceof AppError`
- Prefer `unknown` over `any` for untyped data

**Nullability:**
- Use `| null` for nullable values: `currentLatency: number | null`
- Use optional chaining: `status?.lastUpdated`
- Use nullish coalescing: `port ?? 443`

**Generics:**
- Use for reusable utility functions:
  ```typescript
  async function safeInvoke<T>(command: string, args: Record<string, unknown>): Promise<T | null>
  ```

## Rust Specifics

**Serde Conventions:**
- Use `#[serde(rename_all = "camelCase")]` for JSON interop with frontend
- Use `#[serde(default)]` for optional fields with defaults
- Use `#[serde(default = "function_name")]` for custom default values

**Async Patterns:**
- Use `tokio` for async runtime
- Use `async fn` for I/O-bound operations
- Use `spawn_blocking` for CPU-bound or blocking operations (e.g., DNS resolution)

**State Management:**
- Use `once_cell::Lazy` for global state
- Use `parking_lot::Mutex` for thread-safe mutable state
- Use `Arc<Mutex<T>>` for shared ownership

---

*Convention analysis: 2026-01-16*
