# External Integrations

**Analysis Date:** 2026-01-16

## Overview

AVD Health Monitor is a self-contained desktop application that monitors network connectivity to Azure Virtual Desktop endpoints. It does not integrate with external APIs for its core functionality - it performs network tests directly and stores all data locally.

## Network Testing (Core Functionality)

**TCP Latency Testing:**
- Implementation: `src-tauri/src/latency.rs`
- Uses Tokio `TcpStream::connect()` with 5-second timeout
- Measures connection establishment time to endpoints
- Supports custom ports (default: 443)

**HTTP/HTTPS Latency Testing:**
- Implementation: `src-tauri/src/latency.rs`
- Uses reqwest client with 10-second timeout
- Sends GET request and measures response time
- Any HTTP response (including 4xx/5xx) counts as successful connection

**Monitored Endpoints (Azure Virtual Desktop):**
- Session Host mode endpoints: `src-tauri/resources/sessionhost-endpoints.json`
- End User mode endpoints: `src-tauri/resources/enduser-endpoints.json`
- Source: [Microsoft AVD Required Endpoints](https://learn.microsoft.com/en-us/azure/virtual-desktop/required-fqdn-endpoint)

**Key Azure Endpoints Monitored:**
- `login.microsoftonline.com` - Azure AD authentication
- `*.wvd.microsoft.com` - AVD services (rdgateway, rdweb, client, rdbroker)
- `catalogartifact.azureedge.net` - Azure Marketplace
- `mrsglobalsteus2prod.blob.core.windows.net` - Agent updates
- `gcs.prod.monitoring.core.windows.net` - Azure Monitor
- `azkms.core.windows.net:1688` - Windows KMS activation

## Data Storage

**Local Storage Only:**
- Settings: JSON file in `%APPDATA%\AVDHealthMonitor\` (Windows)
- Latency history: Browser localStorage via Zustand persist middleware
- Logs: `%APPDATA%\AVDHealthMonitor\logs\` (file logging via `src-tauri/src/logger.rs`)

**No External Database:**
- All data stored locally on the user's machine
- No cloud sync or remote storage

**No File Storage Services:**
- Local filesystem only

**No Caching Services:**
- In-memory state via Zustand
- localStorage for persistence across sessions
- 24-hour retention for latency history

## Windows System Integrations

**Windows Registry (Read):**
- FSLogix paths: `HKLM\SOFTWARE\FSLogix\Profiles\VHDLocations`
- FSLogix ODFC: `HKLM\SOFTWARE\Policies\FSLogix\ODFC\VHDLocations`
- Implementation: `src-tauri/src/fslogix.rs`

**Windows Registry (Write):**
- Auto-start: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run`
- Implementation: `src-tauri/src/autostart.rs`

**System Tray:**
- Dynamic icon generation based on latency status
- Implementation: `src-tauri/src/tray_icon.rs`
- Uses Tauri tray-icon feature

**System Notifications:**
- Windows toast notifications via `tauri-plugin-notification`
- Triggered on consecutive endpoint failures (configurable threshold)

## Authentication & Identity

**No Authentication Required:**
- Application is self-contained
- No user login or account system
- No external identity provider integration

## Monitoring & Observability

**Error Tracking:**
- Local file logging only (`src-tauri/src/logger.rs`)
- No external error tracking service (Sentry, etc.)

**Logs:**
- Written to `%APPDATA%\AVDHealthMonitor\logs\`
- 30-day retention (configurable)
- Console logging in development

**No Telemetry:**
- Application does not send usage data externally
- All monitoring data stays on local machine

## CI/CD & Deployment

**GitHub Actions:**
- CI workflow: `.github/workflows/ci.yml`
- Runs on: `ubuntu-latest` (Release Please), `windows-latest` (build)
- Triggers: Push to main, PRs

**Release Process:**
- Release Please: Automated version bumping and changelog
- Config: `.release-please-config.json`
- Creates GitHub releases with MSI, NSIS, and portable ZIP

**WinGet Publishing:**
- Workflow: `.github/workflows/winget-publish.yml`
- Package ID: `seb07-cloud.AVDHealthMonitor`
- Uses `vedantmgoyal9/winget-releaser@v2`
- Requires `WINGET_TOKEN` secret (GitHub PAT)

**Hosting:**
- GitHub Releases for distribution
- WinGet community repository

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

**Tauri IPC Events (Internal):**
- `tray-pause-clicked` - Pause/resume monitoring
- `tray-test-clicked` - Trigger immediate test
- `tray-settings-clicked` - Open settings panel

## Environment Configuration

**Required Secrets (CI only):**
- `GITHUB_TOKEN` - Default GitHub Actions token
- `WINGET_TOKEN` - PAT for WinGet publishing (public_repo scope)

**No Runtime Secrets:**
- Application does not require API keys or secrets
- All network tests are unauthenticated TCP/HTTP connections

## Third-Party Services Summary

| Service | Purpose | Integration Type |
|---------|---------|------------------|
| Azure AD | Endpoint monitoring target | TCP/HTTPS connectivity test |
| Azure Blob Storage | Endpoint monitoring target | TCP/HTTPS connectivity test |
| Azure Files (FSLogix) | SMB connectivity monitoring | TCP port 445 test |
| GitHub Actions | CI/CD | Workflow automation |
| GitHub Releases | Distribution | Release artifacts |
| WinGet | Distribution | Package publishing |

## Security Considerations

**Network Access:**
- Outbound TCP/HTTP(S) connections only
- Tests connectivity to user-configured endpoints
- No inbound network listeners

**Local Access:**
- Reads/writes to AppData directory
- Reads Windows Registry (FSLogix paths, autostart check)
- Writes to Windows Registry (autostart enable/disable)

**No Sensitive Data:**
- Does not handle credentials
- Does not store sensitive user data
- Latency metrics only

---

*Integration audit: 2026-01-16*
