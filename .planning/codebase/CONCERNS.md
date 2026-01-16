# Codebase Concerns

**Analysis Date:** 2026-01-16

## Tech Debt

**Large Component File - SettingsPanel.tsx:**
- Issue: `src/components/SettingsPanel.tsx` is 1159 lines, handling multiple responsibilities (mode selection, thresholds, custom endpoints, FSLogix settings, mode endpoints)
- Files: `src/components/SettingsPanel.tsx`
- Impact: Difficult to maintain, test, and extend. Complex state management with multiple edit modes running in parallel
- Fix approach: Extract into smaller components: `<ModeSelector />`, `<ThresholdSettings />`, `<CustomEndpointManager />`, `<ModeEndpointList />`, `<FSLogixSettings />`

**Large Store File - useAppStore.ts:**
- Issue: `src/store/useAppStore.ts` is 721 lines with 30+ actions and complex persistence logic
- Files: `src/store/useAppStore.ts`
- Impact: Hard to reason about state flow; persistence migration logic is fragile
- Fix approach: Split into domain slices using Zustand slices pattern: `configSlice`, `endpointSlice`, `fslogixSlice`, `uiSlice`

**Duplicated Threshold Types:**
- Issue: `LatencyThresholds` defined separately in Rust (`src-tauri/src/settings.rs:24`, `src-tauri/src/tray_icon.rs:37`) and TypeScript (`src/types.ts:45`)
- Files: `src-tauri/src/settings.rs`, `src-tauri/src/tray_icon.rs`, `src/types.ts`
- Impact: Type definitions can drift out of sync; requires manual updates in multiple places
- Fix approach: Generate TypeScript types from Rust using `ts-rs` crate or maintain shared schema

**Magic Numbers in Mode Switch:**
- Issue: `setTimeout(() => { triggerTestNow(); }, 50);` in `src/components/SettingsPanel.tsx:83` uses arbitrary delay
- Files: `src/components/SettingsPanel.tsx`
- Impact: Race condition workaround that may fail under load; unclear why 50ms is sufficient
- Fix approach: Use proper React effect dependencies or state machine to ensure endpoints are loaded before triggering test

**Race Condition Workarounds in App.tsx:**
- Issue: Multiple `setTimeout` calls with magic numbers (`50ms`, `100ms`) to work around state timing issues
- Files: `src/App.tsx:294`, `src/components/SettingsPanel.tsx:83`
- Impact: Brittle timing-dependent code that may fail intermittently
- Fix approach: Use Zustand's subscribe or middleware to properly sequence dependent operations

## Known Bugs

**No known bugs identified in current analysis.**

The codebase appears stable. TODO/FIXME comments are not present in the source files.

## Security Considerations

**Settings File in User-Writable Location:**
- Risk: `%APPDATA%\AVDHealthMonitor\settings.json` can be modified by any process running as the user
- Files: `src-tauri/src/settings.rs:329-348`
- Current mitigation: None - file is stored with default permissions
- Recommendations: Validate JSON schema on load; consider signing settings file; warn user if settings appear tampered

**Portable Mode Write Test:**
- Risk: `is_portable()` function in `src-tauri/src/settings.rs:299-318` creates/deletes test files to check directory writeability
- Files: `src-tauri/src/settings.rs:310-314`
- Current mitigation: File is immediately deleted
- Recommendations: Use OS API to check permissions instead of write test; add error handling if test file cannot be deleted

**External Editor Invocation:**
- Risk: `open_settings_file()` and `open_resource_file()` invoke external programs (notepad, open, xdg-open) with file paths
- Files: `src-tauri/src/lib.rs:137-166`, `src-tauri/src/lib.rs:168-202`
- Current mitigation: Uses fixed commands, path comes from internal functions
- Recommendations: Validate file path before passing to external command; ensure path cannot contain shell metacharacters

**Registry Access (Windows):**
- Risk: Application reads from Windows Registry for FSLogix paths and autostart configuration
- Files: `src-tauri/src/fslogix.rs:72-113`, `src-tauri/src/autostart.rs:9-52`
- Current mitigation: Read-only for FSLogix; write to HKCU\Run only
- Recommendations: Registry access is appropriate for the use case; no changes needed

## Performance Bottlenecks

**Sequential Endpoint Loading:**
- Problem: Initial settings and endpoint loading is synchronous
- Files: `src-tauri/src/settings.rs:513-516`
- Cause: `load_settings_with_endpoints()` loads settings, then endpoint file sequentially
- Improvement path: Not critical - runs once at startup; could parallelize if startup time becomes an issue

**History Cleanup on Every Read:**
- Problem: `cleanupOldHistory()` runs on every history deserialization
- Files: `src/store/useAppStore.ts:160-165`
- Cause: Filter runs over entire history array each time
- Improvement path: Only run cleanup periodically (e.g., once per hour) or on app startup

**Full Endpoint Test on Mode Switch:**
- Problem: Switching modes triggers immediate full test of all endpoints
- Files: `src/components/SettingsPanel.tsx:83-86`
- Cause: User experience design - provides immediate feedback
- Improvement path: Consider showing cached/stale data while tests run in background

## Fragile Areas

**Mode Switch State Flow:**
- Files: `src/components/SettingsPanel.tsx:76-87`, `src/hooks/useSettingsSync.ts`, `src/store/useAppStore.ts`
- Why fragile: Mode switch involves: 1) load settings for mode, 2) update config, 3) update endpoints, 4) restore history, 5) trigger test. Multiple async operations with timing dependencies
- Safe modification: Always test mode switching thoroughly; ensure endpoints are fully loaded before triggering tests
- Test coverage: No automated tests for mode switching flow

**Zustand Persistence Migrations:**
- Files: `src/store/useAppStore.ts:707-718`
- Why fragile: Migration logic in `migrate` function; version number must be incremented correctly; easy to break existing user data
- Safe modification: Always increment version; test migration with real persisted data; keep old migration code for users skipping versions
- Test coverage: No migration tests

**Tray Icon Global State:**
- Files: `src-tauri/src/lib.rs:25`, `src-tauri/src/lib.rs:354`
- Why fragile: Uses `once_cell::sync::Lazy` with `parking_lot::Mutex` for global tray icon reference
- Safe modification: Never call tray operations from multiple threads; ensure lock is released before returning
- Test coverage: No tray icon tests (difficult to test without full app context)

**Settings File Initialization:**
- Files: `src-tauri/src/settings.rs:563-636`
- Why fragile: Complex path resolution logic with multiple fallbacks for finding bundled resources
- Safe modification: Test on fresh install, upgrade install, and portable mode
- Test coverage: Minimal - only `test_default_settings` exists

## Scaling Limits

**Endpoint History in LocalStorage:**
- Current capacity: ~100 history entries per endpoint (hardcoded in `src/store/useAppStore.ts:425`)
- Limit: LocalStorage typically limited to 5-10MB; with many endpoints and 24hr retention, could approach limit
- Scaling path: Move history to IndexedDB; implement compression; reduce retention

**Concurrent Endpoint Tests:**
- Current capacity: All enabled endpoints tested in parallel
- Limit: Large number of endpoints (50+) could cause network congestion or timeout issues
- Scaling path: Implement batched testing with configurable concurrency limit

## Dependencies at Risk

**None identified as high risk.**

Current dependencies are stable:
- `@tauri-apps/api@^2` - Active development, well-maintained
- `zustand@^5.0.9` - Stable, minimal API surface
- `react@^19.1.0` - Recently released; watch for ecosystem compatibility
- Rust dependencies pinned to specific major versions

## Missing Critical Features

**No Settings Export/Import:**
- Problem: Users cannot backup or transfer settings between machines
- Blocks: Enterprise deployment scenarios; disaster recovery

**No Endpoint Health History Export:**
- Problem: Historical latency data cannot be exported for analysis
- Blocks: Compliance reporting; trend analysis; debugging intermittent issues

**No Offline Mode:**
- Problem: App requires network connectivity; no graceful degradation
- Blocks: Usage on isolated networks during initial configuration

## Test Coverage Gaps

**No Integration Tests:**
- What's not tested: Full flow from Tauri command invocation through state update to UI render
- Files: All `src/` files
- Risk: State synchronization bugs, Tauri IPC issues not caught
- Priority: High

**No Settings Persistence Tests:**
- What's not tested: Settings save/load roundtrip; JSON schema validation; migration from old versions
- Files: `src-tauri/src/settings.rs`, `src/store/useAppStore.ts` persistence logic
- Risk: Data loss or corruption on upgrade
- Priority: High

**No FSLogix Tests:**
- What's not tested: FSLogix path parsing, registry reading (requires Windows), connectivity testing
- Files: `src-tauri/src/fslogix.rs`, `src/services/fslogixService.ts`
- Risk: FSLogix features may break silently
- Priority: Medium

**No Tray Icon Tests:**
- What's not tested: Icon generation, tray menu events, notification sending
- Files: `src-tauri/src/tray_icon.rs`, `src-tauri/src/lib.rs` tray code, `src/hooks/useTrayIcon.ts`
- Risk: Tray functionality regressions
- Priority: Medium

**No E2E Tests:**
- What's not tested: Full application behavior from user perspective
- Files: Entire application
- Risk: User-facing bugs not caught before release
- Priority: Medium

**Unwrap Usage in Tests:**
- What's not tested: Proper error handling in test code
- Files: `src-tauri/src/settings.rs:705`, `src-tauri/src/settings.rs:709`, `src-tauri/src/latency.rs:61`, `src-tauri/src/latency.rs:84`
- Risk: Test panics mask actual errors; acceptable in test code but worth noting
- Priority: Low

---

*Concerns audit: 2026-01-16*
