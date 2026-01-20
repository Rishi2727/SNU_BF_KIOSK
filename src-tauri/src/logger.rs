
use chrono::Local; // For timestamps and date handling
use std::env;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

#[derive(Debug)]
pub enum LogLevel {
    DEBUG,
    INFO,
    ERROR,
    WARN,
}

impl LogLevel {
    fn as_str(&self) -> &'static str {
        match self {
            LogLevel::DEBUG => "DEBUG",
            LogLevel::INFO => "INFO",
            LogLevel::ERROR => "ERROR",
            LogLevel::WARN => "WARN",
        }
    }
}

pub struct Logger {
    log_dir: PathBuf,
}

impl Logger {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let app_data_dir = env::var("APPDATA")?; // Get AppData dir (for Windows)
        let config_dir = PathBuf::from(app_data_dir).join("wise-kiosk-app");
        let log_dir = config_dir.join("logs");

        // Create log directory if it doesn't exist
        if !log_dir.exists() {
            fs::create_dir_all(&log_dir)?;
        }

        Ok(Logger { log_dir })
    }

    fn get_log_file_path(&self) -> PathBuf {
        let date = Local::now().format("%Y-%m-%d").to_string(); // Daily log file
        self.log_dir.join(format!("{}.log", date))
    }

    pub fn log(&self, level: LogLevel, message: &str) -> Result<(), Box<dyn std::error::Error>> {
        let now = Local::now().format("[%Y-%m-%d %H:%M:%S:%3f]").to_string();
        let log_file_path = self.get_log_file_path();

        // Open or create the log file and append log
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file_path)?;

        let log_message = format!("{} [{}] {}\n", now, level.as_str(), message);
        file.write_all(log_message.as_bytes())?;
        Ok(())
    }

    pub fn log_error(
        &self,
        message: &str,
        file_name: &str,
        function_name: &str,
        line_number: u32,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let now = Local::now().format("[%Y-%m-%d %H:%M:%S:%3f]").to_string();
        let log_file_path = self.get_log_file_path();

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(log_file_path)?;

        let log_message = format!(
            "{} [ERROR] f@{} | fn@->{} | line@{} {}\n",
            now, file_name, function_name, line_number, message
        );

        file.write_all(log_message.as_bytes())?;
        Ok(())
    }
}
