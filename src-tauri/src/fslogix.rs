#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

use serde::{Deserialize, Serialize};

/// Represents an FSLogix storage path configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FSLogixPath {
    /// Unique identifier for this path
    pub id: String,
    /// Type of container: "profile" or "odfc"
    #[serde(rename = "type")]
    pub path_type: String,
    /// Full UNC path (e.g., \\storage.file.core.windows.net\share)
    pub path: String,
    /// Extracted hostname for network testing
    pub hostname: String,
    /// Port for connectivity testing (445 for SMB)
    pub port: u16,
    /// If true, alerts are suppressed for this path
    #[serde(default)]
    pub muted: Option<bool>,
}

/// Extract hostname from a UNC path
/// Input: \\hostname\share or \\hostname\share\subfolder
/// Output: hostname
fn extract_hostname(unc_path: &str) -> Option<String> {
    // Remove leading backslashes and get the hostname part
    let trimmed = unc_path.trim_start_matches('\\');

    // Split by backslash and get the first part (hostname)
    let parts: Vec<&str> = trimmed.split('\\').collect();

    if parts.is_empty() || parts[0].is_empty() {
        return None;
    }

    Some(parts[0].to_string())
}

/// Parse VHDLocations value which can contain multiple paths separated by semicolons
fn parse_vhd_locations(value: &str) -> Vec<String> {
    value
        .split(';')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty() && s.starts_with("\\\\"))
        .collect()
}

#[cfg(target_os = "windows")]
fn read_vhd_locations_from_key(key: &RegKey, value_name: &str) -> Vec<String> {
    // Try to read as REG_SZ first
    if let Ok(value) = key.get_value::<String, _>(value_name) {
        return parse_vhd_locations(&value);
    }

    // Try to read as REG_MULTI_SZ
    if let Ok(values) = key.get_value::<Vec<String>, _>(value_name) {
        return values
            .iter()
            .flat_map(|v| parse_vhd_locations(v))
            .collect();
    }

    Vec::new()
}

#[cfg(target_os = "windows")]
pub fn get_fslogix_paths() -> Vec<FSLogixPath> {
    let mut paths = Vec::new();
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Check Profile Containers: HKLM\SOFTWARE\FSLogix\Profiles
    if let Ok(profiles_key) = hklm.open_subkey(r"SOFTWARE\FSLogix\Profiles") {
        let vhd_locations = read_vhd_locations_from_key(&profiles_key, "VHDLocations");

        for (index, path) in vhd_locations.iter().enumerate() {
            if let Some(hostname) = extract_hostname(path) {
                paths.push(FSLogixPath {
                    id: format!("fslogix-profile-{}", index),
                    path_type: "profile".to_string(),
                    path: path.clone(),
                    hostname,
                    port: 445, // SMB port
                    muted: None,
                });
            }
        }
    }

    // Check Office Containers (ODFC): HKLM\SOFTWARE\Policies\FSLogix\ODFC
    if let Ok(odfc_key) = hklm.open_subkey(r"SOFTWARE\Policies\FSLogix\ODFC") {
        let vhd_locations = read_vhd_locations_from_key(&odfc_key, "VHDLocations");

        for (index, path) in vhd_locations.iter().enumerate() {
            if let Some(hostname) = extract_hostname(path) {
                paths.push(FSLogixPath {
                    id: format!("fslogix-odfc-{}", index),
                    path_type: "odfc".to_string(),
                    path: path.clone(),
                    hostname,
                    port: 445, // SMB port
                    muted: None,
                });
            }
        }
    }

    paths
}

#[cfg(not(target_os = "windows"))]
pub fn get_fslogix_paths() -> Vec<FSLogixPath> {
    // FSLogix is Windows-only
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_hostname_azure_storage() {
        let path = r"\\mystorageaccount.file.core.windows.net\fslogix";
        assert_eq!(
            extract_hostname(path),
            Some("mystorageaccount.file.core.windows.net".to_string())
        );
    }

    #[test]
    fn test_extract_hostname_file_server() {
        let path = r"\\fileserver\profiles";
        assert_eq!(extract_hostname(path), Some("fileserver".to_string()));
    }

    #[test]
    fn test_extract_hostname_with_subfolder() {
        let path = r"\\server\share\subfolder\another";
        assert_eq!(extract_hostname(path), Some("server".to_string()));
    }

    #[test]
    fn test_extract_hostname_empty() {
        assert_eq!(extract_hostname(""), None);
        assert_eq!(extract_hostname(r"\\"), None);
    }

    #[test]
    fn test_parse_vhd_locations_single() {
        let value = r"\\storage.file.core.windows.net\share";
        let result = parse_vhd_locations(value);
        assert_eq!(result.len(), 1);
        assert_eq!(result[0], r"\\storage.file.core.windows.net\share");
    }

    #[test]
    fn test_parse_vhd_locations_multiple() {
        let value = r"\\server1\share1;\\server2\share2;\\server3\share3";
        let result = parse_vhd_locations(value);
        assert_eq!(result.len(), 3);
        assert_eq!(result[0], r"\\server1\share1");
        assert_eq!(result[1], r"\\server2\share2");
        assert_eq!(result[2], r"\\server3\share3");
    }

    #[test]
    fn test_parse_vhd_locations_with_spaces() {
        let value = r"  \\server1\share1 ; \\server2\share2  ";
        let result = parse_vhd_locations(value);
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_parse_vhd_locations_filters_invalid() {
        let value = r"\\valid\share;invalid;\\another\valid";
        let result = parse_vhd_locations(value);
        assert_eq!(result.len(), 2);
    }
}
