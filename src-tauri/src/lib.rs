use serde::{Deserialize, Serialize};
use std::sync::Arc; // Import Arc
use tauri::State;
mod kioskSetting;
mod logger;
mod store; // Import the new file
use logger::{LogLevel, Logger};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter,
};
mod serialport;
use kioskSetting::{listen_kiosk_login, request_kiosk_login};
use serialport::{continuous_read, get_serial_health, list_serial_ports, print_with_options, 
                 start_human_sensor_monitoring, stop_human_sensor_monitoring, stop_serial_reading};
use tauri::Manager; // Bring the command into scope

// Structure to accept log inputs from frontend
#[derive(Serialize, Deserialize)]
struct LogMessage {
    level: String,
    message: String,
}

/// Structure to hold app info
#[derive(Serialize, Deserialize)]
struct AppInfo {
    version: String,
    release_date: String,
}

/// Command to fetch app information (version and release date)
#[tauri::command]
async fn get_app_info(logger: State<'_, Arc<Logger>>) -> Result<AppInfo, String> {
    // dotenv().ok();

    // let version = env::var("RELEASE_VERSION").unwrap_or_else(|_| "0.1.0".to_string());
    // let release_date = env::var("RELEASE_DATE").unwrap_or_else(|_| "2023-10-01".to_string());

    let version = "1.1.3".to_string();
    let release_date = "2025-10-28".to_string();

    logger
        .log(
            LogLevel::INFO,
            &format!(
                "Fetched app info: version={}, release_date={}",
                version, release_date
            ),
        )
        .unwrap();

    Ok(AppInfo {
        version,
        release_date,
    })
}

// Command for reading config
#[tauri::command]
async fn read_config(logger: State<'_, Arc<Logger>>) -> Result<store::Config, String> {
    logger
        .log(LogLevel::INFO, "Read config command invoked from frontend")
        .unwrap();
    store::read_config_file(Arc::clone(&logger)).map_err(|e| format!("Error reading config: {}", e))
}

// Command for updating config
#[tauri::command]
async fn update_config(
    logger: State<'_, Arc<Logger>>,
    key: String,
    value: String,
) -> Result<(), String> {
    logger
        .log(
            LogLevel::INFO,
            &format!("Update config command invoked: {}={}", key, value),
        )
        .unwrap();
    store::update_config_key(Arc::clone(&logger), &key, &value)
        .map_err(|e| format!("Error updating config: {}", e))
}

// Command for logging from frontend
#[tauri::command]
async fn log_event(logger: State<'_, Arc<Logger>>, log: LogMessage) -> Result<(), String> {
    let log_level = match log.level.as_str() {
        "info" => LogLevel::INFO,
        "error" => LogLevel::ERROR,
        "warn" => LogLevel::WARN,
        "debug" => LogLevel::DEBUG,
        _ => LogLevel::INFO,
    };
    logger
        .log(log_level, &log.message)
        .map_err(|e| format!("Logging failed: {}", e))
}

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(logger: State<'_, Arc<Logger>>, name: &str) -> String {
    logger
        .log(
            LogLevel::INFO,
            &format!("Greet function called for {}", name),
        )
        .unwrap();
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn restart_app(app_handle: tauri::AppHandle, logger: State<'_, Arc<Logger>>) -> Result<(), String> {
    logger
        .log(LogLevel::INFO, "Restart command invoked from frontend")
        .unwrap();

    app_handle.restart()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger = Arc::new(Logger::new().unwrap()); // Wrap the logger in Arc for shared ownership

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .manage(logger.clone()) // Register the logger as a managed state
        .setup({
            let logger_setup = Arc::clone(&logger); // Clone for use in setup closure

            move |app| {
                // Use cloned `logger_setup` inside the setup closure
                logger_setup
                    .log(LogLevel::INFO, "Application setup started")
                    .unwrap();

                // Read the config file to determine if kiosk_mode is enabled
                let config = store::read_config_file(Arc::clone(&logger_setup)).unwrap();

                // Get the app handle and the webview window
                let handle = app.app_handle();
                let main_window = handle.get_webview_window("main").unwrap(); // Use `get_webview_window`

                // Check if kiosk_mode is true, and set fullscreen based on it
                if config.kiosk_mode {
                    if let Err(e) = main_window.set_fullscreen(true) {
                        logger_setup
                            .log(LogLevel::ERROR, &format!("Failed to set fullscreen: {}", e))
                            .unwrap();
                    } else {
                        logger_setup
                            .log(LogLevel::INFO, "Window set to fullscreen (kiosk mode)")
                            .unwrap();
                    }
                } else {
                    logger_setup
                        .log(
                            LogLevel::INFO,
                            "Kiosk mode is disabled, starting in normal windowed mode",
                        )
                        .unwrap();
                }

                // Menu creation
                let about_item = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
                let config_item =
                    MenuItem::with_id(app, "config", "Configuration", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let restart_item =
                    MenuItem::with_id(app, "restart", "Restart", true, None::<&str>)?;

                let menu =
                    Menu::with_items(app, &[&about_item, &config_item, &restart_item, &quit_item])?;
                logger_setup
                    .log(LogLevel::INFO, "Menu items created")
                    .unwrap();

                // Build the system tray with the menu and attach event listeners
                let tray_logger = Arc::clone(&logger_setup); // Clone logger for use in the event handler closure
                TrayIconBuilder::new()
                    .menu(&menu)
                    .show_menu_on_left_click(true) // Show menu on left click
                    .icon(app.default_window_icon().unwrap().clone()) // Set tray icon
                    .on_menu_event(move |app, event| {
                        let event_logger = Arc::clone(&tray_logger); // Clone logger inside the event handler closure
                        match event.id.0.as_str() {
                            "about" => {
                                event_logger
                                    .log(LogLevel::INFO, "About menu item clicked")
                                    .unwrap();
                                app.emit("navigate-to-about", ()).unwrap();
                            }
                            "config" => {
                                event_logger
                                    .log(LogLevel::INFO, "Configuration menu item clicked")
                                    .unwrap();
                                match store::read_config_file(Arc::clone(&event_logger)) {
                                    Ok(config) => event_logger
                                        .log(
                                            LogLevel::DEBUG,
                                            &format!("Config loaded successfully: {:?}", config),
                                        )
                                        .unwrap(),
                                    Err(e) => event_logger
                                        .log_error(
                                            &format!("Error reading config file: {}", e),
                                            file!(),
                                            "on_menu_event",
                                            line!(),
                                        )
                                        .unwrap(),
                                }
                                app.emit("navigate-to-config", ()).unwrap();
                            }
                            "restart" => {
                                event_logger
                                    .log(LogLevel::INFO, "Restart menu item clicked")
                                    .unwrap();
                                app.restart();
                            }
                            "quit" => {
                                event_logger
                                    .log(LogLevel::INFO, "Quit menu item clicked")
                                    .unwrap();
                                app.exit(0);
                            }
                            _ => {
                                event_logger
                                    .log(
                                        LogLevel::WARN,
                                        &format!("Unhandled menu item: {:?}", event.id),
                                    )
                                    .unwrap();
                            }
                        }
                    })
                    .build(app)?;

                logger_setup
                    .log(LogLevel::INFO, "System tray initialized")
                    .unwrap();
                Ok(())
            }
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_config,
            update_config,
            log_event,
            list_serial_ports,
            continuous_read,
            stop_serial_reading,
            get_serial_health,
            get_app_info,
            listen_kiosk_login,
            request_kiosk_login,
            print_with_options,
            start_human_sensor_monitoring,
            stop_human_sensor_monitoring,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("Error while running Tauri application");
}
