use crate::logger::{LogLevel, Logger};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use uuid::Uuid;

// Provide default for `protocol` in case it's missing from JSON
fn default_primary_server_url() -> String {
    "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/".to_string()
}

// Provide default for secondary server URL
fn default_secondary_server_url() -> String {
    "http://k-rsv.snu.ac.kr:8012/SEATAPI/".to_string()
}

// Provide default for QR server URL
fn default_qr_server_url() -> String {
    "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do".to_string()
}

// Provide default for RFID server URL
fn default_rfid_server_url() -> String {
    "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do".to_string()
}

// Provide default for RFID server URL
fn default_manager_ip_url() -> String {
    "http://192.168.1.3:5841".to_string()
}

/// Provide default popup timers
fn default_popup_timers() -> Vec<PopupTimer> {
    vec![
        PopupTimer {
            ID: 1,
            name: "KEYBOARD TIMER".to_string(),
            time: Some(30),
            state: true,
        },
        PopupTimer {
            ID: 2,
            name: "HISTORY PAGE TIMER".to_string(),
            time: Some(15),
            state: true,
        },
        PopupTimer {
            ID: 3,
            name: "SUCCESS TIMER".to_string(),
            time: Some(2),
            state: true,
        },
        PopupTimer {
            ID: 4,
            name: "ERROR TIMER".to_string(),
            time: Some(3),
            state: true,
        },
        PopupTimer {
            ID: 5,
            name: "WARNING TIMER".to_string(),
            time: Some(3),
            state: true,
        },
        PopupTimer {
            ID: 6,
            name: "PRINTER TIMER".to_string(),
            time: Some(5),
            state: true,
        },
        PopupTimer {
            ID: 7,
            name: "LOG OUT TIMER".to_string(),
            time: Some(180),
            state: true,
        },
        PopupTimer {
            ID: 8,
            name: "LOG OUT FLOOR TIMER".to_string(),
            time: Some(180),
            state: true,
        },
        PopupTimer {
            ID: 9,
            name: "SESSION TIMER REMINDER".to_string(),
            time: Some(60),
            state: true,
        },
        PopupTimer {
            ID: 10,
            name: "RESET TIMER ON TOUCH".to_string(),
            time: None,
            state: true,
        },
    ]
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct SerialData {
    pub ID: u32,
    pub port: String,
    pub baudrate: u32,
    pub name: String,
    pub stopbit: u32,
    pub databit: u32,
    pub parity: u32,
}

/// Popup Timer Configuration
/// Manages timeout durations and states for various UI popups/modals
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct PopupTimer {
    pub ID: u32,                                       // Unique identifier for the timer
    pub name: String,                                  // Timer name (e.g., "KEYBOARD TIMER", "HISTORY PAGE TIMER")
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub time: Option<u32>,                             // Timeout duration in seconds (optional - omit if not needed)
    pub state: bool,                                   // State: true (active) or false (inactive)
}

#[derive(Debug, Deserialize, Serialize)]
pub struct Config {
    pub machineId: String,
    #[serde(default = "default_primary_server_url")]
    pub primary_server_url: String,
    #[serde(default = "default_secondary_server_url")]
    pub secondary_server_url: String,
    #[serde(default = "default_qr_server_url")]
    pub qr_server_url: String,
    #[serde(default = "default_rfid_server_url")]
    pub rfid_server_url: String,
    #[serde(default = "default_manager_ip_url")]
    pub manager_ip_url: String,
    pub kiosk_mode: bool,
    pub debug_mode: bool,
    pub serialdata: Vec<SerialData>,
    #[serde(default = "default_popup_timers")]
    pub popup_timers: Vec<PopupTimer>,
}

// Ensure the config file exists, otherwise create a default one
pub fn ensure_config_exists(logger: Arc<Logger>) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_data_dir = env::var("APPDATA").map_err(|e| {
        logger
            .log_error(
                &format!("Failed to get APPDATA: {}", e),
                file!(),
                "ensure_config_exists",
                line!(),
            )
            .unwrap();
        e
    })?;

    let config_dir = PathBuf::from(app_data_dir).join("wise-neosco-kiosk-snu");
    let config_file_path = config_dir.join("configuration.dll");

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to create config directory: {}", e),
                    file!(),
                    "ensure_config_exists",
                    line!(),
                )
                .unwrap();
            e
        })?;
    }

    if !config_file_path.exists() {
        let default_config = Config {
            machineId: Uuid::new_v4().to_string(),
            primary_server_url: "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING".to_string(),
            secondary_server_url: "http://k-rsv.snu.ac.kr:8012/SEATAPI".to_string(),
            qr_server_url: "https://libapp.snu.ac.kr/SNU_MOB".to_string(),
            rfid_server_url: "https://libapp.snu.ac.kr/SNU_MOB".to_string(),
            manager_ip_url: "http://192.168.1.3:5841".to_string(),
            kiosk_mode: true,
            debug_mode: false,
            serialdata: vec![
                SerialData {
                    ID: 1,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "RFID".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 2,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "QR".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 3,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "BARCODE".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 4,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "BIOMATRIC".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 5,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "FACE".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 6,
                    port: "".to_string(),
                    baudrate: 0,
                    name: "PRINTER".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
                SerialData {
                    ID: 7,
                    port: "".to_string(),
                    baudrate: 9600,
                    name: "HUMAN_SENSOR".to_string(),
                    stopbit: 1,
                    databit: 8,
                    parity: 0,
                },
            ],
            popup_timers: vec![
                PopupTimer {
                    ID: 1,
                    name: "KEYBOARD TIMER".to_string(),
                    time: Some(30),
                    state: true,
                },
                PopupTimer {
                    ID: 2,
                    name: "HISTORY PAGE TIMER".to_string(),
                    time: Some(15),
                    state: true,
                },
                PopupTimer {
                    ID: 3,
                    name: "SUCCESS TIMER".to_string(),
                    time: Some(2),
                    state: true,
                },
                PopupTimer {
                    ID: 4,
                    name: "ERROR TIMER".to_string(),
                    time: Some(3),
                    state: true,
                },
                PopupTimer {
                    ID: 5,
                    name: "WARNING TIMER".to_string(),
                    time: Some(3),
                    state: true,
                },
                PopupTimer {
                    ID: 6,
                    name: "PRINTER TIMER".to_string(),
                    time: Some(5),
                    state: true,
                },
                PopupTimer {
                    ID: 7,
                    name: "LOG OUT TIMER".to_string(),
                    time: Some(180),
                    state: true,
                },
                PopupTimer {
                    ID: 8,
                    name: "LOG OUT FLOOR TIMER".to_string(),
                    time: Some(180),
                    state: true,
                },
                PopupTimer {
                    ID: 9,
                    name: "SESSION TIMER REMINDER".to_string(),
                    time: Some(60),
                    state: true,
                },
                PopupTimer {
                    ID: 10,
                    name: "RESET TIMER ON TOUCH".to_string(),
                    time: None,
                    state: true,
                },
            ],
        };

        let mut file = File::create(&config_file_path).map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to create config file: {}", e),
                    file!(),
                    "ensure_config_exists",
                    line!(),
                )
                .unwrap();
            e
        })?;

        file.write_all(serde_json::to_string_pretty(&default_config)?.as_bytes())
            .map_err(|e| {
                logger
                    .log_error(
                        &format!("Failed to write to config file: {}", e),
                        file!(),
                        "ensure_config_exists",
                        line!(),
                    )
                    .unwrap();
                e
            })?;

        logger
            .log(LogLevel::INFO, "Default config file created successfully")
            .unwrap();
    }

    Ok(config_file_path)
}

// Read the config file
pub fn read_config_file(logger: Arc<Logger>) -> Result<Config, Box<dyn std::error::Error>> {
    let config_file_path = ensure_config_exists(Arc::clone(&logger))?;

    let config_content = fs::read_to_string(&config_file_path).map_err(|e| {
        logger
            .log_error(
                &format!("Failed to read config file: {}", e),
                file!(),
                "read_config_file",
                line!(),
            )
            .unwrap();
        e
    })?;

    let config: Config = serde_json::from_str(&config_content).map_err(|e| {
        logger
            .log_error(
                &format!("Failed to parse config file: {}", e),
                file!(),
                "read_config_file",
                line!(),
            )
            .unwrap();
        e
    })?;

    logger
        .log(LogLevel::INFO, "Config file read successfully")
        .unwrap();
    Ok(config)
}

pub fn update_config_key(
    logger: Arc<Logger>,
    key: &str,
    value: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let config_file_path = ensure_config_exists(Arc::clone(&logger))?;
    let mut config = read_config_file(Arc::clone(&logger))?;

    match key {
        "primary_server_url" => config.primary_server_url = value.to_string(),
        "secondary_server_url" => config.secondary_server_url = value.to_string(),
        "qr_server_url" => config.qr_server_url = value.to_string(),
        "rfid_server_url" => config.rfid_server_url = value.to_string(),
        "manager_ip_url" => config.manager_ip_url = value.to_string(),
        "serialdata" => {
            let updated_serialdata: Vec<SerialData> = serde_json::from_str(value).map_err(|e| {
                logger
                    .log_error(
                        &format!("Failed to parse serialdata JSON: {}", e),
                        file!(),
                        "update_config_key",
                        line!(),
                    )
                    .unwrap();
                e
            })?;
            config.serialdata = updated_serialdata;
        }
        "kiosk_mode" => {
            config.kiosk_mode = value.parse::<bool>().map_err(|e| {
                logger
                    .log_error(
                        &format!("Failed to parse kiosk_mode value: {}", e),
                        file!(),
                        "update_config_key",
                        line!(),
                    )
                    .unwrap();
                e
            })?;
        }
        _ => {
            logger
                .log(LogLevel::WARN, &format!("Unknown key: {}", key))
                .unwrap();
            return Ok(());
        }
    }

    let updated_content = serde_json::to_string_pretty(&config).map_err(|e| {
        logger
            .log_error(
                &format!("Failed to serialize config: {}", e),
                file!(),
                "update_config_key",
                line!(),
            )
            .unwrap();
        e
    })?;

    let mut file = File::create(config_file_path).map_err(|e| {
        logger
            .log_error(
                &format!("Failed to write config file: {}", e),
                file!(),
                "update_config_key",
                line!(),
            )
            .unwrap();
        e
    })?;

    file.write_all(updated_content.as_bytes())?;

    logger
        .log(
            LogLevel::INFO,
            &format!("Config updated successfully for key: {}", key),
        )
        .unwrap();
    Ok(())
}
