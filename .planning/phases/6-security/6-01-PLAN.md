---
phase: 6-security
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src-tauri/Cargo.toml
  - src-tauri/src/settings.rs
  - src-tauri/src/path_safety.rs
  - src-tauri/src/lib.rs
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Portable mode detection uses OS API, no test file created"
    - "Editor invocation validates paths are within allowed directories"
    - "Path traversal attacks (../ injection) are rejected"
  artifacts:
    - path: "src-tauri/src/path_safety.rs"
      provides: "Path validation utilities"
      exports: ["validate_path_in_dir", "open_file_safely"]
    - path: "src-tauri/src/settings.rs"
      provides: "Portable detection without test file"
      contains: "faccess"
  key_links:
    - from: "src-tauri/src/lib.rs"
      to: "src-tauri/src/path_safety.rs"
      via: "open_settings_file uses validate_path_in_dir"
      pattern: "path_safety::"
    - from: "src-tauri/src/settings.rs"
      to: "faccess"
      via: "is_portable uses PathExt::writable"
      pattern: "writable\\(\\)"
---

<objective>
Implement OS-native permission checking and path injection prevention.

Purpose: Eliminate security anti-patterns (test file creation, unvalidated paths to external commands)
Output: Secure portable detection and path-validated editor invocation
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/6-security/6-RESEARCH.md

# Source files to modify
@src-tauri/Cargo.toml
@src-tauri/src/settings.rs
@src-tauri/src/lib.rs
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace test file permission check with faccess</name>
  <files>src-tauri/Cargo.toml, src-tauri/src/settings.rs</files>
  <action>
1. Add faccess dependency to Cargo.toml:
   ```toml
   faccess = "0.2"
   ```

2. Update is_portable() in settings.rs:
   - Add `use faccess::PathExt;` import
   - Replace the test file creation logic (lines 333-337) with:
     ```rust
     // Check 3: Use OS API to check write permission (no test file)
     return parent.writable();
     ```
   - Remove the `.portable_test` file creation and cleanup code entirely

The function should:
- Keep check 1: settings.json exists = portable
- Keep check 2: Program Files = not portable
- Replace check 3: faccess writable() instead of test file
  </action>
  <verify>
- `cd src-tauri && cargo check` succeeds
- grep for ".portable_test" returns no results
- grep for "writable()" in settings.rs returns the new implementation
  </verify>
  <done>is_portable() uses OS API permission check, no test file artifacts created</done>
</task>

<task type="auto">
  <name>Task 2: Add path safety module and validate editor paths</name>
  <files>src-tauri/src/path_safety.rs, src-tauri/src/lib.rs</files>
  <action>
1. Create new path_safety.rs module:
   ```rust
   //! Path validation utilities to prevent path traversal attacks

   use std::path::{Path, PathBuf};

   /// Validate that a path is within an allowed base directory.
   /// Resolves symlinks and .. to prevent traversal attacks.
   pub fn validate_path_in_dir(path: &Path, allowed_base: &Path) -> Result<PathBuf, String> {
       // Canonicalize both paths to resolve symlinks and ..
       let canonical_path = path.canonicalize()
           .map_err(|e| format!("Cannot resolve path '{}': {}", path.display(), e))?;
       let canonical_base = allowed_base.canonicalize()
           .map_err(|e| format!("Cannot resolve base path '{}': {}", allowed_base.display(), e))?;

       // Check containment
       if !canonical_path.starts_with(&canonical_base) {
           return Err(format!(
               "Path traversal blocked: '{}' is not within '{}'",
               canonical_path.display(),
               canonical_base.display()
           ));
       }

       Ok(canonical_path)
   }
   ```

2. Update lib.rs:
   - Add `mod path_safety;` declaration
   - Import: `use path_safety::validate_path_in_dir;`

3. Update open_settings_file() in lib.rs:
   - Get settings directory: `let settings_dir = settings::get_settings_dir().map_err(|e| e.to_string())?;`
   - Validate path before opening: `let safe_path = validate_path_in_dir(&path, &settings_dir)?;`
   - Pass `&safe_path` to Command instead of `&path`

4. Update open_resource_file() in lib.rs:
   - Get resource base: Use `app.path().resource_dir()` as the allowed base
   - Validate: `let safe_path = validate_path_in_dir(&resource_path, &resource_base)?;`
   - Pass `&safe_path` to Command instead of `&resource_path`

Note: open_settings_file() uses get_settings_path() which internally uses get_settings_dir(), so the path should always be within the settings directory. This validation catches any future code changes that might break this assumption.
  </action>
  <verify>
- `cd src-tauri && cargo check` succeeds
- path_safety.rs file exists with validate_path_in_dir function
- grep for "validate_path_in_dir" in lib.rs shows usage in both open functions
  </verify>
  <done>Editor invocations validate paths against allowed directories, path traversal attacks blocked</done>
</task>

</tasks>

<verification>
- [ ] `cd src-tauri && cargo check` passes
- [ ] `cd src-tauri && cargo test` passes
- [ ] No ".portable_test" string in codebase
- [ ] path_safety.rs module exists
- [ ] Both open_settings_file and open_resource_file use validate_path_in_dir
</verification>

<success_criteria>
- SEC-02 complete: Portable mode uses faccess for permission check
- SEC-03 complete: Path injection prevented via canonicalize + containment check
- No security anti-patterns: test file creation removed, paths validated before external command
</success_criteria>

<output>
After completion, create `.planning/phases/6-security/6-01-SUMMARY.md`
</output>
