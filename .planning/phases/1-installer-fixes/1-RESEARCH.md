# Phase 1: Installer Fixes - Research

**Researched:** 2026-01-16
**Domain:** Tauri 2 Windows Installer Configuration (WiX/NSIS)
**Confidence:** HIGH

## Summary

This research covers the implementation of per-user installation and reliable WiX/NSIS builds for the AVD Health Monitor Tauri 2 application. The key finding is that Tauri 2's NSIS installer natively supports per-user installation via the `installMode` configuration, while WiX MSI requires a custom template to achieve per-user installation scope.

The recommended approach is:
1. Use NSIS as the primary installer for per-user installation (no admin required)
2. Use WiX MSI for system-wide/enterprise deployment (admin required)
3. Configure both to build in CI, offering users a choice

**Primary recommendation:** Configure NSIS with `installMode: "currentUser"` for per-user installs. Optionally create a custom WiX template with `InstallScope="perUser"` if MSI per-user is required, or accept MSI as admin-only system-wide installer.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Tauri Bundler | 2.x | Builds installers from Tauri app | Official Tauri tooling |
| NSIS | 3.x | Creates .exe installers | Tauri default, supports per-user |
| WiX Toolset | 3.x | Creates .msi installers | Tauri default for MSI |

### Supporting
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| Handlebars | N/A | Template engine for WiX | Custom WiX templates |
| WebView2 | Latest | Runtime dependency | All Windows apps |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WiX custom template | NSIS only | Lose MSI format for enterprise deployment |
| NSIS per-user | WiX per-user | WiX per-user requires custom template maintenance |
| Both installers | Single format | More maintenance but better user choice |

**No installation required** - all tooling comes with Tauri CLI.

## Architecture Patterns

### Recommended Configuration Structure

The installer configuration goes in `src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "targets": ["nsis", "msi"],
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      },
      "wix": {
        "template": "./windows/main.wxs"
      }
    }
  }
}
```

### Pattern 1: NSIS Per-User Installation (Recommended)

**What:** Configure NSIS to install to user's AppData without admin
**When to use:** Default installer for end users
**Example:**
```json
// Source: https://v2.tauri.app/distribute/windows-installer/
{
  "bundle": {
    "windows": {
      "nsis": {
        "installMode": "currentUser"
      }
    }
  }
}
```

### Pattern 2: NSIS Both Modes (User Choice)

**What:** Let user choose per-user or per-machine at install time
**When to use:** When flexibility is needed but admin prompt is acceptable
**Example:**
```json
// Source: https://docs.rs/tauri-utils/latest/tauri_utils/config/enum.NSISInstallerMode.html
{
  "bundle": {
    "windows": {
      "nsis": {
        "installMode": "both"
      }
    }
  }
}
```
**Note:** The "both" mode STILL requires admin privileges even for per-user installation.

### Pattern 3: Custom WiX Template for Per-User MSI

**What:** Use custom .wxs template with `InstallScope="perUser"`
**When to use:** When MSI format is required without admin privileges
**Example Package element:**
```xml
<!-- Source: https://github.com/tauri-apps/tauri/issues/13792 -->
<Package
  Id="*"
  Keywords="Installer"
  InstallerVersion="450"
  Languages="0"
  Compressed="yes"
  InstallScope="perUser"
  InstallPrivileges="limited"
  SummaryCodepage="!(loc.TauriCodepage)" />
```

### Anti-Patterns to Avoid
- **Using WiX default for per-user:** WiX default is `perMachine`, requires admin
- **Setting NSIS "both" expecting no admin:** "both" mode always requires admin elevation
- **Mixing per-user install with Program Files:** Per-user must use AppData paths

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Per-user installation | Custom installer script | NSIS `installMode: "currentUser"` | Handles registry, shortcuts, uninstall automatically |
| Installer UI | Custom dialog code | NSIS/WiX built-in dialogs | Localization, accessibility, consistent UX |
| WebView2 distribution | Manual download logic | `webviewInstallMode` config | Handles all edge cases, offline scenarios |
| Uninstall logic | Custom uninstaller | Bundler auto-generates | Clean uninstall with registry cleanup |
| Start Menu shortcuts | Manual registry/file ops | Built into both installers | Proper cleanup on uninstall |

**Key insight:** Tauri's bundler handles Windows installation complexity. Custom solutions introduce maintenance burden and edge cases.

## Common Pitfalls

### Pitfall 1: WiX "failed to run light.exe" Error
**What goes wrong:** MSI build fails with light.exe error
**Why it happens:** VBSCRIPT Windows optional feature is disabled
**How to avoid:** Enable VBSCRIPT in Windows Features before build
**Warning signs:** Error message mentions "failed to run light.exe"
**Resolution:**
- Settings > Apps > Optional features > More Windows features
- Enable VBSCRIPT
- Note: VBSCRIPT is being deprecated by Microsoft, may cause future issues

### Pitfall 2: NSIS "both" Mode Requires Admin
**What goes wrong:** Users expect no admin prompt with "both" mode
**Why it happens:** Misunderstanding of `installMode: "both"` semantics
**How to avoid:** Use `installMode: "currentUser"` for true no-admin install
**Warning signs:** Users report admin prompt despite "per-user" option

### Pitfall 3: Custom WiX Template Maintenance
**What goes wrong:** Custom template breaks on Tauri updates
**Why it happens:** Tauri's default template uses handlebars variables that may change
**How to avoid:**
- Pin to specific Tauri version
- Document all handlebars variables used
- Test template after every Tauri upgrade
**Warning signs:** Build failures after Tauri CLI update

### Pitfall 4: Application Name Case Sensitivity (NSIS)
**What goes wrong:** Build fails with "No such file or directory"
**Why it happens:** NSIS expects specific binary name casing
**How to avoid:** Ensure `productName` in tauri.conf.json matches expected case
**Warning signs:** Error during NSIS bundling, file not found

### Pitfall 5: 2GB Application Size Limit
**What goes wrong:** Both NSIS and WiX fail for apps > 2GB
**Why it happens:** Fundamental limitation of both installer formats
**How to avoid:** Keep application bundle under 2GB
**Warning signs:** Compiler error during bundling large applications

## Code Examples

Verified patterns from official sources:

### Complete NSIS Per-User Configuration
```json
// Source: https://v2.tauri.app/reference/config/
{
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "publisher": "Sebastian Wild",
    "resources": ["resources/*.json"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/icon.ico"],
    "windows": {
      "nsis": {
        "installMode": "currentUser",
        "compression": "lzma"
      }
    }
  }
}
```

### Complete WiX System-Wide Configuration
```json
// Source: https://v2.tauri.app/reference/config/
{
  "bundle": {
    "active": true,
    "targets": ["msi"],
    "windows": {
      "wix": {
        "language": "en-US"
      }
    }
  }
}
```

### Build Both Installers (CI)
```yaml
# Source: https://v2.tauri.app/distribute/windows-installer/
- name: Build application
  run: pnpm tauri build --bundles nsis,msi
```

### Custom WiX Template for Per-User (If Required)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
  Source: Based on https://github.com/tauri-apps/tauri/blob/dev/crates/tauri-bundler/src/bundle/windows/msi/main.wxs
  Modified for perUser installation
-->
<Wix xmlns="http://schemas.microsoft.com/wix/2006/wi">
  <Product
    Id="*"
    Name="{{product_name}}"
    UpgradeCode="{{upgrade_code}}"
    Language="!(loc.TauriLanguage)"
    Manufacturer="{{manufacturer}}"
    Version="{{version}}">

    <Package
      Id="*"
      Keywords="Installer"
      InstallerVersion="450"
      Languages="0"
      Compressed="yes"
      InstallScope="perUser"
      InstallPrivileges="limited"
      SummaryCodepage="!(loc.TauriCodepage)" />

    <!-- Directory structure for perUser installation -->
    <Directory Id="TARGETDIR" Name="SourceDir">
      <Directory Id="LocalAppDataFolder">
        <Directory Id="APPLICATIONFOLDER" Name="{{product_name}}" />
      </Directory>
      <Directory Id="DesktopFolder" Name="Desktop" />
      <Directory Id="ProgramMenuFolder" />
    </Directory>

    <!-- Rest of template follows Tauri default structure -->
    <!-- ... -->
  </Product>
</Wix>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WiX v3 only | WiX v3 + NSIS | Tauri 1.x | NSIS recommended for per-user |
| Manual installer scripts | Tauri bundler | Tauri 1.0 | Simplified Windows distribution |
| Per-machine default | Per-user NSIS default | Tauri 2.0 | Better user experience |

**Deprecated/outdated:**
- WiX perUser via config: Not supported, requires custom template (as of 2025-07)
- Cross-compiling MSI on Linux: Not possible, WiX requires Windows

## Open Questions

Things that couldn't be fully resolved:

1. **WiX perUser native support timeline**
   - What we know: Feature requested (GitHub #13792), no ETA
   - What's unclear: Whether Tauri team will implement or require custom templates long-term
   - Recommendation: Use NSIS for per-user, accept WiX as admin-only for now

2. **VBSCRIPT deprecation impact**
   - What we know: Microsoft deprecating VBSCRIPT, required for WiX builds
   - What's unclear: When it will be fully removed from Windows
   - Recommendation: Monitor Windows updates, ensure CI runners have VBSCRIPT enabled

3. **Exact handlebars variables in Tauri 2.x WiX template**
   - What we know: Variables include `{{product_name}}`, `{{manufacturer}}`, `{{version}}`, `{{upgrade_code}}`
   - What's unclear: Complete list without fetching actual template
   - Recommendation: If custom template needed, fetch current template from Tauri repo as base

## Decision Matrix for Requirements

| Requirement | Recommended Approach | Confidence |
|-------------|---------------------|------------|
| INST-01 (Per-user install) | NSIS with `installMode: "currentUser"` | HIGH |
| INST-02 (WiX builds) | Keep WiX as system-wide installer, ensure VBSCRIPT enabled in CI | HIGH |
| INST-03 (NSIS builds) | Standard configuration, already supported | HIGH |
| INST-04 (User choice) | Ship both NSIS (per-user) and MSI (system-wide), let user download preferred | HIGH |

## Sources

### Primary (HIGH confidence)
- [Tauri 2 Windows Installer Documentation](https://v2.tauri.app/distribute/windows-installer/) - Install modes, configuration
- [Tauri 2 Configuration Reference](https://v2.tauri.app/reference/config/) - NsisConfig, WixConfig schemas
- [NsisConfig Rust Docs](https://docs.rs/tauri-utils/latest/tauri_utils/config/struct.NsisConfig.html) - Field definitions
- [WixConfig Rust Docs](https://docs.rs/tauri-utils/latest/tauri_utils/config/struct.WixConfig.html) - Field definitions
- [NSISInstallerMode Rust Docs](https://docs.rs/tauri-utils/latest/tauri_utils/config/enum.NSISInstallerMode.html) - CurrentUser, PerMachine, Both

### Secondary (MEDIUM confidence)
- [GitHub Issue #13792](https://github.com/tauri-apps/tauri/issues/13792) - WiX perUser feature request status
- [Tauri Action Repository](https://github.com/tauri-apps/tauri-action) - CI/CD patterns

### Tertiary (LOW confidence)
- Web search results for WiX custom template patterns - validated against official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Tauri documentation
- Architecture: HIGH - Official configuration reference
- Pitfalls: HIGH - Official docs + verified GitHub issues
- Custom WiX template: MEDIUM - Based on GitHub source, may need verification

**Research date:** 2026-01-16
**Valid until:** 2026-02-16 (30 days - stable Tauri 2.x APIs)
