---
phase: 1-installer-fixes
plan: 01
subsystem: infra
tags: [tauri, nsis, wix, installer, windows]

# Dependency graph
requires: []
provides:
  - NSIS per-user installer configuration (no admin required)
  - WiX MSI system-wide installer configuration (enterprise deployment)
  - Explicit Windows installer targets
affects: [ci-cd, release]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "NSIS for per-user installs (currentUser mode)"
    - "WiX MSI for system-wide/enterprise deployment"

key-files:
  created: []
  modified:
    - src-tauri/tauri.conf.json

key-decisions:
  - "NSIS with currentUser mode for per-user install without admin"
  - "WiX MSI kept as system-wide installer for enterprise deployment"
  - "Explicit targets array instead of 'all' for Windows-only builds"

patterns-established:
  - "Dual installer strategy: NSIS (per-user) + MSI (system-wide)"

# Metrics
duration: 5min
completed: 2026-01-16
---

# Phase 1 Plan 01: Installer Configuration Summary

**NSIS per-user installer (no admin) and WiX MSI system-wide installer configured in tauri.conf.json**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-16T00:00:00Z
- **Completed:** 2026-01-16T00:05:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- NSIS configured for per-user installation with `installMode: "currentUser"`
- LZMA compression enabled for smaller NSIS installer downloads
- WiX MSI configured with English language for enterprise deployment
- Build targets explicitly set to `["nsis", "msi"]` for Windows-only builds

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure NSIS for per-user installation** - `ec8fd9d` (feat)
2. **Task 2: Add WiX configuration for system-wide installation** - `a8ff420` (feat)

**Plan metadata:** TBD (docs: complete installer configuration plan)

## Files Created/Modified
- `src-tauri/tauri.conf.json` - Added windows.nsis and windows.wix configuration, changed targets to explicit array

## Decisions Made
- Used `installMode: "currentUser"` for NSIS (not "both" which still requires admin)
- Kept WiX as system-wide installer (enterprise option) rather than creating custom perUser template
- Set compression to "lzma" for better download size

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Installer configuration complete
- Ready for CI/CD workflow updates if needed in future phases
- WiX builds may require VBSCRIPT Windows feature enabled on build machines (documented in research)

---
*Phase: 1-installer-fixes*
*Completed: 2026-01-16*
