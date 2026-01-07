# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working with this repository.

## Project Overview

AVD Health Monitor is a Windows system tray application for real-time Azure Virtual Desktop (AVD) endpoint health monitoring. Built with Tauri 2 (Rust backend) and React/TypeScript frontend.

## Tech Stack

- **Frontend**: React 18, TypeScript 5, TailwindCSS 3, Recharts (graphs), Zustand (state)
- **Backend**: Tauri 2, Rust 1.75+, Tokio (async), reqwest (HTTP)
- **Build**: pnpm, Vite, Cargo

## Project Structure

```
src/                          # React/TypeScript frontend
├── components/
│   ├── Dashboard.tsx         # Main monitoring view
│   ├── EndpointCard.tsx      # Individual endpoint display
│   ├── EndpointTile.tsx      # Compact endpoint tile
│   ├── FSLogixSection.tsx    # FSLogix storage monitoring
│   ├── SettingsPanel.tsx     # Configuration UI
│   └── ErrorBoundary.tsx     # Error handling wrapper
├── hooks/
│   ├── useTrayIcon.ts        # Tray icon + notifications
│   └── useSettingsSync.ts    # Settings file synchronization
├── store/
│   └── useAppStore.ts        # Global Zustand state
├── services/
│   ├── latencyService.ts     # Latency testing service
│   └── fslogixService.ts     # FSLogix service
└── types.ts                  # TypeScript definitions

src-tauri/                    # Rust backend
├── src/
│   ├── lib.rs                # Main Tauri app + commands
│   ├── main.rs               # Entry point
│   ├── latency.rs            # TCP/HTTP latency testing
│   ├── settings.rs           # Settings + endpoint file management
│   ├── tray_icon.rs          # Dynamic icon generation
│   ├── logger.rs             # File logging
│   ├── autostart.rs          # Windows Registry auto-start
│   └── fslogix.rs            # FSLogix registry detection
├── resources/
│   ├── settings.json         # Default settings
│   ├── sessionhost-endpoints.json
│   └── enduser-endpoints.json
└── tauri.conf.json           # Tauri configuration
```

## Common Commands

```powershell
# Install dependencies
pnpm install

# Run in development mode (hot reload)
pnpm tauri dev

# Build for production (outputs MSI + EXE)
pnpm tauri build

# Frontend tests
pnpm test:run

# Rust tests
cd src-tauri && cargo test

# Type checking
pnpm exec tsc --noEmit
```

## Key Concepts

### Application Modes
- **Session Host Mode**: For AVD session host VMs - monitors agent, RD Gateway, Windows activation endpoints
- **End User Device Mode**: For client devices - monitors Remote Desktop client, Azure AD endpoints

### Latency Testing
- Rust backend performs TCP/HTTP/HTTPS latency tests via `src-tauri/src/latency.rs`
- Frontend invokes via Tauri commands defined in `src-tauri/src/lib.rs`
- Results stored in Zustand store (`src/store/useAppStore.ts`)

### FSLogix Monitoring (Session Host only)
- Reads FSLogix paths from Windows Registry (`HKLM\SOFTWARE\FSLogix\Profiles`)
- Tests SMB connectivity to storage endpoints on port 445
- Implemented in `src-tauri/src/fslogix.rs`

### System Tray
- Dynamic color-coded icon based on worst endpoint status
- Icon generation in `src-tauri/src/tray_icon.rs`
- Tray menu actions: Show Dashboard, Pause/Resume, Test Now, Settings, Exit

### Settings Storage
- Settings: `%APPDATA%\AVDHealthMonitor\settings.json`
- Logs: `%APPDATA%\AVDHealthMonitor\logs\`
- Managed by `src-tauri/src/settings.rs`

## Tauri Commands (Rust → Frontend)

Key commands exposed from Rust to frontend (defined in `src-tauri/src/lib.rs`):
- `test_latency` - Test endpoint latency
- `get_settings` / `save_settings` - Settings management
- `get_endpoints` / `save_endpoints` - Endpoint management
- `set_tray_icon` - Update tray icon color
- `get_fslogix_paths` - Read FSLogix registry paths
- `test_fslogix_connectivity` - Test FSLogix storage connectivity

## State Management

Zustand store in `src/store/useAppStore.ts` manages:
- `endpoints` - List of monitored endpoints with latency history
- `settings` - Application settings (thresholds, intervals, theme)
- `isPaused` - Monitoring pause state
- `fslogixPaths` - FSLogix storage paths and status

## Testing

- Frontend tests use Vitest (`src/lib/utils.test.ts`, `src/store/useAppStore.test.ts`)
- Test setup in `src/test/setup.ts`
- Run with `pnpm test:run`

## CI/CD

- `.github/workflows/ci.yml` - Build and test on push/PR
- Release Please for automated versioning (`.release-please-config.json`)
