# Technology Stack

**Analysis Date:** 2026-01-16

## Languages

**Primary:**
- TypeScript 5.8.3 - Frontend UI and state management (`src/`)
- Rust (2021 edition) - Backend/native functionality (`src-tauri/`)

**Secondary:**
- HTML - Single entry point (`index.html`)
- CSS (TailwindCSS) - Styling (`src/**/*.tsx`)

## Runtime

**Environment:**
- Node.js 22+ (specified in CI)
- Tauri 2 runtime (Rust-based desktop app framework)
- Windows primary target (also supports macOS, Linux)

**Package Manager:**
- pnpm 10 (frontend)
- Cargo (Rust backend)
- Lockfiles: `pnpm-lock.yaml`, `Cargo.lock` (both present)

## Frameworks

**Core:**
- Tauri 2.x - Desktop application framework (Rust + webview)
- React 19.1.0 - UI component library
- Vite 7.0.4 - Frontend build tool and dev server

**State Management:**
- Zustand 5.0.9 - Lightweight state management with persistence

**Styling:**
- TailwindCSS 3.4.19 - Utility-first CSS framework
- PostCSS 8 with Autoprefixer - CSS processing

**Testing:**
- Vitest 4.0.16 - Frontend test runner
- happy-dom 20.0.11 - Test environment (DOM simulation)
- Testing Library (React 16.3.1, jest-dom 6.9.1, user-event 14.6.1)
- Cargo test - Rust unit tests

## Key Dependencies

**Frontend Critical:**
- `@tauri-apps/api ^2` - Tauri IPC bridge to Rust backend
- `react ^19.1.0` / `react-dom ^19.1.0` - UI framework
- `zustand ^5.0.9` - State management with localStorage persistence
- `recharts ^3.6.0` - Latency graphs and visualizations
- `lucide-react ^0.562.0` - Icon library
- `clsx ^2.1.1` + `tailwind-merge ^3.4.0` - Conditional class utilities

**Backend (Rust) Critical:**
- `tauri 2` - Desktop app framework with tray-icon, image-ico, image-png features
- `tauri-plugin-notification 2` - System notifications
- `tauri-plugin-dialog 2` - Native dialogs
- `tauri-plugin-shell 2` - Shell command execution
- `tokio 1` - Async runtime (rt-multi-thread, net, time, sync, macros)
- `reqwest 0.12` - HTTP client with rustls-tls
- `serde 1` / `serde_json 1` - JSON serialization
- `chrono 0.4` - Date/time handling
- `parking_lot 0.12` - Synchronization primitives
- `image 0.25` - Dynamic tray icon generation (PNG)
- `once_cell 1.19` - Global static initialization
- `winreg 0.55` - Windows Registry access (Windows-only, for FSLogix/autostart)

## Configuration

**Build Configuration:**
- `vite.config.ts` - Frontend build config, test config (Vitest)
- `tsconfig.json` - TypeScript strict mode, ES2020 target, bundler resolution
- `tailwind.config.js` - Dark mode via class, custom primary color palette
- `postcss.config.js` - TailwindCSS + Autoprefixer plugins
- `src-tauri/Cargo.toml` - Rust dependencies and build profiles
- `src-tauri/tauri.conf.json` - Tauri app config (window, bundle, security CSP)

**Environment Variables:**
- `TAURI_DEV_HOST` - Dev server host for HMR (optional)
- No `.env` file required - all config stored in JSON files

**Application Configuration:**
- Settings: `%APPDATA%\AVDHealthMonitor\settings.json` (Windows installed)
- Settings: `~/.config/avd-health-monitor/settings.json` (macOS/Linux)
- Portable mode: Settings stored next to executable
- Endpoints: `sessionhost-endpoints.json`, `enduser-endpoints.json` (bundled resources)

**Default Settings:**
```json
{
  "version": 1,
  "config": {
    "mode": "sessionhost",
    "testInterval": 180,
    "retentionDays": 30,
    "thresholds": { "excellent": 50, "good": 100, "warning": 150 },
    "notificationsEnabled": false,
    "autoStart": true,
    "theme": "system",
    "alertThreshold": 3,
    "alertCooldown": 5,
    "graphTimeRange": 1
  }
}
```

## Build System

**Development:**
```bash
pnpm install          # Install frontend dependencies
pnpm tauri dev        # Run with hot reload (Vite dev server + Tauri)
```

**Production:**
```bash
pnpm tauri build      # Outputs to src-tauri/target/release/
```

**Build Outputs:**
- MSI installer: `src-tauri/target/release/bundle/msi/*.msi`
- NSIS installer: `src-tauri/target/release/bundle/nsis/*.exe`
- Portable EXE: `src-tauri/target/release/avd-health-monitor.exe`

**Rust Build Profiles:**
- Dev: `opt-level = 1`, incremental builds, dependencies at `opt-level = 3`
- Release: `opt-level = 3`, LTO enabled, single codegen unit, stripped symbols
- Windows: Uses `rust-lld.exe` linker for faster builds

## Platform Requirements

**Development:**
- Node.js 22+
- pnpm 10+
- Rust 1.75+ with stable toolchain
- Windows: MSVC build tools (x86_64-pc-windows-msvc target)

**Production (Windows):**
- Windows 10/11 (x86_64)
- WebView2 runtime (included in Windows 11, auto-installed on Windows 10)
- No administrator rights required for portable mode
- Administrator rights optional for MSI/NSIS install

**Production (macOS/Linux):**
- Builds supported but Windows is primary target
- FSLogix monitoring Windows-only (registry-based)
- Auto-start Windows-only (registry-based)

---

*Stack analysis: 2026-01-16*
