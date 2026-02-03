use crate::logger::{LogLevel, Logger};
use crate::store::read_config_file;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiResponse {
    pub success: bool,
    pub code: u16,
    pub data: Option<serde_json::Value>,
    pub msg: String,
}

const RELEASE_VERSION: &str = "1.1.3";

static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(reqwest::Client::new);

async fn make_kiosk_login_request(logger: Arc<Logger>) -> Result<ApiResponse, String> {
    let config = read_config_file(Arc::clone(&logger))
        .map_err(|e| format!("Error reading config: {}", e))?;

    // Use primary_server_url which is already a complete URL
    let base_url = config.primary_server_url.trim_end_matches('/');

    let endpoint = format!(
        "api/v1/kiosk/login/{}?version={}",
        config.machineId, RELEASE_VERSION
    );

    let api_url = format!("{}{}", base_url, endpoint);

    logger
        .log(
            LogLevel::INFO,
            &format!("Starting API call to: {}", api_url),
        )
        .unwrap();

    match HTTP_CLIENT
        .get(&api_url)
        .header("x-kiosk-uuid", &config.machineId)
        .header("x-kiosk-version", RELEASE_VERSION)
        .header("x-machine-id", &config.machineId)
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            let headers = response.headers().clone();
            let body_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read body".to_string());

            logger
                .log(LogLevel::INFO, &format!("Status: {}", status))
                .unwrap();
            logger
                .log(LogLevel::INFO, &format!("Headers: {:?}", headers))
                .unwrap();
            logger
                .log(LogLevel::INFO, &format!("Raw response body: {}", body_text))
                .unwrap();

            match serde_json::from_str::<ApiResponse>(&body_text) {
                Ok(api_data) => {
                    logger.log(LogLevel::INFO, "API call successful").unwrap();
                    if status.is_success() {
                        Ok(api_data)
                    } else {
                        logger
                            .log(
                                LogLevel::ERROR,
                                &format!("API call failed with status: {}", status),
                            )
                            .unwrap();
                        Err(format!("{}", api_data.msg))
                    }
                }
                Err(err) => {
                    logger
                        .log(
                            LogLevel::ERROR,
                            &format!("Error decoding response: {}", err),
                        )
                        .unwrap();
                    Err(format!("Error decoding response: {}", err))
                }
            }
        }
        Err(err) => {
            logger
                .log(LogLevel::ERROR, &format!("API call error: {}", err))
                .unwrap();
            Err(format!(
                "{}",
                "Network error. Please check your internet connection and try again."
            ))
        }
    }
}

#[tauri::command]
pub async fn listen_kiosk_login(
    app_handle: AppHandle,
    logger: State<'_, Arc<Logger>>,
) -> Result<(), String> {
    match make_kiosk_login_request(Arc::clone(&logger)).await {
        Ok(api_data) => {
            app_handle
                .emit("api-data-received", api_data.clone())
                .map_err(|e| format!("Failed to emit event: {}", e))?;
            Ok(())
        }
        Err(err) => Err(err),
    }
}

#[tauri::command]
pub async fn request_kiosk_login(logger: State<'_, Arc<Logger>>) -> Result<ApiResponse, String> {
    make_kiosk_login_request(Arc::clone(&logger)).await
}
