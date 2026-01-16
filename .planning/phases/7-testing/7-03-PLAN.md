---
phase: 7-testing
plan: 03
type: execute
wave: 2
depends_on: ["7-01"]
files_modified:
  - .github/workflows/ci.yml
autonomous: true

must_haves:
  truths:
    - "Rust tests run on all pushes and PRs (not just releases)"
    - "FSLogix path parsing is tested in Rust"
    - "Tray icon state is tested where testable"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "Updated CI with Rust tests on all pushes"
      contains: "cargo test"
  key_links:
    - from: ".github/workflows/ci.yml"
      to: "src-tauri/src/*.rs"
      via: "cargo test"
      pattern: "cargo test"
---

<objective>
Verify existing Rust tests cover TEST-04 and TEST-05, update CI to run Rust tests on all pushes/PRs.

Purpose: Ensures FSLogix path parsing tests (TEST-04) and tray icon tests (TEST-05) are running in CI, not just on releases. Verifies existing Rust test coverage is adequate.

Output: Updated CI workflow running Rust tests on every push/PR.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md

@.github/workflows/ci.yml
@src-tauri/src/fslogix.rs
@src-tauri/src/tray_icon.rs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Verify existing Rust test coverage and update CI</name>
  <files>
    .github/workflows/ci.yml
  </files>
  <action>
First, verify existing Rust tests cover the requirements:

1. Run `cd src-tauri && cargo test -- --list` to list all Rust tests
2. Verify fslogix.rs tests include:
   - extract_hostname tests (various path formats)
   - parse_vhd_locations tests (single and multiple paths)
3. Verify tray_icon.rs tests include:
   - Icon generation tests (status colors)

If tests exist and pass, proceed to update CI.

Update `.github/workflows/ci.yml` to run Rust tests on all pushes/PRs, not just releases:

1. In the `typecheck` job (which runs on all pushes/PRs), add Rust test step:

```yaml
      - name: Run Rust tests
        run: |
          cd src-tauri
          cargo test
```

Place this step after the Rust cache step and before or after the frontend tests step.

2. The existing `build-and-upload` job already has Rust tests but only runs on release. The typecheck job runs on every push/PR, so adding Rust tests there ensures continuous coverage.

3. Final typecheck job structure should include:
   - Checkout
   - Setup Node.js
   - Setup pnpm
   - Setup Rust
   - Rust cache
   - Install frontend dependencies
   - Generate TypeScript types
   - Check for type drift
   - TypeScript type check
   - Run Rust tests (NEW)
   - Run frontend tests

Note: Rust tests don't require Windows, so they can run on ubuntu-latest in the typecheck job.
  </action>
  <verify>
- Run `cd src-tauri && cargo test` locally - all tests pass
- Verify CI workflow is valid YAML: `yq . .github/workflows/ci.yml`
- Check that fslogix tests exist: `grep -c "test_extract_hostname\|test_parse_vhd" src-tauri/src/fslogix.rs`
- Check that tray_icon tests exist: `grep -c "fn test_" src-tauri/src/tray_icon.rs`
  </verify>
  <done>
CI runs Rust tests on all pushes/PRs. Existing Rust tests for fslogix.rs and tray_icon.rs verified.
  </done>
</task>

</tasks>

<verification>
- [ ] `cd src-tauri && cargo test` passes locally
- [ ] .github/workflows/ci.yml has Rust tests in typecheck job
- [ ] fslogix.rs has path parsing tests (TEST-04)
- [ ] tray_icon.rs has icon state tests (TEST-05)
- [ ] CI YAML is valid syntax
</verification>

<success_criteria>
TEST-04 satisfied: FSLogix path parsing is tested (existing Rust tests verified).
TEST-05 satisfied: Tray icon state is tested where testable (existing Rust tests verified).
CI runs all tests (frontend + Rust) on every push/PR.
</success_criteria>

<output>
After completion, create `.planning/phases/7-testing/7-03-SUMMARY.md`
</output>
