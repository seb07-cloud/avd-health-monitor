# Requirements: AVD Health Monitor Refactor

**Defined:** 2026-01-16
**Core Value:** Reliable, unobtrusive AVD endpoint monitoring that helps IT admins identify connectivity issues before users experience problems.

## v1 Requirements

Requirements for this refactor cycle.

### Installer

- [x] **INST-01**: Application installs without admin privileges (per-user install to AppData)
- [x] **INST-02**: WiX MSI compilation succeeds without errors
- [x] **INST-03**: NSIS installer builds successfully
- [x] **INST-04**: Installer provides option for system-wide or per-user install

### Tech Debt - Components

- [x] **COMP-01**: SettingsPanel.tsx split into ModeSelector component
- [x] **COMP-02**: SettingsPanel.tsx split into ThresholdSettings component
- [x] **COMP-03**: SettingsPanel.tsx split into CustomEndpointManager component
- [x] **COMP-04**: SettingsPanel.tsx split into ModeEndpointList component
- [x] **COMP-05**: SettingsPanel.tsx split into FSLogixSettings component
- [x] **COMP-06**: SettingsPanel.tsx under 300 lines after refactor

### Tech Debt - State

- [x] **STATE-01**: useAppStore split into configSlice
- [x] **STATE-02**: useAppStore split into endpointSlice
- [x] **STATE-03**: useAppStore split into fslogixSlice
- [x] **STATE-04**: useAppStore split into uiSlice
- [x] **STATE-05**: Persistence logic isolated in dedicated module

### Tech Debt - Race Conditions

- [x] **RACE-01**: Mode switch uses proper state sequencing (no setTimeout)
- [x] **RACE-02**: App.tsx test triggers use Zustand subscribe pattern
- [x] **RACE-03**: Endpoint loading completes before tests trigger

### Tech Debt - Types

- [x] **TYPE-01**: LatencyThresholds type unified between Rust and TypeScript
- [x] **TYPE-02**: AppConfig type unified between Rust and TypeScript
- [x] **TYPE-03**: Type generation from Rust to TypeScript (ts-rs or similar)

### Security

- [x] **SEC-01**: Settings JSON validated against schema on load
- [x] **SEC-02**: Portable mode uses OS API for permission check (no test file)
- [x] **SEC-03**: File paths validated before external editor invocation

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
| INST-01 | Phase 1 | Complete |
| INST-02 | Phase 1 | Complete |
| INST-03 | Phase 1 | Complete |
| INST-04 | Phase 1 | Complete |
| COMP-01 | Phase 2 | Complete |
| COMP-02 | Phase 2 | Complete |
| COMP-03 | Phase 2 | Complete |
| COMP-04 | Phase 2 | Complete |
| COMP-05 | Phase 2 | Complete |
| COMP-06 | Phase 2 | Complete |
| STATE-01 | Phase 3 | Complete |
| STATE-02 | Phase 3 | Complete |
| STATE-03 | Phase 3 | Complete |
| STATE-04 | Phase 3 | Complete |
| STATE-05 | Phase 3 | Complete |
| RACE-01 | Phase 4 | Complete |
| RACE-02 | Phase 4 | Complete |
| RACE-03 | Phase 4 | Complete |
| TYPE-01 | Phase 5 | Complete |
| TYPE-02 | Phase 5 | Complete |
| TYPE-03 | Phase 5 | Complete |
| SEC-01 | Phase 6 | Complete |
| SEC-02 | Phase 6 | Complete |
| SEC-03 | Phase 6 | Complete |
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
*Last updated: 2026-01-16 — Phase 6 requirements marked complete*
