---
phase: 1-installer-fixes
plan: 02
type: execute
wave: 2
depends_on: ["1-01"]
files_modified:
  - .github/workflows/ci.yml
autonomous: true
user_setup: []

must_haves:
  truths:
    - "CI builds both NSIS and MSI installers explicitly"
    - "CI workflow documents VBSCRIPT requirement for WiX builds"
    - "Both installer artifacts uploaded to releases"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "CI workflow with explicit bundle targets"
      contains: "--bundles nsis,msi"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "src-tauri/tauri.conf.json"
      via: "pnpm tauri build command"
      pattern: "tauri build"
---

<objective>
Update CI workflow to explicitly build NSIS and MSI installers with documentation.

Purpose: Ensure reliable CI builds of both installer formats with clear documentation of requirements (VBSCRIPT for WiX).
Output: Updated ci.yml with explicit bundle targets and build notes.
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
@.planning/phases/1-installer-fixes/1-01-SUMMARY.md

# Key file to modify
@.github/workflows/ci.yml
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update CI build command with explicit bundle targets</name>
  <files>.github/workflows/ci.yml</files>
  <action>
Modify the "Build application" step in the build-and-upload job:

1. Change `pnpm tauri build` to `pnpm tauri build --bundles nsis,msi`
   This explicitly requests both installer formats, matching tauri.conf.json targets.

2. Add a comment above the build step explaining:
   - NSIS produces per-user installer (no admin required)
   - MSI produces system-wide installer (admin required, for enterprise)
   - WiX (MSI) requires VBSCRIPT Windows feature enabled on runner

The windows-latest runner should have VBSCRIPT available, but the comment
documents the requirement for future troubleshooting.

Find the step:
```yaml
- name: Build application
  run: pnpm tauri build
```

Replace with:
```yaml
# Build both installer types:
# - NSIS: Per-user install (no admin required) - installs to AppData
# - MSI: System-wide install (admin required) - for enterprise deployment
# Note: WiX (MSI) requires VBSCRIPT Windows feature enabled
- name: Build application
  run: pnpm tauri build --bundles nsis,msi
```
  </action>
  <verify>
Run: `grep -A2 "Build application" .github/workflows/ci.yml` shows --bundles nsis,msi
Run: `grep "NSIS.*Per-user" .github/workflows/ci.yml` shows explanatory comment
  </verify>
  <done>CI builds explicitly specify --bundles nsis,msi with documentation comments</done>
</task>

<task type="auto">
  <name>Task 2: Update upload step to clarify installer types</name>
  <files>.github/workflows/ci.yml</files>
  <action>
Update the release upload section to clarify what each installer provides:

1. Add descriptive echo statements that will appear in CI logs:
   - When uploading MSI: "Uploading MSI (system-wide installer, requires admin)"
   - When uploading NSIS: "Uploading NSIS (per-user installer, no admin required)"

Find the upload section and update the echo statements:

For MSI upload, change:
  `echo "Uploading MSI: $MSI_FILE"`
to:
  `echo "Uploading MSI (system-wide, admin required): $MSI_FILE"`

For NSIS upload, change:
  `echo "Uploading NSIS: $NSIS_FILE"`
to:
  `echo "Uploading NSIS (per-user, no admin): $NSIS_FILE"`

This helps users and maintainers understand what each artifact provides
when reviewing release logs.
  </action>
  <verify>
Run: `grep "Uploading MSI" .github/workflows/ci.yml` shows "system-wide, admin required"
Run: `grep "Uploading NSIS" .github/workflows/ci.yml` shows "per-user, no admin"
  </verify>
  <done>Upload steps have descriptive messages clarifying installer types</done>
</task>

</tasks>

<verification>
After both tasks complete:

1. Validate YAML syntax:
   ```bash
   python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" && echo "YAML valid"
   ```

2. Verify build command:
   ```bash
   grep "tauri build" .github/workflows/ci.yml
   ```
   Should show: `pnpm tauri build --bundles nsis,msi`

3. Verify documentation comments exist:
   ```bash
   grep -B3 "Build application" .github/workflows/ci.yml
   ```
   Should show comments about NSIS/MSI and VBSCRIPT

4. Verify upload messages:
   ```bash
   grep "Uploading" .github/workflows/ci.yml
   ```
   Should show descriptive messages with admin/no-admin info
</verification>

<success_criteria>
- [ ] CI build step uses `--bundles nsis,msi` explicitly
- [ ] Comments document NSIS = per-user (no admin), MSI = system-wide (admin)
- [ ] Comments mention VBSCRIPT requirement for WiX/MSI builds
- [ ] Upload messages clarify what each installer provides
- [ ] YAML is valid (parseable)
</success_criteria>

<output>
After completion, create `.planning/phases/1-installer-fixes/1-02-SUMMARY.md`
</output>
