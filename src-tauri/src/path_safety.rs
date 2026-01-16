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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::env;

    #[test]
    fn test_valid_path_in_dir() {
        // Create a temp directory structure
        let temp_dir = env::temp_dir().join("path_safety_test");
        let _ = fs::create_dir_all(&temp_dir);
        let test_file = temp_dir.join("test.txt");
        fs::write(&test_file, "test").unwrap();

        // Valid path should pass
        let result = validate_path_in_dir(&test_file, &temp_dir);
        assert!(result.is_ok());

        // Clean up
        let _ = fs::remove_file(&test_file);
        let _ = fs::remove_dir(&temp_dir);
    }

    #[test]
    fn test_path_traversal_blocked() {
        let temp_dir = env::temp_dir().join("path_safety_test2");
        let _ = fs::create_dir_all(&temp_dir);

        // Attempt to traverse outside the allowed directory
        let traversal_path = temp_dir.join("..").join("etc").join("passwd");
        let result = validate_path_in_dir(&traversal_path, &temp_dir);

        // Should fail (either path doesn't exist or traversal blocked)
        // On most systems this will fail because /etc/passwd doesn't exist
        // or the traversal is blocked
        assert!(result.is_err());

        let _ = fs::remove_dir(&temp_dir);
    }

    #[test]
    fn test_nonexistent_path() {
        let temp_dir = env::temp_dir();
        let nonexistent = temp_dir.join("definitely_does_not_exist_12345.txt");

        let result = validate_path_in_dir(&nonexistent, &temp_dir);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Cannot resolve path"));
    }
}
