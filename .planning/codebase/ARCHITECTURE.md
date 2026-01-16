# Architecture

**Analysis Date:** 2026-01-16

## Pattern Overview

**Overall:** Tauri 2 Desktop Application with Layered Frontend Architecture

**Key Characteristics:**
- Rust backend (Tauri) handles system-level operations (network testing, registry access, tray icon)
- React frontend with Zustand for centralized state management
- IPC bridge via Tauri commands connects frontend and backend
- System tray application that runs minimized, with dashboard on demand

## Layers

**Frontend Presentation Layer:**
- Purpose: UI rendering and user interaction
- Location: `src/components/`
- Contains: React components (Dashboard, EndpointTile, SettingsPanel, FSLogixSection)
- Depends on: Zustand store, hooks, services
- Used by: App.tsx root component

**Frontend State Layer:**
- Purpose: Centralized application state with persistence
- Location: `src/store/useAppStore.ts`
- Contains: Zustand store with endpoint statuses, config, FSLogix paths, UI state
- Depends on: Tauri IPC (invoke), localStorage (persistence)
- Used by: All components via hooks

**Frontend Service Layer:**
- Purpose: Abstracts Tauri IPC calls into reusable async functions
- Location: `src/services/`
- Contains: `latencyService.ts` (endpoint testing), `fslogixService.ts` (storage monitoring)
- Depends on: Tauri invoke API, error parsing
- Used by: App.tsx test loops, hooks

**Frontend Hook Layer:**
- Purpose: Custom React hooks for side effects and integrations
- Location: `src/hooks/`
- Contains: `useTrayIcon.ts` (icon + notifications), `useSettingsSync.ts` (settings loading)
- Depends on: Tauri IPC, Zustand store
- Used by: App.tsx

**Backend Command Layer:**
- Purpose: Exposes Rust functions as Tauri commands callable from frontend
- Location: `src-tauri/src/lib.rs`
- Contains: `#[tauri::command]` annotated functions
- Depends on: Backend modules (latency, settings, tray_icon, fslogix, autostart)
- Used by: Frontend via `invoke()`

**Backend Module Layer:**
- Purpose: Implements core system functionality
- Location: `src-tauri/src/*.rs`
- Contains:
  - `latency.rs`: TCP/HTTP latency testing with tokio
  - `settings.rs`: JSON settings/endpoint file management
  - `tray_icon.rs`: Dynamic icon generation
  - `fslogix.rs`: Windows Registry reading for FSLogix paths
  - `autostart.rs`: Windows auto-start registry
  - `logger.rs`: Log directory management
- Depends on: System APIs (network, registry, filesystem)
- Used by: Command layer

## Data Flow

**Endpoint Latency Testing:**

1. App.tsx test loop triggers `testMultipleEndpoints()` from `latencyService.ts`
2. Service calls `invoke('test_latency', { endpoint, port, protocol })`
3. Rust `test_latency` command in `lib.rs` dispatches to `latency.rs`
4. `latency.rs` performs TCP connect or HTTP request, returns ms latency
5. Result returns to frontend, `updateLatency()` updates Zustand store
6. Components re-render with new `endpointStatuses` from store
7. `useTrayIcon` hook detects changes, calls `invoke('update_tray_icon')`

**Settings Flow:**

1. App startup: `useSettingsSync` hook calls `invoke('read_settings_with_endpoints')`
2. Rust loads `settings.json` from `%APPDATA%\AVDHealthMonitor\` (or exe dir for portable)
3. Rust loads mode-specific endpoint JSON (sessionhost or enduser)
4. Combined response returned to frontend with config + endpoints + modeInfo
5. Store updated via `setConfig()`, `setEndpoints()`, `setModeInfo()`
6. Config changes auto-save via `saveSettingsToFile()` in store actions

**Mode Switch Flow:**

1. User changes mode in SettingsPanel
2. `setConfig({ mode })` triggers `saveSettingsToFile()`
3. Frontend calls `loadSettingsForMode(newMode)` to get new endpoints
4. New endpoints replace old in store, history preserved for matching IDs
5. `pendingTestTrigger` flag set, App.tsx detects and runs immediate test

**State Management:**
- Zustand store (`useAppStore.ts`) is single source of truth
- State persisted to localStorage (config, customEndpoints, latency history)
- Backend JSON files store settings and endpoint definitions
- Map-based status tracking for O(1) lookups by endpoint/path ID

## Key Abstractions

**Endpoint:**
- Purpose: Represents a monitorable network endpoint
- Examples: `src/types.ts` interface, used throughout frontend and backend
- Pattern: ID-based lookup, category grouping, enabled/muted flags

**EndpointStatus:**
- Purpose: Runtime state for an endpoint including latency history
- Examples: `src/types.ts`, stored in `endpointStatuses` Map in store
- Pattern: Tracks currentLatency, status (excellent/good/warning/critical), history array, error state

**FSLogixPath:**
- Purpose: Represents an FSLogix storage path from Windows Registry
- Examples: `src-tauri/src/fslogix.rs`, `src/types.ts`
- Pattern: Extracted from registry, tested via TCP port 445

**AppConfig:**
- Purpose: Application settings (thresholds, intervals, mode, theme)
- Examples: `src/types.ts`, `src-tauri/src/settings.rs`
- Pattern: Mirrored between frontend (camelCase) and backend (snake_case)

**LatencyThresholds:**
- Purpose: Define status boundaries (excellent < good < warning < critical)
- Examples: `src/types.ts`, `src-tauri/src/tray_icon.rs`
- Pattern: Used for status calculation and tray icon color

## Entry Points

**Frontend Entry:**
- Location: `src/main.tsx`
- Triggers: Browser/WebView loads React app
- Responsibilities: Mount React root, render App component

**Backend Entry:**
- Location: `src-tauri/src/main.rs`
- Triggers: OS launches executable
- Responsibilities: Call `avd_health_monitor_lib::run()` to initialize Tauri

**Tauri App Setup:**
- Location: `src-tauri/src/lib.rs` (`pub fn run()`)
- Triggers: Called by main.rs
- Responsibilities: Initialize plugins, setup system tray, register commands, handle window events

**System Tray Menu:**
- Location: `src-tauri/src/lib.rs` (`create_tray()`)
- Triggers: User clicks tray icon
- Responsibilities: Show/hide window, pause/resume, test now, settings, exit

## Error Handling

**Strategy:** Typed error classes with user-friendly messages

**Patterns:**
- Frontend: `src/errors.ts` defines `AppError`, `NetworkError`, `TimeoutError`, `TauriError`
- `parseBackendError()` converts raw errors to typed errors with codes
- `getUserFriendlyErrorMessage()` returns human-readable messages
- Backend: Rust functions return `Result<T, String>`, errors propagate to frontend
- Retry logic in `useTrayIcon.ts` with exponential backoff for transient failures

## Cross-Cutting Concerns

**Logging:**
- Console logging throughout frontend for debugging
- Rust uses `println!`/`eprintln!` for startup diagnostics
- Log directory at `%APPDATA%\AVDHealthMonitor\logs\` (unused currently)

**Validation:**
- `src/lib/utils.ts`: `validateEndpointUrl()`, `validateThresholds()`
- Backend: Serde validation via derive macros, default values

**Authentication:**
- Not applicable - local desktop application, no user auth required

**Notifications:**
- `useTrayIcon.ts` manages desktop notifications via Tauri plugin
- Cooldown and consecutive threshold logic prevents alert spam
- Muted endpoints/paths excluded from alerts

---

*Architecture analysis: 2026-01-16*
