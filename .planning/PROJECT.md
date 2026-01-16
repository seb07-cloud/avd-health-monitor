# AVD Health Monitor - Refactor & Improve

## What This Is

Windows system tray application for real-time Azure Virtual Desktop (AVD) endpoint health monitoring. Built with Tauri 2 (Rust backend) and React/TypeScript frontend. Monitors network connectivity to AVD-required endpoints and FSLogix storage paths.

## Core Value

Reliable, unobtrusive AVD endpoint monitoring that helps IT admins identify connectivity issues before users experience problems.

## Requirements

### Validated

<!-- Existing capabilities that work -->

- ✓ TCP/HTTP/HTTPS latency testing to AVD endpoints — existing
- ✓ Session Host and End User monitoring modes — existing
- ✓ FSLogix storage path monitoring — existing
- ✓ Dynamic system tray icon reflecting health status — existing
- ✓ Desktop notifications for endpoint failures — existing
- ✓ Customizable latency thresholds — existing
- ✓ Custom endpoint support — existing
- ✓ Latency history with graphs — existing
- ✓ Auto-start on Windows login — existing
- ✓ Dark/light theme support — existing

### Active

<!-- Current scope — improvements and fixes -->

**Installer/Packaging:**
- [ ] Per-user installation without admin privileges
- [ ] Fix WiX compilation issues
- [ ] Reliable MSI/NSIS installer builds

**Tech Debt:**
- [ ] Break up SettingsPanel.tsx into smaller components
- [ ] Split useAppStore.ts into Zustand slices
- [ ] Fix race conditions (replace setTimeout workarounds)
- [ ] Unify types between Rust and TypeScript

**Security:**
- [ ] Validate settings JSON schema on load
- [ ] Fix portable mode write test (use OS API)
- [ ] Validate paths before external editor invocation

**Test Coverage:**
- [ ] Add integration tests
- [ ] Add settings persistence tests
- [ ] Add FSLogix tests
- [ ] Add tray icon tests

**New Features:**
- [ ] Settings export/import
- [ ] History export (CSV/JSON)
- [ ] Offline mode / graceful degradation

### Out of Scope

- Mobile app — desktop-only tool
- Cloud sync — local-first design
- Multi-language support — English only for now
- macOS/Linux installer fixes — Windows is primary target

## Context

Brownfield project with existing v0.7.0 codebase. Core functionality works. Primary pain points:
- Installer requires admin privileges (blocking enterprise deployment)
- WiX compilation issues on builds
- Large files making maintenance difficult
- Race conditions causing occasional flaky behavior
- Minimal test coverage

Codebase analysis completed — see `.planning/codebase/` for detailed architecture, conventions, and concerns documentation.

## Constraints

- **Tech stack**: Tauri 2, React 19, TypeScript, Rust — no framework changes
- **Platform**: Windows primary (10/11), macOS/Linux secondary
- **Compatibility**: Must not break existing user settings/data
- **Build**: Must work in GitHub Actions CI

## Key Decisions

<!-- Decisions made during this refactor -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-user install default | Avoid admin requirement for enterprise | — Pending |
| Zustand slices pattern | Standard approach for large stores | — Pending |

---
*Last updated: 2026-01-16 after initialization*
