# Requirements: AVD Health Monitor Refactor

**Defined:** 2026-01-16
**Core Value:** Reliable, unobtrusive AVD endpoint monitoring that helps IT admins identify connectivity issues before users experience problems.

## v1 Requirements

Requirements for this refactor cycle.

### Installer

- [ ] **INST-01**: Application installs without admin privileges (per-user install to AppData)
- [ ] **INST-02**: WiX MSI compilation succeeds without errors
- [ ] **INST-03**: NSIS installer builds successfully
- [ ] **INST-04**: Installer provides option for system-wide or per-user install

### Tech Debt - Components

- [ ] **COMP-01**: SettingsPanel.tsx split into ModeSelector component
- [ ] **COMP-02**: SettingsPanel.tsx split into ThresholdSettings component
- [ ] **COMP-03**: SettingsPanel.tsx split into CustomEndpointManager component
- [ ] **COMP-04**: SettingsPanel.tsx split into ModeEndpointList component
- [ ] **COMP-05**: SettingsPanel.tsx split into FSLogixSettings component
- [ ] **COMP-06**: SettingsPanel.tsx under 300 lines after refactor

### Tech Debt - State

- [ ] **STATE-01**: useAppStore split into configSlice
- [ ] **STATE-02**: useAppStore split into endpointSlice
- [ ] **STATE-03**: useAppStore split into fslogixSlice
- [ ] **STATE-04**: useAppStore split into uiSlice
- [ ] **STATE-05**: Persistence logic isolated in dedicated module

### Tech Debt - Race Conditions

- [ ] **RACE-01**: Mode switch uses proper state sequencing (no setTimeout)
- [ ] **RACE-02**: App.tsx test triggers use Zustand subscribe pattern
- [ ] **RACE-03**: Endpoint loading completes before tests trigger

### Tech Debt - Types

- [ ] **TYPE-01**: LatencyThresholds type unified between Rust and TypeScript
- [ ] **TYPE-02**: AppConfig type unified between Rust and TypeScript
- [ ] **TYPE-03**: Type generation from Rust to TypeScript (ts-rs or similar)

### Security

- [ ] **SEC-01**: Settings JSON validated against schema on load
- [ ] **SEC-02**: Portable mode uses OS API for permission check (no test file)
- [ ] **SEC-03**: File paths validated before external editor invocation

### Testing

- [ ] **TEST-01**: Integration tests for settings save/load roundtrip
- [ ] **TEST-02**: Integration tests for mode switching flow
- [ ] **TEST-03**: Unit tests for Zustand store slices
- [ ] **TEST-04**: FSLogix path parsing tests
- [ ] **TEST-05**: Tray icon state tests (where testable)

### Features

- [ ] **FEAT-01**: User can export settings to JSON file
- [ ] **FEAT-02**: User can import settings from JSON file
- [ ] **FEAT-03**: User can export latency history to CSV
- [ ] **FEAT-04**: App shows meaningful state when offline (graceful degradation)

## v2 Requirements

Deferred to future release.

### Enhanced Testing

- **TEST-V2-01**: E2E tests with Tauri test driver
- **TEST-V2-02**: Visual regression tests for UI components
- **TEST-V2-03**: Performance benchmarks for latency testing

### Enhanced Features

- **FEAT-V2-01**: Scheduled reports via email
- **FEAT-V2-02**: Multi-endpoint batch import
- **FEAT-V2-03**: Endpoint groups/tags for organization

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Desktop-only tool, not in scope |
| Cloud sync | Local-first design philosophy |
| Multi-language | English only for this cycle |
| macOS/Linux installers | Windows is primary target |
| Real-time collaboration | Single-user tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INST-01 | Phase 1 | Pending |
| INST-02 | Phase 1 | Pending |
| INST-03 | Phase 1 | Pending |
| INST-04 | Phase 1 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| COMP-04 | Phase 2 | Pending |
| COMP-05 | Phase 2 | Pending |
| COMP-06 | Phase 2 | Pending |
| STATE-01 | Phase 3 | Pending |
| STATE-02 | Phase 3 | Pending |
| STATE-03 | Phase 3 | Pending |
| STATE-04 | Phase 3 | Pending |
| STATE-05 | Phase 3 | Pending |
| RACE-01 | Phase 4 | Pending |
| RACE-02 | Phase 4 | Pending |
| RACE-03 | Phase 4 | Pending |
| TYPE-01 | Phase 5 | Pending |
| TYPE-02 | Phase 5 | Pending |
| TYPE-03 | Phase 5 | Pending |
| SEC-01 | Phase 6 | Pending |
| SEC-02 | Phase 6 | Pending |
| SEC-03 | Phase 6 | Pending |
| TEST-01 | Phase 7 | Pending |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |
| TEST-05 | Phase 7 | Pending |
| FEAT-01 | Phase 8 | Pending |
| FEAT-02 | Phase 8 | Pending |
| FEAT-03 | Phase 8 | Pending |
| FEAT-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-16*
*Last updated: 2026-01-16 after initial definition*
