# Roadmap: AVD Health Monitor Refactor

## Overview

Comprehensive refactor of the AVD Health Monitor codebase. Starting with the immediate pain (installer issues), then systematically addressing tech debt, improving security, adding test coverage, and implementing new features. Each phase delivers independently verifiable improvements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Installer Fixes** - Per-user install, fix WiX/NSIS builds
- [x] **Phase 2: Component Refactor** - Break up SettingsPanel.tsx
- [x] **Phase 3: State Refactor** - Split useAppStore into slices
- [x] **Phase 4: Race Conditions** - Replace setTimeout workarounds
- [ ] **Phase 5: Type Unification** - Unify Rust/TypeScript types
- [ ] **Phase 6: Security** - Schema validation, path safety
- [ ] **Phase 7: Testing** - Integration and unit tests
- [ ] **Phase 8: Features** - Export/import, offline mode

## Phase Details

### Phase 1: Installer Fixes
**Goal**: Application installs without admin privileges, reliable builds
**Depends on**: Nothing (first phase)
**Requirements**: INST-01, INST-02, INST-03, INST-04
**Success Criteria** (what must be TRUE):
  1. User can install app without admin prompt (per-user mode)
  2. MSI builds successfully in CI
  3. NSIS builds successfully in CI
  4. Installer offers per-user or system-wide choice
**Plans**: 1-01 (Tauri config), 1-02 (CI workflow)

### Phase 2: Component Refactor
**Goal**: SettingsPanel.tsx broken into maintainable components
**Depends on**: Phase 1
**Requirements**: COMP-01, COMP-02, COMP-03, COMP-04, COMP-05, COMP-06
**Success Criteria** (what must be TRUE):
  1. SettingsPanel.tsx is under 300 lines
  2. Each settings section is its own component
  3. All existing functionality preserved
  4. No visual regressions
**Plans**: 2-01 (ModeSelector, ThresholdSettings), 2-02 (CustomEndpointManager, ModeEndpointList, FSLogixSettings)

### Phase 3: State Refactor
**Goal**: useAppStore split into domain slices
**Depends on**: Phase 2
**Requirements**: STATE-01, STATE-02, STATE-03, STATE-04, STATE-05
**Success Criteria** (what must be TRUE):
  1. Store split into 4 slices (config, endpoint, fslogix, ui)
  2. Persistence logic isolated
  3. Existing user data migrates correctly
  4. No functionality regressions
**Plans**: 3-01 (persistence + types), 3-02 (configSlice + uiSlice), 3-03 (endpointSlice), 3-04 (fslogixSlice), 3-05 (combine store)

### Phase 4: Race Conditions
**Goal**: Proper state sequencing, no setTimeout workarounds
**Depends on**: Phase 3
**Requirements**: RACE-01, RACE-02, RACE-03
**Success Criteria** (what must be TRUE):
  1. Mode switch works without setTimeout
  2. Tests trigger only after endpoints loaded
  3. No flaky behavior during mode switches
**Plans**: 4-01 (waitForState utility), 4-02 (remove setTimeout)

### Phase 5: Type Unification
**Goal**: Single source of truth for shared types
**Depends on**: Phase 4
**Requirements**: TYPE-01, TYPE-02, TYPE-03
**Success Criteria** (what must be TRUE):
  1. Types generated from Rust to TypeScript
  2. LatencyThresholds defined once
  3. AppConfig defined once
  4. Build fails if types drift
**Plans**: TBD

### Phase 6: Security
**Goal**: Hardened settings handling and file operations
**Depends on**: Phase 5
**Requirements**: SEC-01, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Malformed settings.json rejected with error
  2. Portable mode doesn't create test files
  3. Path injection prevented in editor invocation
**Plans**: TBD

### Phase 7: Testing
**Goal**: Meaningful test coverage for critical paths
**Depends on**: Phase 6
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05
**Success Criteria** (what must be TRUE):
  1. Settings roundtrip tested
  2. Mode switching tested
  3. Store slices have unit tests
  4. CI runs all tests
**Plans**: TBD

### Phase 8: Features
**Goal**: Export/import and offline resilience
**Depends on**: Phase 7
**Requirements**: FEAT-01, FEAT-02, FEAT-03, FEAT-04
**Success Criteria** (what must be TRUE):
  1. User can export settings to file
  2. User can import settings from file
  3. User can export history to CSV
  4. App shows useful state when offline
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Installer Fixes | 2/2 | Complete | 2026-01-16 |
| 2. Component Refactor | 2/2 | Complete | 2026-01-16 |
| 3. State Refactor | 5/5 | Complete | 2026-01-16 |
| 4. Race Conditions | 2/2 | Complete | 2026-01-16 |
| 5. Type Unification | 0/? | Not started | - |
| 6. Security | 0/? | Not started | - |
| 7. Testing | 0/? | Not started | - |
| 8. Features | 0/? | Not started | - |
