# Codebase Structure

**Analysis Date:** 2026-01-16

## Directory Layout

```
avd-health-monitor/
├── src/                      # React/TypeScript frontend
│   ├── components/           # UI components
│   ├── hooks/                # Custom React hooks
│   ├── services/             # Tauri IPC service wrappers
│   ├── store/                # Zustand state management
│   ├── lib/                  # Utility functions
│   ├── test/                 # Test setup
│   ├── assets/               # Static assets
│   ├── App.tsx               # Main application component
│   ├── main.tsx              # React entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── errors.ts             # Error classes and handling
│   ├── index.css             # Global styles (Tailwind)
│   └── vite-env.d.ts         # Vite type declarations
├── src-tauri/                # Rust/Tauri backend
│   ├── src/                  # Rust source files
│   │   ├── lib.rs            # Main Tauri app + commands
│   │   ├── main.rs           # Entry point
│   │   ├── latency.rs        # Network latency testing
│   │   ├── settings.rs       # Settings/endpoint file management
│   │   ├── tray_icon.rs      # Dynamic icon generation
│   │   ├── fslogix.rs        # FSLogix registry reading
│   │   ├── autostart.rs      # Windows auto-start
│   │   └── logger.rs         # Log directory management
│   ├── resources/            # Bundled JSON files
│   ├── capabilities/         # Tauri security capabilities
│   ├── icons/                # App icons (ico, icns, png)
│   ├── Cargo.toml            # Rust dependencies
│   ├── tauri.conf.json       # Tauri configuration
│   └── build.rs              # Build script
├── public/                   # Static web assets
├── media/                    # Documentation images
├── .planning/                # GSD planning documents
│   └── codebase/             # Codebase analysis docs
├── .github/                  # GitHub workflows
│   └── workflows/            # CI/CD definitions
├── .vscode/                  # VS Code settings
├── package.json              # Node.js dependencies
├── pnpm-lock.yaml            # pnpm lockfile
├── vite.config.ts            # Vite build configuration
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── vitest.config.ts          # Vitest test configuration
└── CLAUDE.md                 # AI assistant instructions
```

## Directory Purposes

**`src/` (Frontend):**
- Purpose: React application source code
- Contains: Components, hooks, services, state management, types
- Key files: `App.tsx` (main component), `types.ts` (shared types)

**`src/components/`:**
- Purpose: Reusable React UI components
- Contains: Dashboard, EndpointTile, EndpointCard, SettingsPanel, FSLogixSection, ErrorBoundary
- Key files: `Dashboard.tsx` (main monitoring view), `SettingsPanel.tsx` (configuration UI)

**`src/hooks/`:**
- Purpose: Custom React hooks for cross-cutting concerns
- Contains: `useTrayIcon.ts` (tray icon + notifications), `useSettingsSync.ts` (settings loading)
- Key files: Both hooks are critical for app functionality

**`src/services/`:**
- Purpose: Abstractions over Tauri IPC calls
- Contains: `latencyService.ts`, `fslogixService.ts`
- Key files: These wrap `invoke()` calls with proper typing and error handling

**`src/store/`:**
- Purpose: Zustand global state management
- Contains: `useAppStore.ts` (main store), `useAppStore.test.ts` (tests)
- Key files: `useAppStore.ts` is the single source of truth for app state

**`src/lib/`:**
- Purpose: Utility functions shared across components
- Contains: `utils.ts` (cn, status helpers, validation), `utils.test.ts`
- Key files: `utils.ts` contains latency status calculation logic

**`src-tauri/src/` (Backend):**
- Purpose: Rust backend implementation
- Contains: Tauri commands, system integrations
- Key files: `lib.rs` (commands), `latency.rs` (network testing), `settings.rs` (file I/O)

**`src-tauri/resources/`:**
- Purpose: Bundled configuration files
- Contains: Default endpoint JSONs for sessionhost and enduser modes
- Key files: `sessionhost-endpoints.json`, `enduser-endpoints.json`, `settings.json`

## Key File Locations

**Entry Points:**
- `src/main.tsx`: React app entry, renders `<App />`
- `src-tauri/src/main.rs`: Rust entry, calls `run()`
- `src-tauri/src/lib.rs`: Tauri app builder, command registration

**Configuration:**
- `src-tauri/tauri.conf.json`: Tauri app config (window, bundle, security)
- `src-tauri/Cargo.toml`: Rust dependencies
- `package.json`: Node.js dependencies, scripts
- `vite.config.ts`: Vite dev server and build settings
- `tailwind.config.js`: Tailwind theme customization

**Core Logic:**
- `src/App.tsx`: Main app component, test loop orchestration
- `src/store/useAppStore.ts`: Global state, persistence, actions
- `src-tauri/src/latency.rs`: TCP/HTTP latency measurement
- `src-tauri/src/settings.rs`: Settings and endpoint file management

**Testing:**
- `src/test/setup.ts`: Vitest setup with Tauri mocks
- `src/lib/utils.test.ts`: Utility function tests
- `src/store/useAppStore.test.ts`: Store action tests
- `src-tauri/src/*.rs`: Rust tests in `#[cfg(test)]` modules

## Naming Conventions

**Files:**
- React components: PascalCase.tsx (e.g., `Dashboard.tsx`, `EndpointTile.tsx`)
- Hooks: camelCase with `use` prefix (e.g., `useTrayIcon.ts`)
- Services: camelCase with `Service` suffix (e.g., `latencyService.ts`)
- Rust modules: snake_case.rs (e.g., `tray_icon.rs`, `fslogix.rs`)
- Test files: `.test.ts` suffix (e.g., `utils.test.ts`)

**Directories:**
- Lowercase, plural for collections: `components/`, `hooks/`, `services/`
- Singular for domain: `store/`, `lib/`
- Rust standard: `src/` inside `src-tauri/`

**Code:**
- TypeScript: camelCase functions/variables, PascalCase types/interfaces
- Rust: snake_case functions/variables, PascalCase types/structs
- JSON config: camelCase (frontend), snake_case (backend serde)

## Where to Add New Code

**New UI Component:**
- Primary code: `src/components/NewComponent.tsx`
- Import in: `src/App.tsx` or parent component
- Follow: Existing component patterns (hooks at top, conditional rendering)

**New Tauri Command:**
- Rust implementation: Add function in `src-tauri/src/lib.rs` or new module
- Register: Add to `invoke_handler` in `lib.rs` `run()` function
- Frontend service: Add wrapper in `src/services/` or create new service

**New Store Action:**
- Implementation: `src/store/useAppStore.ts` in the store creator
- Type: Add to `AppState` interface
- Consider: Persistence via `partialize` if needed

**New Hook:**
- Implementation: `src/hooks/useNewHook.ts`
- Pattern: Follow `useTrayIcon.ts` structure (refs for state, useEffect for lifecycle)
- Use in: `src/App.tsx` or relevant component

**New Rust Module:**
- Implementation: `src-tauri/src/newmodule.rs`
- Import: Add `mod newmodule;` in `lib.rs`
- Exports: Use `use newmodule::function;` in `lib.rs`

**New Endpoint Category:**
- Session host: Edit `src-tauri/resources/sessionhost-endpoints.json`
- End user: Edit `src-tauri/resources/enduser-endpoints.json`
- Format: Follow existing category structure with `name`, `description`, `endpoints` array

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Error handling: `src/errors.ts`
- Add tests: Corresponding `.test.ts` file

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: By GSD mapper commands
- Committed: Yes

**`src-tauri/target/`:**
- Purpose: Rust build artifacts
- Generated: Yes (by cargo)
- Committed: No (in .gitignore)

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (by pnpm build)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Node.js dependencies
- Generated: Yes (by pnpm install)
- Committed: No (in .gitignore)

**`src-tauri/resources/`:**
- Purpose: Files bundled with the application
- Generated: No (hand-authored)
- Committed: Yes
- Note: Copied to `%APPDATA%\AVDHealthMonitor\` on first run

---

*Structure analysis: 2026-01-16*
