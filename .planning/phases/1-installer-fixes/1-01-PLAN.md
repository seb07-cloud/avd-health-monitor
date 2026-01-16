---
phase: 1-installer-fixes
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/tauri.conf.json
autonomous: true
user_setup: []

must_haves:
  truths:
    - "NSIS installer configured for per-user installation without admin privileges"
    - "WiX MSI configured for system-wide installation (enterprise deployment)"
    - "Both installer formats explicitly defined in bundle configuration"
  artifacts:
    - path: "src-tauri/tauri.conf.json"
      provides: "Installer configuration for NSIS and WiX"
      contains: "installMode"
  key_links:
    - from: "src-tauri/tauri.conf.json"
      to: "bundle.windows.nsis"
      via: "installMode: currentUser"
      pattern: "installMode.*currentUser"
---

<objective>
Configure Tauri installers for per-user and system-wide installation options.

Purpose: Enable users to install AVD Health Monitor without admin privileges (NSIS per-user) while providing enterprise deployment option (WiX MSI system-wide).
Output: Updated tauri.conf.json with explicit NSIS and WiX configuration.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/1-installer-fixes/1-RESEARCH.md

# Key file to modify
@src-tauri/tauri.conf.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Configure NSIS for per-user installation</name>
  <files>src-tauri/tauri.conf.json</files>
  <action>
Add Windows-specific NSIS configuration to the bundle section in tauri.conf.json:

1. Add `windows` object inside `bundle`
2. Add `nsis` object with:
   - `installMode`: "currentUser" (installs to AppData, NO admin required)
   - `compression`: "lzma" (better compression for smaller download)

This enables INST-01 (per-user install without admin).

Reference configuration from research:
```json
"windows": {
  "nsis": {
    "installMode": "currentUser",
    "compression": "lzma"
  }
}
```

DO NOT use `installMode: "both"` - that still requires admin elevation.
  </action>
  <verify>
Run: `cat src-tauri/tauri.conf.json | grep -A3 '"nsis"'` shows installMode: currentUser
  </verify>
  <done>NSIS config exists with installMode: "currentUser" and compression: "lzma"</done>
</task>

<task type="auto">
  <name>Task 2: Add WiX configuration for system-wide installation</name>
  <files>src-tauri/tauri.conf.json</files>
  <action>
Add WiX configuration alongside the NSIS config in the windows object:

1. Add `wix` object with:
   - `language`: "en-US" (standard language setting)

WiX will default to perMachine (system-wide) installation which requires admin.
This is intentional - provides enterprise deployment option via MSI.

The final windows section should look like:
```json
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

Also update `targets` from "all" to explicitly list targets: ["nsis", "msi"]
This ensures only Windows installers are built (not dmg, appimage, etc).
  </action>
  <verify>
Run: `cat src-tauri/tauri.conf.json | grep -A2 '"wix"'` shows language config
Run: `cat src-tauri/tauri.conf.json | grep '"targets"'` shows ["nsis", "msi"]
  </verify>
  <done>WiX config exists, targets explicitly set to ["nsis", "msi"]</done>
</task>

</tasks>

<verification>
After both tasks complete:

1. Validate JSON syntax:
   ```bash
   cd src-tauri && cat tauri.conf.json | python3 -m json.tool > /dev/null && echo "JSON valid"
   ```

2. Verify NSIS config:
   ```bash
   grep -A5 '"nsis"' src-tauri/tauri.conf.json
   ```
   Should show: installMode: "currentUser", compression: "lzma"

3. Verify WiX config:
   ```bash
   grep -A3 '"wix"' src-tauri/tauri.conf.json
   ```
   Should show: language: "en-US"

4. Verify targets:
   ```bash
   grep '"targets"' src-tauri/tauri.conf.json
   ```
   Should show: ["nsis", "msi"]
</verification>

<success_criteria>
- [ ] tauri.conf.json has windows.nsis.installMode = "currentUser"
- [ ] tauri.conf.json has windows.nsis.compression = "lzma"
- [ ] tauri.conf.json has windows.wix.language = "en-US"
- [ ] tauri.conf.json has targets = ["nsis", "msi"]
- [ ] JSON is valid (parseable)
</success_criteria>

<output>
After completion, create `.planning/phases/1-installer-fixes/1-01-SUMMARY.md`
</output>
