use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const SETTINGS_FILENAME: &str = "settings.json";
const SESSIONHOST_ENDPOINTS_FILENAME: &str = "sessionhost-endpoints.json";
const ENDUSER_ENDPOINTS_FILENAME: &str = "enduser-endpoints.json";

/// Application mode - determines which endpoint file to use
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum AppMode {
    SessionHost,
    EndUser,
}

impl Default for AppMode {
    fn default() -> Self {
        AppMode::SessionHost
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatencyThresholds {
    pub excellent: u32,
    pub good: u32,
    pub warning: u32,
}

impl Default for LatencyThresholds {
    fn default() -> Self {
        Self {
            excellent: 30,
            good: 80,
            warning: 150,
        }
    }
}

/// Endpoint definition used throughout the app
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Endpoint {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(default)]
    pub region: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub muted: Option<bool>,
    #[serde(default = "default_port")]
    pub port: Option<u16>,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub required: Option<bool>,
    #[serde(default)]
    pub purpose: Option<String>,
    #[serde(default)]
    pub latency_critical: Option<bool>,
    /// If set, this is a wildcard endpoint pattern (e.g., "*.wvd.microsoft.com")
    #[serde(default)]
    pub wildcard_pattern: Option<String>,
    /// Known subdomains to test for wildcard endpoints
    #[serde(default)]
    pub known_subdomains: Option<Vec<String>>,
}

fn default_true() -> bool {
    true
}

fn default_port() -> Option<u16> {
    Some(443)
}

/// Endpoint definition in the JSON files (matches file structure)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EndpointDefinition {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(default = "default_port")]
    pub port: Option<u16>,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default = "default_true")]
    pub required: bool,
    #[serde(default)]
    pub purpose: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub latency_critical: Option<bool>,
    #[serde(default)]
    pub muted: Option<bool>,
    /// If set, this is a wildcard endpoint pattern (e.g., "*.wvd.microsoft.com")
    #[serde(default)]
    pub wildcard_pattern: Option<String>,
    /// Known subdomains to test for wildcard endpoints
    #[serde(default)]
    pub known_subdomains: Option<Vec<String>>,
}

/// Category in the endpoint JSON files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointCategory {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    pub endpoints: Vec<EndpointDefinition>,
}

/// Structure of the endpoint JSON files
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EndpointFile {
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub source: Option<String>,
    pub categories: Vec<EndpointCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    #[serde(default = "default_mode")]
    pub mode: AppMode,
    #[serde(default = "default_test_interval")]
    pub test_interval: u32,
    #[serde(default = "default_retention_days")]
    pub retention_days: u32,
    #[serde(default)]
    pub thresholds: LatencyThresholds,
    #[serde(default = "default_true")]
    pub notifications_enabled: bool,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_theme")]
    pub theme: String,
    #[serde(default = "default_alert_threshold")]
    pub alert_threshold: u32,
    #[serde(default = "default_alert_cooldown")]
    pub alert_cooldown: u32,
    #[serde(default = "default_graph_time_range")]
    pub graph_time_range: u32,
}

fn default_mode() -> AppMode {
    AppMode::SessionHost
}

fn default_test_interval() -> u32 {
    10
}

fn default_retention_days() -> u32 {
    30
}

fn default_theme() -> String {
    "system".to_string()
}

fn default_alert_threshold() -> u32 {
    3
}

fn default_alert_cooldown() -> u32 {
    5
}

fn default_graph_time_range() -> u32 {
    1
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            mode: AppMode::SessionHost,
            test_interval: 10,
            retention_days: 30,
            thresholds: LatencyThresholds::default(),
            notifications_enabled: true,
            auto_start: false,
            theme: "system".to_string(),
            alert_threshold: 3,
            alert_cooldown: 5,
            graph_time_range: 1,
        }
    }
}

/// Custom endpoint added by user (stored in settings.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomEndpoint {
    pub id: String,
    pub name: String,
    pub url: String,
    #[serde(default = "default_port")]
    pub port: Option<u16>,
    #[serde(default)]
    pub protocol: Option<String>,
    #[serde(default = "default_custom_category")]
    pub category: Option<String>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub latency_critical: bool,
}

fn default_custom_category() -> Option<String> {
    Some("Custom".to_string())
}

/// Settings file structure - contains config only, endpoints are in separate files
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsFile {
    #[serde(default = "default_version")]
    pub version: u32,
    #[serde(default)]
    pub config: AppConfig,
    /// Custom endpoints added by the user
    #[serde(default)]
    pub custom_endpoints: Vec<CustomEndpoint>,
}

fn default_version() -> u32 {
    1
}

impl Default for SettingsFile {
    fn default() -> Self {
        Self {
            version: 1,
            config: AppConfig::default(),
            custom_endpoints: Vec::new(),
        }
    }
}

/// Response structure for the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsResponse {
    pub version: u32,
    pub config: AppConfig,
    pub endpoints: Vec<Endpoint>,
    pub mode_info: ModeInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeInfo {
    pub name: String,
    pub description: Option<String>,
    pub source: Option<String>,
}

/// Determines if the app is running as a portable/standalone exe
pub fn is_portable() -> bool {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let portable_settings = parent.join(SETTINGS_FILENAME);
            if portable_settings.exists() {
                return true;
            }
            let parent_str = parent.to_string_lossy().to_lowercase();
            if parent_str.contains("program files") {
                return false;
            }
            let test_file = parent.join(".portable_test");
            if fs::write(&test_file, "test").is_ok() {
                let _ = fs::remove_file(&test_file);
                return true;
            }
        }
    }
    false
}

/// Gets the exe directory for portable mode
pub fn get_exe_dir() -> std::io::Result<PathBuf> {
    let exe_path = std::env::current_exe()?;
    exe_path.parent()
        .map(|p| p.to_path_buf())
        .ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "Could not find exe directory"))
}

/// Gets the AppData settings directory for installed mode
pub fn get_appdata_settings_dir() -> std::io::Result<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA")
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e))?;
        let settings_dir = PathBuf::from(appdata).join("AVDHealthMonitor");
        fs::create_dir_all(&settings_dir)?;
        Ok(settings_dir)
    }

    #[cfg(not(target_os = "windows"))]
    {
        let home = std::env::var("HOME")
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::NotFound, e))?;
        let settings_dir = PathBuf::from(home)
            .join(".config")
            .join("avd-health-monitor");
        fs::create_dir_all(&settings_dir)?;
        Ok(settings_dir)
    }
}

/// Gets the settings directory
pub fn get_settings_dir() -> std::io::Result<PathBuf> {
    if is_portable() {
        get_exe_dir()
    } else {
        get_appdata_settings_dir()
    }
}

/// Gets the settings file path based on installation type
pub fn get_settings_path() -> std::io::Result<PathBuf> {
    Ok(get_settings_dir()?.join(SETTINGS_FILENAME))
}

/// Gets the endpoint file path for the given mode
pub fn get_endpoint_file_path(mode: &AppMode) -> std::io::Result<PathBuf> {
    let filename = match mode {
        AppMode::SessionHost => SESSIONHOST_ENDPOINTS_FILENAME,
        AppMode::EndUser => ENDUSER_ENDPOINTS_FILENAME,
    };
    Ok(get_settings_dir()?.join(filename))
}

/// Load endpoint file for the given mode
pub fn load_endpoint_file(app: &tauri::AppHandle, mode: &AppMode) -> std::io::Result<EndpointFile> {
    let path = get_endpoint_file_path(mode)?;
    let filename = match mode {
        AppMode::SessionHost => SESSIONHOST_ENDPOINTS_FILENAME,
        AppMode::EndUser => ENDUSER_ENDPOINTS_FILENAME,
    };

    if !path.exists() {
        // Try multiple paths to find bundled resources
        let possible_resource_paths: Vec<PathBuf> = {
            let mut paths = Vec::new();

            if let Ok(resource_path) = app.path().resource_dir() {
                paths.push(resource_path.clone());
                paths.push(resource_path.join("resources"));
            }

            if let Ok(exe_path) = std::env::current_exe() {
                if let Some(exe_dir) = exe_path.parent() {
                    paths.push(exe_dir.to_path_buf());
                    paths.push(exe_dir.join("resources"));
                }
            }

            paths
        };

        for resource_dir in &possible_resource_paths {
            let source_path = resource_dir.join(filename);
            if source_path.exists() {
                if fs::copy(&source_path, &path).is_ok() {
                    break;
                }
            }
        }
    }

    if !path.exists() {
        return Err(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            format!("Endpoint file not found: {:?}", path)
        ));
    }

    let content = fs::read_to_string(&path)?;
    let endpoint_file: EndpointFile = serde_json::from_str(&content)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;

    Ok(endpoint_file)
}

/// Save endpoint file for the given mode
pub fn save_endpoint_file(mode: &AppMode, endpoint_file: &EndpointFile) -> std::io::Result<()> {
    let path = get_endpoint_file_path(mode)?;
    let content = serde_json::to_string_pretty(endpoint_file)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    fs::write(&path, content)?;
    Ok(())
}

/// Convert EndpointFile to list of Endpoints
/// Wildcard endpoints are expanded into individual subdomain endpoints
fn endpoints_from_file(endpoint_file: &EndpointFile) -> Vec<Endpoint> {
    let mut endpoints = Vec::new();

    for category in &endpoint_file.categories {
        for ep_def in &category.endpoints {
            // Check if this is a wildcard endpoint that should be expanded
            if let (Some(ref pattern), Some(ref subdomains)) = (&ep_def.wildcard_pattern, &ep_def.known_subdomains) {
                // Extract base domain from pattern (e.g., "*.wvd.microsoft.com" -> "wvd.microsoft.com")
                let base_domain = pattern.trim_start_matches("*.");

                // Expand into individual subdomain endpoints
                for subdomain in subdomains {
                    let full_url = format!("{}.{}", subdomain, base_domain);
                    let subdomain_id = format!("{}-{}", ep_def.id, subdomain);
                    let subdomain_name = format!("{} ({})", ep_def.name, subdomain);

                    endpoints.push(Endpoint {
                        id: subdomain_id,
                        name: subdomain_name,
                        url: full_url,
                        region: Some("global".to_string()),
                        enabled: ep_def.enabled,
                        muted: ep_def.muted,
                        port: ep_def.port,
                        protocol: ep_def.protocol.clone(),
                        category: Some(category.name.clone()),
                        required: Some(ep_def.required),
                        purpose: ep_def.purpose.clone(),
                        latency_critical: ep_def.latency_critical,
                        // Keep the wildcard info for reference but this is an expanded endpoint
                        wildcard_pattern: Some(pattern.clone()),
                        known_subdomains: None, // Individual expanded endpoints don't have subdomains
                    });
                }
            } else {
                // Regular endpoint - add as-is
                endpoints.push(Endpoint {
                    id: ep_def.id.clone(),
                    name: ep_def.name.clone(),
                    url: ep_def.url.clone(),
                    region: Some("global".to_string()),
                    enabled: ep_def.enabled,
                    muted: ep_def.muted,
                    port: ep_def.port,
                    protocol: ep_def.protocol.clone(),
                    category: Some(category.name.clone()),
                    required: Some(ep_def.required),
                    purpose: ep_def.purpose.clone(),
                    latency_critical: ep_def.latency_critical,
                    wildcard_pattern: None,
                    known_subdomains: None,
                });
            }
        }
    }

    endpoints
}

/// Load settings from file
pub fn load_settings() -> std::io::Result<SettingsFile> {
    let path = get_settings_path()?;

    if path.exists() {
        let content = fs::read_to_string(&path)?;
        let settings: SettingsFile = serde_json::from_str(&content)
            .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
        Ok(settings)
    } else {
        let settings = SettingsFile::default();
        save_settings(&settings)?;
        Ok(settings)
    }
}

/// Load settings and resolve endpoints for the frontend
pub fn load_settings_with_endpoints(app: &tauri::AppHandle) -> std::io::Result<SettingsResponse> {
    let settings = load_settings()?;
    load_settings_with_endpoints_for_mode(app, &settings, &settings.config.mode)
}

/// Load settings and resolve endpoints for a specific mode
pub fn load_settings_with_endpoints_for_mode(
    app: &tauri::AppHandle,
    settings: &SettingsFile,
    mode: &AppMode,
) -> std::io::Result<SettingsResponse> {
    let endpoint_file = load_endpoint_file(app, mode)?;
    let mut endpoints = endpoints_from_file(&endpoint_file);

    // Add custom endpoints
    for custom in &settings.custom_endpoints {
        endpoints.push(Endpoint {
            id: custom.id.clone(),
            name: custom.name.clone(),
            url: custom.url.clone(),
            region: None,
            enabled: custom.enabled,
            muted: None,
            port: custom.port,
            protocol: custom.protocol.clone(),
            category: custom.category.clone().or_else(|| Some("Custom".to_string())),
            required: Some(false),
            purpose: Some("Custom endpoint".to_string()),
            latency_critical: Some(custom.latency_critical),
            wildcard_pattern: None,
            known_subdomains: None,
        });
    }

    // Create a config with the requested mode
    let mut config = settings.config.clone();
    config.mode = mode.clone();

    Ok(SettingsResponse {
        version: settings.version,
        config,
        endpoints,
        mode_info: ModeInfo {
            name: endpoint_file.name,
            description: endpoint_file.description,
            source: endpoint_file.source,
        },
    })
}

/// Initialize settings and endpoint files
pub fn initialize_settings(app: &tauri::AppHandle) -> std::io::Result<()> {
    let settings_path = get_settings_path()?;
    let settings_dir = get_settings_dir()?;

    println!("[Settings] Settings directory: {:?}", settings_dir);
    println!("[Settings] Settings file path: {:?}", settings_path);

    // Create settings.json if it doesn't exist
    if !settings_path.exists() {
        println!("[Settings] Creating default settings file");
        let settings = SettingsFile::default();
        save_settings(&settings)?;
    }

    // Try multiple paths to find bundled resources
    let possible_resource_paths: Vec<PathBuf> = {
        let mut paths = Vec::new();

        // 1. Tauri resource_dir (standard path)
        if let Ok(resource_path) = app.path().resource_dir() {
            paths.push(resource_path.clone());
            // Also try resources subfolder
            paths.push(resource_path.join("resources"));
        }

        // 2. Exe directory (for MSI installs, resources are often next to exe)
        if let Ok(exe_path) = std::env::current_exe() {
            if let Some(exe_dir) = exe_path.parent() {
                paths.push(exe_dir.to_path_buf());
                paths.push(exe_dir.join("resources"));
            }
        }

        paths
    };

    println!("[Settings] Searching for resources in: {:?}", possible_resource_paths);

    // Copy endpoint files to settings directory if they don't exist
    for filename in [SESSIONHOST_ENDPOINTS_FILENAME, ENDUSER_ENDPOINTS_FILENAME] {
        let target_path = settings_dir.join(filename);
        if !target_path.exists() {
            println!("[Settings] Looking for resource file: {}", filename);

            let mut copied = false;
            for resource_dir in &possible_resource_paths {
                let source_path = resource_dir.join(filename);
                println!("[Settings] Checking: {:?}", source_path);

                if source_path.exists() {
                    match fs::copy(&source_path, &target_path) {
                        Ok(_) => {
                            println!("[Settings] Successfully copied {} to {:?}", filename, target_path);
                            copied = true;
                            break;
                        }
                        Err(e) => {
                            eprintln!("[Settings] Failed to copy {}: {}", filename, e);
                        }
                    }
                }
            }

            if !copied {
                eprintln!("[Settings] WARNING: Could not find resource file: {}", filename);
            }
        } else {
            println!("[Settings] File already exists: {:?}", target_path);
        }
    }

    Ok(())
}

/// Save settings to file
pub fn save_settings(settings: &SettingsFile) -> std::io::Result<()> {
    let path = get_settings_path()?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::InvalidData, e))?;
    fs::write(&path, content)?;
    Ok(())
}

/// Update endpoint properties directly in the endpoint JSON file
pub fn update_endpoint_state(
    app: &tauri::AppHandle,
    mode: &AppMode,
    endpoint_id: &str,
    enabled: Option<bool>,
    muted: Option<bool>,
    name: Option<String>,
    url: Option<String>,
    port: Option<u16>,
) -> std::io::Result<()> {
    let mut endpoint_file = load_endpoint_file(app, mode)?;

    // Find and update the endpoint
    'outer: for category in &mut endpoint_file.categories {
        for ep in &mut category.endpoints {
            if ep.id == endpoint_id {
                if let Some(e) = enabled {
                    ep.enabled = e;
                }
                if let Some(m) = muted {
                    ep.muted = Some(m);
                }
                if let Some(ref n) = name {
                    ep.name = n.clone();
                }
                if let Some(ref u) = url {
                    ep.url = u.clone();
                }
                if let Some(p) = port {
                    ep.port = Some(p);
                }
                break 'outer;
            }
        }
    }

    // Save the updated file
    save_endpoint_file(mode, &endpoint_file)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_settings() {
        let settings = SettingsFile::default();
        assert_eq!(settings.version, 1);
        assert_eq!(settings.config.mode, AppMode::SessionHost);
        assert_eq!(settings.config.test_interval, 10);
        assert_eq!(settings.config.alert_threshold, 3);
    }

    #[test]
    fn test_app_mode_serialization() {
        let mode = AppMode::EndUser;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"enduser\"");

        let mode = AppMode::SessionHost;
        let json = serde_json::to_string(&mode).unwrap();
        assert_eq!(json, "\"sessionhost\"");
    }
}
