#[cfg(target_os = "windows")]
use winreg::enums::*;
#[cfg(target_os = "windows")]
use winreg::RegKey;

const APP_NAME: &str = "AVDHealthMonitor";

#[cfg(target_os = "windows")]
pub fn enable_autostart(exe_path: &str) -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";

    let (key, _) = hkcu
        .create_subkey(path)
        .map_err(|e| format!("Failed to open registry key: {}", e))?;

    key.set_value(APP_NAME, &exe_path)
        .map_err(|e| format!("Failed to set registry value: {}", e))?;

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn disable_autostart() -> Result<(), String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";

    let key = hkcu
        .open_subkey_with_flags(path, KEY_WRITE)
        .map_err(|e| format!("Failed to open registry key: {}", e))?;

    key.delete_value(APP_NAME)
        .map_err(|e| format!("Failed to delete registry value: {}", e))?;

    Ok(())
}

#[cfg(target_os = "windows")]
pub fn is_autostart_enabled() -> Result<bool, String> {
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Run";

    let key = hkcu
        .open_subkey(path)
        .map_err(|e| format!("Failed to open registry key: {}", e))?;

    match key.get_value::<String, _>(APP_NAME) {
        Ok(_) => Ok(true),
        Err(ref e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(format!("Failed to read registry value: {}", e)),
    }
}

#[cfg(not(target_os = "windows"))]
pub fn enable_autostart(_exe_path: &str) -> Result<(), String> {
    Err("Auto-start is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn disable_autostart() -> Result<(), String> {
    Err("Auto-start is only supported on Windows".to_string())
}

#[cfg(not(target_os = "windows"))]
pub fn is_autostart_enabled() -> Result<bool, String> {
    Ok(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_autostart_check() {
        // Just test that the function doesn't panic
        let _ = is_autostart_enabled();
    }
}
