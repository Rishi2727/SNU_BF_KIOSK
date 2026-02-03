use crate::logger::{LogLevel, Logger};
use encoding_rs::EUC_KR;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serialport::{available_ports, DataBits, Error, Parity, SerialPort, StopBits};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread::JoinHandle;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// Human Sensor State Structure
pub struct HumanSensorState {
    port: Option<Box<dyn SerialPort>>,
    continue_monitoring: Arc<AtomicBool>,
    thread_handle: Option<JoinHandle<()>>,
}

impl HumanSensorState {
    pub fn new() -> Self {
        HumanSensorState {
            port: None,
            continue_monitoring: Arc::new(AtomicBool::new(true)),
            thread_handle: None,
        }
    }

    pub fn stop_and_close(&mut self) {
        self.continue_monitoring.store(false, Ordering::SeqCst);
        
        if let Some(handle) = self.thread_handle.take() {
            match handle.join() {
                Ok(()) => println!("Human sensor monitoring thread stopped successfully."),
                Err(_) => println!("Error waiting for human sensor thread to stop."),
            }
        }
        
        if let Some(port) = self.port.take() {
            drop(port);
            println!("Human sensor port has been closed.");
        }
    }
}

lazy_static! {
    pub static ref HUMAN_SENSOR_STATE: Mutex<HumanSensorState> = Mutex::new(HumanSensorState::new());
}

pub struct SharedSerialState {
    port: Option<Box<dyn SerialPort>>,
    continue_reading: Arc<AtomicBool>,
    thread_handle: Option<JoinHandle<()>>,
    start_time: std::time::SystemTime,
    read_count: Arc<std::sync::atomic::AtomicU64>,
    error_count: Arc<std::sync::atomic::AtomicU64>,
}

impl SharedSerialState {
    pub fn new() -> Self {
        SharedSerialState {
            port: None,
            continue_reading: Arc::new(AtomicBool::new(true)),
            thread_handle: None,
            start_time: std::time::SystemTime::now(),
            read_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            error_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        }
    }

    pub fn open(
        port_name: &str,
        baud_rate: u32,
        stop_bits: StopBits,
        parity: Parity,
    ) -> Result<Self, Error> {
        let port = serialport::new(port_name, baud_rate)
            .data_bits(DataBits::Eight)
            .stop_bits(stop_bits)
            .parity(parity)
            .timeout(Duration::from_secs(0))
            .open()?;

        Ok(Self {
            port: Some(port),
            continue_reading: Arc::new(AtomicBool::new(true)),
            thread_handle: None,
            start_time: std::time::SystemTime::now(),
            read_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            error_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
        })
    }

    pub fn stop_and_close_port(&mut self) {
        self.continue_reading.store(false, Ordering::SeqCst);
        
        // Wait for thread to finish
        if let Some(handle) = self.thread_handle.take() {
            match handle.join() {
                Ok(()) => println!("Serial port thread stopped successfully."),
                Err(_) => println!("Error waiting for serial port thread to stop."),
            }
        }
        
        if let Some(port) = self.port.take() {
            drop(port);
            println!("Serial port has been closed.");
        }
    }
}

lazy_static! {
    pub static ref SERIAL_STATE: Mutex<SharedSerialState> = Mutex::new(SharedSerialState::new());
}

#[derive(Serialize)]
pub struct SerialHealthInfo {
    uptime_seconds: u64,
    read_count: u64,
    error_count: u64,
    is_connected: bool,
}

#[tauri::command]
pub fn get_serial_health(logger: tauri::State<'_, Arc<Logger>>) -> Result<SerialHealthInfo, String> {
    logger
        .log(LogLevel::INFO, "Getting serial port health information")
        .ok();

    let state_guard = match SERIAL_STATE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            logger.log_error(
                "Mutex was poisoned in get_serial_health, recovering",
                file!(),
                "get_serial_health",
                line!(),
            ).ok();
            poisoned.into_inner()
        }
    };
    
    let uptime = state_guard.start_time.elapsed().unwrap_or_default().as_secs();
    let read_count = state_guard.read_count.load(Ordering::SeqCst);
    let error_count = state_guard.error_count.load(Ordering::SeqCst);
    let is_connected = state_guard.port.is_some();
    
    Ok(SerialHealthInfo {
        uptime_seconds: uptime,
        read_count,
        error_count,
        is_connected,
    })
}

#[tauri::command]
pub fn stop_serial_reading(logger: tauri::State<'_, Arc<Logger>>) -> Result<(), String> {
    logger
        .log(LogLevel::INFO, "Stopping serial port reading")
        .ok();

    let mut state_guard = match SERIAL_STATE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            logger.log_error(
                "Mutex was poisoned in stop_serial_reading, recovering",
                file!(),
                "stop_serial_reading",
                line!(),
            ).ok();
            poisoned.into_inner()
        }
    };
    
    state_guard.stop_and_close_port();
    logger
        .log(LogLevel::INFO, "Serial port reading stopped successfully")
        .ok();
    
    Ok(())
}

#[tauri::command]
pub fn list_serial_ports(logger: tauri::State<'_, Arc<Logger>>) -> Result<Vec<String>, String> {
    logger
        .log(LogLevel::INFO, "Listing available serial ports")
        .ok();

    let ports = available_ports().map_err(|e| {
        logger
            .log_error(
                &format!("Failed to list ports: {}", e),
                file!(),
                "list_serial_ports",
                line!(),
            )
            .ok();
        e.to_string()
    })?;

    Ok(ports.into_iter().map(|p| p.port_name).collect())
}

#[tauri::command]
pub fn continuous_read(
    port_name: String,
    baud_rate: u32,
    device_name: String,
    logger: tauri::State<'_, Arc<Logger>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let logger = Arc::clone(&logger);

    logger
        .log(
            LogLevel::INFO,
            &format!("Starting continuous read on port: {}", port_name),
        )
        .ok();

    let mut state_guard = match SERIAL_STATE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            logger.log_error(
                "Mutex was poisoned, recovering",
                file!(),
                "continuous_read",
                line!(),
            ).ok();
            poisoned.into_inner()
        }
    };
    println!("Mutex locked successfully for SERIAL_STATE.");

    *state_guard = SharedSerialState::open(&port_name, baud_rate, StopBits::One, Parity::None)
        .map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to open port: {}", e),
                    file!(),
                    "continuous_read",
                    line!(),
                )
                .ok();
            e.to_string()
        })?;
    println!("Serial port {} opened successfully.", port_name);

    let continue_reading = state_guard.continue_reading.clone();
    let read_count = state_guard.read_count.clone();
    let error_count = state_guard.error_count.clone();
    let mut port = state_guard.port.take().unwrap();

    let handle = thread::spawn(move || {
        let mut collecting = false;
        let mut data_buffer = Vec::with_capacity(1024); // Pre-allocate with reasonable capacity
        const MAX_BUFFER_SIZE: usize = 4096; // Maximum buffer size to prevent memory leaks
        const COLLECTION_TIMEOUT_MS: u64 = 5000; // 5 second timeout for incomplete data
        
        let mut collection_start_time = std::time::Instant::now();
        println!("Thread for continuous reading started.");

        while continue_reading.load(Ordering::SeqCst) {
            let mut buf = [0u8; 1];
            
            // Check for collection timeout to prevent memory leaks
            if collecting && collection_start_time.elapsed().as_millis() > COLLECTION_TIMEOUT_MS as u128 {
                println!("Collection timeout reached, clearing buffer to prevent memory leak");
                data_buffer.clear();
                collecting = false;
            }
            
            match port.read_exact(&mut buf) {
                Ok(_) => {
                    read_count.fetch_add(1, Ordering::SeqCst);
                    println!("Read byte: {}", buf[0]);
                    let byte_hex = format!("{:#04X}", buf[0]);
                    println!("Read byte in hex: {}", byte_hex);

                    match buf[0] {
                        0x02 => {
                            collecting = true;
                            data_buffer.clear();
                            collection_start_time = std::time::Instant::now();
                            println!("Start of data (STX) detected.");
                        }
                        0x03 if collecting => {
                            println!("End of data (ETX) detected. Buffer: {:?}", data_buffer);
                            if !data_buffer.is_empty() {
                                let data = String::from_utf8_lossy(&data_buffer).to_string();
                                println!("Captured Data: {}", data);
                                
                                // Use Result pattern for error handling instead of expect
                                if let Err(e) = app_handle.emit(
                                    "serial-data",
                                    serde_json::json!({
                                        "device_name": device_name.clone(),
                                        "data": data
                                    }),
                                ) {
                                    println!("Failed to emit serial-data event: {}", e);
                                }
                            }
                            data_buffer.clear();
                            collecting = false;
                        }
                        _ if collecting => {
                            // Prevent buffer overflow
                            if data_buffer.len() < MAX_BUFFER_SIZE {
                                data_buffer.push(buf[0]);
                                println!("Collecting data. Current buffer size: {}", data_buffer.len());
                            } else {
                                println!("Buffer size limit reached ({}), clearing to prevent memory leak", MAX_BUFFER_SIZE);
                                data_buffer.clear();
                                collecting = false;
                            }
                        }
                        _ => {}
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::TimedOut => {
                    // Use thread::yield_now() to prevent busy waiting
                    thread::yield_now();
                    continue;
                }
                Err(e) => {
                    error_count.fetch_add(1, Ordering::SeqCst);
                    println!("Error reading from port: {}", e);
                    break;
                }
            }
        }

        println!("Stopping continuous reading thread.");
    });
    
    // Store the thread handle for proper cleanup
    state_guard.thread_handle = Some(handle);

    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct PrintOptions {
    port_name: String,
    baud_rate: u32,
    commands: Vec<PrintCommand>,
}

#[derive(Debug, Deserialize)]
pub struct PrintCommand {
    #[serde(rename = "type")]
    commandType: String,
    value: Option<String>, // Additional data for certain commands (e.g., alignment)
}

#[tauri::command]
pub fn print_with_options(
    print_options: PrintOptions,
    logger: tauri::State<'_, Arc<Logger>>,
) -> Result<(), String> {
    let logger = Arc::clone(&logger);
    logger.log(LogLevel::INFO, "Starting print job").ok();

    let mut port = serialport::new(&print_options.port_name, print_options.baud_rate)
        .data_bits(DataBits::Eight)
        .stop_bits(StopBits::One)
        .parity(Parity::None)
        .timeout(Duration::from_secs(5))
        .open()
        .map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to open port: {}", e),
                    file!(),
                    "print_with_options",
                    line!(),
                )
                .ok();
            e.to_string()
        })?;

    let assumed_dpi = 180.0; // Adjust this value as needed
    let mm_width = 80.0;
    let dots = (mm_width * assumed_dpi / 25.4) as u16;
    let nL = (dots % 256) as u8;
    let nH = (dots / 256) as u8;
    let print_width_command = format!("\x1D\x57{}{}", nL as char, nH as char);
    write_to_serial_port(&mut *port, print_width_command.as_bytes()).map_err(|e| e.to_string())?;

    // Example: process the commands
    for command in print_options.commands {
        match command.commandType.as_str() {
            "bold" => {
                let bold_command = "\x1BE\x01"; // Command to enable bold text
                write_to_serial_port(&mut *port, bold_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "unbold" => {
                let unbold_command = "\x1BE\x00"; // Command to disable bold text
                write_to_serial_port(&mut *port, unbold_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "alignment" => {
                if let Some(value) = command.value {
                    let alignment_command = match value.as_str() {
                        "left" => "\x1Ba\x00",
                        "center" => "\x1Ba\x01",
                        "right" => "\x1Ba\x02",
                        _ => return Err(format!("Invalid alignment value: {}", value)),
                    };
                    write_to_serial_port(&mut *port, alignment_command.as_bytes())
                        .map_err(|e| e.to_string())?;
                }
            }
            "text" => {
                if let Some(value) = command.value {
                    write_to_serial_port(&mut *port, value.as_bytes())
                        .map_err(|e| e.to_string())?;
                } else {
                    return Err("Missing text value for text command".to_string());
                }
            }
            "normal_text" => {
                let normal_text_command = "\x1D\x21\x00"; // Command for normal text size
                write_to_serial_port(&mut *port, normal_text_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "small_text" => {
                let small_text_command = "\x1D\x21\x01"; // Command for small text size
                write_to_serial_port(&mut *port, small_text_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "medium_text" => {
                let large_text_command = "\x1D!\x11"; // Command for large text size
                write_to_serial_port(&mut *port, large_text_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "large_text" => {
                let large_text_command = "\x1D\x21\x11"; // Command for large text size
                write_to_serial_port(&mut *port, large_text_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "korean_text" => {
                if let Some(value) = command.value {
                    // Encode Korean text using EUC-KR
                    let (encoded, _, had_errors) = EUC_KR.encode(&value);
                    if had_errors {
                        return Err("Encoding failed for Korean text".to_string());
                    }

                    // Command to select the code page for Korean characters, if necessary
                    let select_korean_command = "\x1B\x74\x0B"; // ESC t n - Check this command for your printer model
                    write_to_serial_port(&mut *port, select_korean_command.as_bytes())
                        .map_err(|e| e.to_string())?;

                    // Send the encoded text directly
                    write_to_serial_port(&mut *port, encoded.as_ref())
                        .map_err(|e| e.to_string())?;

                    // Optionally reset to default character code table if needed
                    let reset_code_table = "\x1B\x74\x00"; // Reset to default page
                    write_to_serial_port(&mut *port, reset_code_table.as_bytes())
                        .map_err(|e| e.to_string())?;
                } else {
                    return Err("Missing text value for Korean text command".to_string());
                }
            }
            "blank_line" => {
                // Command to print a blank line
                let blank_line_command = "\n"; // Assuming a newline is sufficient for a blank line
                write_to_serial_port(&mut *port, blank_line_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "full_cut" => {
                // Command for full cut (example command, adjust as needed)
                let full_cut_command = "\x1DV\x00"; // Example command for full cut
                write_to_serial_port(&mut *port, full_cut_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "clear_all" => {
                // Command to clear all settings (example command, adjust as needed)
                let clear_all_command = "\x1B\x40"; // Example command to reset printer settings
                write_to_serial_port(&mut *port, clear_all_command.as_bytes())
                    .map_err(|e| e.to_string())?;
            }
            "qr_code" => {
                if let Some(value) = command.value {
                    if value.len() > 230 {
                        // Adjust based on your QR code data capacity needs
                        return Err("Data too long for QR code capacity".to_string());
                    }

                    let mut command_bytes = Vec::new();

                    // Center alignment for CODE type
                    command_bytes.extend_from_slice(b"\x1Ba\x01"); // ESC a 1 (Center Alignment)

                    // Settings (Using example values, replace with actual settings if needed)
                    let _height: u8 = 5; // Example height
                    let _width: u8 = 5; // Example width
                    let margin: u8 = 0; // Example margin (multiplied by 8 for mm conversion)

                    // Margin setting for the printer
                    let margin_mm = margin * 8;
                    command_bytes.push(0x1D);
                    command_bytes.push(b'L');
                    command_bytes.push(margin_mm);
                    command_bytes.push(0x00);

                    // Check for 2D barcode (QR Code) and append the corresponding command
                    if value.len() > 0 {
                        // Assuming 'VIEW' check translates to this
                        command_bytes.push(0x1A);
                        command_bytes.push(b'B');
                        command_bytes.push(2); // Constant indicating QR Code in your Node.js example
                        command_bytes.push(value.len() as u8); // Length of the data to be encoded
                        command_bytes.push(5); // Placeholder, adjust if necessary
                        command_bytes.extend_from_slice(value.as_bytes());
                        command_bytes.push(0x00); // Null terminator for string
                        command_bytes.push(b'\n'); // New line if needed (check your printer's requirements)
                    }

                    // Write the complete command to the serial port
                    write_to_serial_port(&mut *port, &command_bytes).map_err(|e| e.to_string())?;
                } else {
                    return Err("Missing value for QR code command".to_string());
                }
            }
            // Add other commands like "small_text", "barcode" here as in the original code.
            _ => {
                return Err(format!("Unsupported command type: {}", command.commandType));
            }
        }
    }

    Ok(())
}

fn write_to_serial_port(port: &mut dyn SerialPort, data: &[u8]) -> Result<usize, std::io::Error> {
    match port.write(&data) {
        Ok(nbytes) => {
            if nbytes < data.len() {
                eprintln!(
                    "Warning: Not all data was written to the port. {} bytes written out of {}",
                    nbytes,
                    data.len()
                );
                // Try to flush the port to ensure data is sent
                if let Err(e) = port.flush() {
                    eprintln!("Failed to flush serial port: {}", e);
                }
            } else {
                println!("Data written successfully");
                // Flush the port after successful write
                if let Err(e) = port.flush() {
                    eprintln!("Failed to flush serial port: {}", e);
                }
            }
            Ok(nbytes)
        }
        Err(e) => {
            eprintln!("Failed to write to serial port: {}", e);
            Err(e)
        }
    }
}

// Human Sensor Pin State Structure
#[derive(Debug, Clone, Serialize)]
pub struct PinState {
    cts: bool,
    dsr: bool,
}

#[tauri::command]
pub fn start_human_sensor_monitoring(
    port_name: String,
    baud_rate: u32,
    logger: tauri::State<'_, Arc<Logger>>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let logger = Arc::clone(&logger);

    logger
        .log(
            LogLevel::INFO,
            &format!("Starting human sensor monitoring on port: {}", port_name),
        )
        .ok();

    let mut state_guard = match HUMAN_SENSOR_STATE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            logger.log_error(
                "Mutex was poisoned in start_human_sensor_monitoring, recovering",
                file!(),
                "start_human_sensor_monitoring",
                line!(),
            ).ok();
            poisoned.into_inner()
        }
    };

    // If already monitoring, stop first
    if state_guard.port.is_some() {
        logger
            .log(LogLevel::INFO, "Stopping existing human sensor monitoring")
            .ok();
        state_guard.stop_and_close();
    }

    // Reset the continue_monitoring flag to true for the new session
    state_guard.continue_monitoring.store(true, Ordering::SeqCst);

    // Open the serial port
    let port = serialport::new(&port_name, baud_rate)
        .data_bits(DataBits::Eight)
        .stop_bits(StopBits::One)
        .parity(Parity::None)
        .timeout(Duration::from_millis(100))
        .open()
        .map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to open human sensor port: {}", e),
                    file!(),
                    "start_human_sensor_monitoring",
                    line!(),
                )
                .ok();
            e.to_string()
        })?;

    println!("Human sensor port {} opened successfully.", port_name);

    let continue_monitoring = state_guard.continue_monitoring.clone();
    
    // Clone the port for the thread
    let mut port_for_thread = port.try_clone().map_err(|e| {
        logger
            .log_error(
                &format!("Failed to clone port: {}", e),
                file!(),
                "start_human_sensor_monitoring",
                line!(),
            )
            .ok();
        e.to_string()
    })?;

    let handle = thread::spawn(move || {
        let mut last_state = PinState {
            cts: false,
            dsr: false,
        };

        println!("Human sensor monitoring thread started.");

        while continue_monitoring.load(Ordering::SeqCst) {
            // Read CTS and DSR pin states
            match (port_for_thread.read_clear_to_send(), port_for_thread.read_data_set_ready()) {
                (Ok(cts), Ok(dsr)) => {
                    // Only emit event if state has changed
                    if cts != last_state.cts || dsr != last_state.dsr {
                        let new_state = PinState { cts, dsr };
                        
                        println!(
                            "Human sensor state changed - CTS: {}, DSR: {}",
                            cts, dsr
                        );

                        if let Err(e) = app_handle.emit(
                            "human-sensor-state",
                            serde_json::json!({
                                "cts": cts,
                                "dsr": dsr,
                                "detected": cts || dsr,
                                "timestamp": std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap_or_default()
                                    .as_millis()
                            }),
                        ) {
                            println!("Failed to emit human-sensor-state event: {}", e);
                        }

                        last_state = new_state;
                    }
                }
                (Err(e), _) | (_, Err(e)) => {
                    println!("Error reading pin states: {}", e);
                }
            }

            // Small delay to avoid busy waiting
            thread::sleep(Duration::from_millis(50));
        }

        println!("Human sensor monitoring thread stopped.");
    });

    state_guard.port = Some(port);
    state_guard.thread_handle = Some(handle);

    logger
        .log(LogLevel::INFO, "Human sensor monitoring started successfully")
        .ok();

    Ok(())
}

#[tauri::command]
pub fn stop_human_sensor_monitoring(logger: tauri::State<'_, Arc<Logger>>) -> Result<(), String> {
    logger
        .log(LogLevel::INFO, "Stopping human sensor monitoring")
        .ok();

    let mut state_guard = match HUMAN_SENSOR_STATE.lock() {
        Ok(guard) => guard,
        Err(poisoned) => {
            logger.log_error(
                "Mutex was poisoned in stop_human_sensor_monitoring, recovering",
                file!(),
                "stop_human_sensor_monitoring",
                line!(),
            ).ok();
            poisoned.into_inner()
        }
    };
    
    state_guard.stop_and_close();
    
    logger
        .log(LogLevel::INFO, "Human sensor monitoring stopped successfully")
        .ok();
    
    Ok(())
}
