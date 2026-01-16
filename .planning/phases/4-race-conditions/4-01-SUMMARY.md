---
phase: 4-race-conditions
plan: 01
subsystem: ui
tags: [zustand, state, async, react]

# Dependency graph
requires:
  - phase: 3-state-refactor
    provides: Zustand store with subscribe capability
provides:
  - waitForState utility for Promise-based state waiting
  - waitForEndpointsLoaded convenience function
  - Race-condition-free mode switch in SettingsPanel
affects: [4-02, 4-03, monitoring-hooks]

# Tech tracking
tech-stack:
  added: []
  patterns: [subscribe-based state sequencing, graceful timeout degradation]

key-files:
  created: [src/lib/stateUtils.ts]
  modified: [src/components/SettingsPanel.tsx]

key-decisions:
  - "Check current state before subscribe (avoid unnecessary subscription)"
  - "5 second default timeout (prevents hanging)"
  - "Graceful degradation on timeout (still triggers test)"

patterns-established:
  - "waitForState pattern: Promise wrapper around Zustand subscribe"
  - "Timeout with cleanup: clearTimeout + unsub on resolve/reject"

# Metrics
duration: 2min
completed: 2026-01-16
---

# Phase 4 Plan 01: State Wait Utility Summary

**Promise-based waitForState utility replacing setTimeout workarounds with Zustand subscribe-based state sequencing**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-16
- **Completed:** 2026-01-16
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created reusable waitForState utility for async state waiting
- Fixed mode switch race condition (RACE-01) in SettingsPanel
- Established pattern for subscribe-based state sequencing

## Task Commits

Each task was committed atomically:

1. **Task 1: Create stateUtils.ts with waitForState utility** - `92fed51` (feat)
2. **Task 2: Update SettingsPanel to use waitForEndpointsLoaded** - `d3f217f` (fix)

## Files Created/Modified
- `src/lib/stateUtils.ts` - New file with waitForState and waitForEndpointsLoaded utilities
- `src/components/SettingsPanel.tsx` - Updated handleModeChange to use waitForEndpointsLoaded

## Decisions Made
- **Check current state before subscribe:** If condition already met, resolve immediately without subscribing (avoids race where state changed before subscribe attached)
- **5 second default timeout:** Prevents indefinite hanging if endpoints never load; sufficient for file I/O
- **Graceful degradation on timeout:** Catch timeout error but still trigger test (endpoints may have loaded via different path)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- waitForState utility available for other race condition fixes
- Pattern established for 4-02 (multiple endpoints loading) and 4-03 (FSLogix loading)
- No blockers

---
*Phase: 4-race-conditions*
*Completed: 2026-01-16*
