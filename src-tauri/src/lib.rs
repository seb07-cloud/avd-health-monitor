use once_cell::sync::Lazy;
use parking_lot::Mutex;
use std::sync::Arc;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, RunEvent, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;

mod latency;
mod tray_icon;
mod logger;
mod autostart;
mod settings;
mod validation;
mod fslogix;
mod path_safety;
mod export;

use tray_icon::{generate_tray_icon, IconStatus, LatencyThresholds};
use logger::Logger;
use settings::{SettingsFile, SettingsResponse, AppMode, FSLogixPathState, get_settings_path, get_settings_dir, load_settings, load_settings_with_endpoints, load_settings_with_endpoints_for_mode, save_settings, initialize_settings, update_endpoint_state};
use path_safety::validate_path_in_dir;
use fslogix::FSLogixPath;

// Global tray icon reference (using concrete Wry runtime type)
static TRAY_ICON: Lazy<Arc<Mutex<Option<TrayIcon<tauri::Wry>>>>> = Lazy::new(|| Arc::new(Mutex::new(None)));

#[tauri::command]
async fn test_latency(endpoint: String, port: Option<u16>, protocol: Option<String>) -> Result<f64, String> {
    let port = port.unwrap_or(443);
    let protocol = protocol.unwrap_or_else(|| "tcp".to_string());

    match protocol.as_str() {
        "http" => {
            let url = format!("http://{}:{}", endpoint, port);
            latency::test_http_latency(&url)
                .await
                .map_err(|e| e.to_string())
        }
        "https" => {
            let url = format!("https://{}:{}", endpoint, port);
            latency::test_http_latency(&url)
                .await
                .map_err(|e| e.to_string())
        }
        _ => {
            // Default to TCP
            latency::test_tcp_latency(&endpoint, port)
                .await
                .map_err(|e| e.to_string())
        }
    }
}

#[tauri::command]
fn update_tray_icon(latency: f64, excellent: f64, good: f64, warning: f64) -> Result<(), String> {
    let thresholds = LatencyThresholds {
        excellent,
        good,
        warning,
    };

    let status = IconStatus::from_latency(latency, &thresholds);
    let icon_data = generate_tray_icon(status);

    let icon = Image::from_bytes(&icon_data).map_err(|e| e.to_string())?;

    if let Some(tray) = TRAY_ICON.lock().as_ref() {
        tray.set_icon(Some(icon))
            .map_err(|e: tauri::Error| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn send_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e: tauri_plugin_notification::Error| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn set_autostart(enabled: bool, app_path: String) -> Result<(), String> {
    if enabled {
        autostart::enable_autostart(&app_path)
    } else {
        autostart::disable_autostart()
    }
}

#[tauri::command]
fn check_autostart() -> Result<bool, String> {
    autostart::is_autostart_enabled()
}

#[tauri::command]
fn get_settings_file_path() -> Result<String, String> {
    get_settings_path()
        .map(|p| p.to_string_lossy().to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
fn read_settings_with_endpoints(app: tauri::AppHandle) -> Result<SettingsResponse, String> {
    load_settings_with_endpoints(&app).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_settings_for_mode(app: tauri::AppHandle, mode: String) -> Result<SettingsResponse, String> {
    let settings = load_settings().map_err(|e| e.to_string())?;
    let app_mode = match mode.as_str() {
        "enduser" => AppMode::EndUser,
        _ => AppMode::SessionHost,
    };
    load_settings_with_endpoints_for_mode(&app, &settings, &app_mode).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_settings_file(settings: SettingsFile) -> Result<(), String> {
    save_settings(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_settings_file() -> Result<(), String> {
    let path = get_settings_path().map_err(|e| e.to_string())?;
    let settings_dir = get_settings_dir().map_err(|e| e.to_string())?;

    // Validate path is within settings directory to prevent path traversal
    let safe_path = validate_path_in_dir(&path, &settings_dir)?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("notepad")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-t")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn open_resource_file(app: &tauri::AppHandle, filename: &str) -> Result<(), String> {
    let resource_base = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;
    let resource_path = resource_base.join("resources").join(filename);

    // Validate path is within resource directory to prevent path traversal
    let safe_path = validate_path_in_dir(&resource_path, &resource_base)?;

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("notepad")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("-t")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&safe_path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn get_fslogix_storage_paths() -> Vec<FSLogixPath> {
    let mut paths = fslogix::get_fslogix_paths();

    // Apply muted state from settings file
    if let Ok(settings) = load_settings() {
        for path in &mut paths {
            // Check if this path has a saved muted state
            if let Some(state) = settings.fslogix_path_states.iter().find(|s| s.id == path.id) {
                path.muted = Some(state.muted);
            }
        }
    }

    paths
}

#[tauri::command]
fn update_fslogix_path_muted(path_id: String, muted: bool) -> Result<(), String> {
    let mut settings = load_settings().map_err(|e| e.to_string())?;

    // Find existing state or create new one
    if let Some(state) = settings.fslogix_path_states.iter_mut().find(|s| s.id == path_id) {
        state.muted = muted;
    } else {
        settings.fslogix_path_states.push(FSLogixPathState {
            id: path_id,
            muted,
        });
    }

    save_settings(&settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn update_endpoint(
    app: tauri::AppHandle,
    mode: String,
    endpoint_id: String,
    enabled: Option<bool>,
    muted: Option<bool>,
    name: Option<String>,
    url: Option<String>,
    port: Option<u16>,
) -> Result<(), String> {
    let app_mode = match mode.as_str() {
        "enduser" => AppMode::EndUser,
        _ => AppMode::SessionHost,
    };
    update_endpoint_state(&app, &app_mode, &endpoint_id, enabled, muted, name, url, port)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn get_log_directory() -> Result<String, String> {
    let logger = Logger::new(30).map_err(|e| e.to_string())?;
    Ok(logger.get_log_path().parent()
        .unwrap_or(logger.get_log_path())
        .to_string_lossy()
        .to_string())
}

fn create_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    // Create menu items
    let show_i = MenuItem::with_id(app, "show", "Show Dashboard", true, None::<&str>)?;
    let pause_i = MenuItem::with_id(app, "pause", "Pause Monitoring", true, None::<&str>)?;
    let test_i = MenuItem::with_id(app, "test", "Test Now", true, None::<&str>)?;
    let settings_i = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let open_config_i = MenuItem::with_id(app, "open_config", "Open Settings File", true, None::<&str>)?;
    let open_enduser_i = MenuItem::with_id(app, "open_enduser", "Edit End User Endpoints", true, None::<&str>)?;
    let open_sessionhost_i = MenuItem::with_id(app, "open_sessionhost", "Edit Session Host Endpoints", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Exit", true, None::<&str>)?;

    // Build menu
    let menu = Menu::with_items(
        app,
        &[&show_i, &pause_i, &test_i, &settings_i, &open_config_i, &open_enduser_i, &open_sessionhost_i, &quit_i],
    )?;

    // Generate initial icon (gray/unknown state)
    let icon_data = generate_tray_icon(IconStatus::Unknown);
    let icon = Image::from_bytes(&icon_data)?;

    // Create tray icon with a consistent ID so Windows remembers visibility preference
    // The ID must be stable across app restarts for Windows to remember the visibility setting
    let tray = TrayIconBuilder::<tauri::Wry>::with_id("avd-health-monitor-tray")
        .menu(&menu)
        .icon(icon)
        .tooltip("AVD Health Monitor")
        .on_menu_event(|app: &tauri::AppHandle, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "pause" => {
                // Pause/Resume handled by frontend
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-pause-clicked", ());
                }
            }
            "test" => {
                // Test Now handled by frontend
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.emit("tray-test-clicked", ());
                }
            }
            "settings" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                    let _ = window.emit("tray-settings-clicked", ());
                }
            }
            "open_config" => {
                let _ = open_settings_file();
            }
            "open_enduser" => {
                let _ = open_resource_file(app, "enduser-endpoints.json");
            }
            "open_sessionhost" => {
                let _ = open_resource_file(app, "sessionhost-endpoints.json");
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray: &TrayIcon, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        let _ = window.hide();
                    } else {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    // Store tray icon globally
    *TRAY_ICON.lock() = Some(tray);

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize settings file from bundled resource if not exists
            if let Err(e) = initialize_settings(&app.handle()) {
                eprintln!("Failed to initialize settings: {}", e);
            }

            // Create system tray - app starts minimized to tray
            create_tray(&app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Intercept the close request and hide the window instead of closing
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Prevent the window from closing
                api.prevent_close();
                // Hide the window instead
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            test_latency,
            update_tray_icon,
            send_notification,
            set_autostart,
            check_autostart,
            get_settings_file_path,
            get_app_version,
            get_log_directory,
            read_settings_with_endpoints,
            read_settings_for_mode,
            write_settings_file,
            open_settings_file,
            update_endpoint,
            get_fslogix_storage_paths,
            update_fslogix_path_muted,
            export::export_settings_to_path,
            export::import_settings_from_path,
            export::write_text_to_path,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    // Run the app with custom event handling
    app.run(|_app_handle, event| {
        // Only exit when explicitly requested (from tray menu "Exit")
        if let RunEvent::ExitRequested { api, .. } = event {
            // Allow exit only from explicit exit calls (app.exit())
            // The api.prevent_exit() would prevent even explicit exits, so we don't call it here
            let _ = api;
        }
    });
}
