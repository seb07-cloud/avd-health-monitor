# AVD Health Monitor

## What This Is

Windows system tray application for real-time Azure Virtual Desktop (AVD) endpoint health monitoring. Built with Tauri 2 (Rust backend) and React/TypeScript frontend. Monitors network connectivity to AVD-required endpoints and FSLogix storage paths. Features per-user installation for enterprise deployment without admin privileges.

## Core Value

Reliable, unobtrusive AVD endpoint monitoring that helps IT admins identify connectivity issues before users experience problems.

## Requirements

### Validated

- TCP/HTTP/HTTPS latency testing to AVD endpoints — existing
- Session Host and End User monitoring modes — existing
- FSLogix storage path monitoring — existing
- Dynamic system tray icon reflecting health status — existing
- Desktop notifications for endpoint failures — existing
- Customizable latency thresholds — existing
- Custom endpoint support — existing
- Latency history with graphs — existing
- Auto-start on Windows login — existing
- Dark/light theme support — existing
- Per-user installation without admin privileges — v1.0
- WiX MSI compilation — v1.0
- NSIS installer builds — v1.0
- Per-user or system-wide install choice — v1.0
- SettingsPanel component refactor (5 components) — v1.0
- Zustand slice architecture (4 slices) — v1.0
- Race condition elimination (setTimeout removal) — v1.0
- Rust-to-TypeScript type unification — v1.0
- Settings JSON schema validation — v1.0
- Portable mode OS API permission check — v1.0
- Path traversal prevention — v1.0
- Settings roundtrip tests — v1.0
- Mode switching tests — v1.0
- Store slice unit tests — v1.0
- FSLogix path parsing tests — v1.0
- Tray icon state tests — v1.0
- Settings export to JSON — v1.0
- Settings import from JSON — v1.0
- Latency history CSV export — v1.0
- Offline mode indicator — v1.0

### Active

(None — define requirements for next milestone)

### Out of Scope

- Mobile app — desktop-only tool
- Cloud sync — local-first design
- Multi-language support — English only for now
- macOS/Linux installer fixes — Windows is primary target

## Context

**Current state:** Shipped v1.0 with 9,537 LOC (TypeScript + Rust).

**Tech stack:** Tauri 2, React 19, TypeScript 5, Rust 1.75+, Zustand 5, Recharts, TailwindCSS.

**Codebase health:**
- 121 tests passing (86 frontend unit + 25 integration + 10 Rust)
- CI runs type drift detection on all PRs
- JSON schema validation on settings load
- 4 Zustand slices for maintainable state

**v2 candidates (from requirements archive):**
- E2E tests with Tauri test driver
- Visual regression tests
- Performance benchmarks
- Scheduled reports via email
- Multi-endpoint batch import
- Endpoint groups/tags

## Constraints

- **Tech stack**: Tauri 2, React 19, TypeScript, Rust — no framework changes
- **Platform**: Windows primary (10/11), macOS/Linux secondary
- **Compatibility**: Must not break existing user settings/data
- **Build**: Must work in GitHub Actions CI

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Per-user install default | Avoid admin requirement for enterprise | Good |
| Zustand slices pattern | Standard approach for large stores | Good |
| NSIS for per-user, WiX for system-wide | Different deployment scenarios | Good |
| ts-rs for type generation | Compile-time type safety | Good |
| faccess for portable detection | No test file creation | Good |
| JSON schema validation | Descriptive error messages | Good |
| Consecutive failure threshold for offline | Avoid false positives | Good |

---
*Last updated: 2026-01-16 after v1.0 milestone*
