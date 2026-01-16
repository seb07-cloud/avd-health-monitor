---
phase: 1-installer-fixes
verified: 2026-01-16T19:30:00Z
status: human_needed
score: 2/4 must-haves verified programmatically
must_haves:
  truths:
    - "User can install app without admin prompt (per-user mode)"
    - "MSI builds successfully in CI"
    - "NSIS builds successfully in CI"
    - "Installer offers per-user or system-wide choice"
  artifacts:
    - path: "src-tauri/tauri.conf.json"
      provides: "NSIS and WiX installer configuration"
    - path: ".github/workflows/ci.yml"
      provides: "CI workflow with explicit bundle targets"
  key_links:
    - from: "tauri.conf.json"
      to: "NSIS installer"
      via: "installMode: currentUser"
    - from: "ci.yml"
      to: "tauri build"
      via: "--bundles nsis,msi flag"
human_verification:
  - test: "Trigger a release and verify MSI builds successfully"
    expected: "MSI file appears in release assets"
    why_human: "Requires actual CI run on windows-latest runner"
  - test: "Trigger a release and verify NSIS builds successfully"
    expected: "NSIS exe appears in release assets"
    why_human: "Requires actual CI run on windows-latest runner"
  - test: "Install NSIS installer on Windows without admin"
    expected: "Installation completes without UAC prompt"
    why_human: "Requires running installer on actual Windows machine"
---

# Phase 1: Installer Fixes Verification Report

**Phase Goal:** Application installs without admin privileges, reliable builds
**Verified:** 2026-01-16T19:30:00Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can install app without admin prompt (per-user mode) | CONFIGURED | `installMode: "currentUser"` in tauri.conf.json:48 |
| 2 | MSI builds successfully in CI | ? NEEDS HUMAN | CI configured but no build run verified |
| 3 | NSIS builds successfully in CI | ? NEEDS HUMAN | CI configured but no build run verified |
| 4 | Installer offers per-user or system-wide choice | VERIFIED | NSIS (per-user) + MSI (system-wide) dual strategy |

**Score:** 2/4 truths verified programmatically (2 need human verification of actual builds)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src-tauri/tauri.conf.json` | NSIS + WiX config | VERIFIED | Lines 47-54: nsis.installMode=currentUser, wix.language=en-US |
| `.github/workflows/ci.yml` | Explicit bundle targets | VERIFIED | Line 77: `--bundles nsis,msi` |

### Artifact Verification Details

#### src-tauri/tauri.conf.json

**Level 1 - Exists:** VERIFIED
**Level 2 - Substantive:** VERIFIED (57 lines, valid JSON, complete config)
**Level 3 - Wired:** VERIFIED (used by Tauri build system)

Key content verified:
```json
"targets": ["nsis", "msi"],
"windows": {
  "nsis": {
    "installMode": "currentUser",
    "compression": "lzma"
  },
  "wix": {
    "language": "en-US"
  }
}
```

#### .github/workflows/ci.yml

**Level 1 - Exists:** VERIFIED
**Level 2 - Substantive:** VERIFIED (127 lines, no syntax errors)
**Level 3 - Wired:** VERIFIED (triggers on push to main)

Key content verified:
```yaml
# Line 77
run: pnpm tauri build --bundles nsis,msi

# Lines 73-75 (documentation)
# - NSIS: Per-user install (no admin required) - installs to AppData
# - MSI: System-wide install (admin required) - for enterprise deployment
# Note: WiX (MSI) requires VBSCRIPT Windows feature enabled

# Lines 91, 122 (upload messages)
echo "Uploading MSI (system-wide, admin required): $MSI_FILE"
echo "Uploading NSIS (per-user, no admin): $NSIS_FILE"
```

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| tauri.conf.json | NSIS build | bundle.windows.nsis | WIRED | installMode: currentUser configures per-user install |
| tauri.conf.json | MSI build | bundle.windows.wix | WIRED | language: en-US, defaults to perMachine |
| ci.yml | tauri build | pnpm tauri build | WIRED | --bundles nsis,msi explicitly requests both |
| ci.yml | release upload | gh release upload | WIRED | Uploads MSI, NSIS, and portable ZIP |

### Requirements Coverage

| Requirement | Status | Supporting Evidence |
|-------------|--------|---------------------|
| INST-01: Per-user install without admin | CONFIGURED | nsis.installMode=currentUser |
| INST-02: WiX MSI compilation succeeds | ? NEEDS HUMAN | Configured, needs build verification |
| INST-03: NSIS installer builds successfully | ? NEEDS HUMAN | Configured, needs build verification |
| INST-04: Per-user or system-wide choice | VERIFIED | NSIS=per-user, MSI=system-wide |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| - | - | None found | - | - |

No stub patterns, TODOs, or placeholder content found in modified files.

### Human Verification Required

The configuration is complete and correctly structured, but actual build verification requires:

### 1. MSI Build Verification

**Test:** Trigger a release (via Release Please or manual tag) and check CI logs
**Expected:** 
- Build step completes without errors
- MSI file appears in `src-tauri/target/release/bundle/msi/`
- MSI is uploaded to GitHub release
**Why human:** Requires actual CI execution on windows-latest runner. The configuration is correct but WiX compilation could fail due to VBSCRIPT or other Windows-specific issues.

### 2. NSIS Build Verification

**Test:** Trigger a release and check CI logs
**Expected:**
- Build step completes without errors
- NSIS exe appears in `src-tauri/target/release/bundle/nsis/`
- NSIS installer is uploaded to GitHub release
**Why human:** Requires actual CI execution. NSIS is more reliable than WiX but still needs verification.

### 3. Per-User Installation Verification

**Test:** Download NSIS installer from release, run on Windows machine (not as admin)
**Expected:**
- No UAC elevation prompt appears
- Installation completes successfully
- App installed to `%LOCALAPPDATA%\Programs\` or similar user-writable location
**Why human:** Cannot programmatically verify actual installation behavior without running the installer.

### 4. System-Wide Installation Verification

**Test:** Download MSI installer, run on Windows machine
**Expected:**
- UAC elevation prompt appears (expected for system-wide)
- Installation completes when admin credentials provided
- App installed to `C:\Program Files\` or similar system location
**Why human:** Verifies MSI behaves as expected for enterprise deployment.

## Summary

**Configuration Status:** All installer configuration is correctly in place:
- tauri.conf.json has NSIS with `installMode: currentUser` (per-user, no admin)
- tauri.conf.json has WiX with `language: en-US` (system-wide, admin required)
- CI workflow has `--bundles nsis,msi` with documentation
- Upload step describes installer types in logs

**What's Verified Programmatically:**
1. Configuration files exist and are syntactically valid
2. NSIS is configured for currentUser mode (enables no-admin install)
3. Both installer types are targeted in build
4. CI workflow is properly wired to build and upload both formats

**What Needs Human Verification:**
1. Actual CI build succeeds (especially WiX which has VBSCRIPT dependency)
2. NSIS installer actually installs without admin prompt
3. MSI installer works for enterprise deployment scenario

**Recommendation:** Create a test release (e.g., tag v0.7.1-test) to trigger CI and verify builds complete successfully. Then test the installers on a Windows machine.

---

*Verified: 2026-01-16T19:30:00Z*
*Verifier: Claude (gsd-verifier)*
