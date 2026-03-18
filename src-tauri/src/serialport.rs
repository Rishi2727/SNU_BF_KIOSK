use crate::logger::{LogLevel, Logger};
use encoding_rs::EUC_KR;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use serialport::{available_ports, DataBits, Parity, SerialPort, StopBits};
use std::collections::HashMap;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc, Mutex,
};
use std::thread;
use std::thread::JoinHandle;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

// How often to poll OS port list while waiting for a disconnected port to reappear
const RECONNECT_POLL_MS: u64 = 2_000;

// =============================================================================
// Human Sensor State
// =============================================================================
pub struct HumanSensorState {
    port: Option<Box<dyn SerialPort>>,
    continue_monitoring: Arc<AtomicBool>,
    thread_handle: Option<JoinHandle<()>>,
}

impl HumanSensorState {
    pub fn new() -> Self {
        HumanSensorState {
            port: None,
            continue_monitoring: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
        }
    }
}

lazy_static! {
    pub static ref HUMAN_SENSOR_STATE: Mutex<HumanSensorState> =
        Mutex::new(HumanSensorState::new());
}

// =============================================================================
// Per-port serial state entry
// =============================================================================
pub struct PortState {
    pub abort: Arc<AtomicBool>,
    pub thread_handle: Option<JoinHandle<()>>,
    pub start_time: std::time::SystemTime,
    pub read_count: Arc<std::sync::atomic::AtomicU64>,
    pub error_count: Arc<std::sync::atomic::AtomicU64>,
    pub is_connected: Arc<AtomicBool>,
}

impl PortState {
    pub fn new() -> Self {
        PortState {
            abort: Arc::new(AtomicBool::new(false)),
            thread_handle: None,
            start_time: std::time::SystemTime::now(),
            read_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            error_count: Arc::new(std::sync::atomic::AtomicU64::new(0)),
            is_connected: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Signal abort and extract the JoinHandle.
    /// Caller must join OUTSIDE the mutex lock to avoid deadlock.
    pub fn begin_stop(&mut self) -> Option<JoinHandle<()>> {
        self.abort.store(true, Ordering::SeqCst);
        self.is_connected.store(false, Ordering::SeqCst);
        self.thread_handle.take()
    }
}

// =============================================================================
// Global port map — keyed by port name (e.g. "COM5", "COM6", "/dev/ttyUSB0")
//
// Each port gets its own independent PortState. Starting COM6 never touches
// COM5's abort flag or thread — no more death-loop between ports.
// =============================================================================
lazy_static! {
    pub static ref PORT_MAP: Mutex<HashMap<String, PortState>> =
        Mutex::new(HashMap::new());
}

// =============================================================================
// Health — aggregated across all active ports
// =============================================================================
#[derive(Serialize)]
pub struct SerialHealthInfo {
    uptime_seconds: u64,
    read_count: u64,
    error_count: u64,
    is_connected: bool,
    active_ports: Vec<String>,
}

#[tauri::command]
pub fn get_serial_health(
    logger: tauri::State<'_, Arc<Logger>>,
) -> Result<SerialHealthInfo, String> {
    logger
        .log(LogLevel::INFO, "Getting serial port health information")
        .ok();

    let map = match PORT_MAP.lock() {
        Ok(m) => m,
        Err(p) => {
            logger
                .log_error(
                    "Mutex poisoned in get_serial_health",
                    file!(),
                    "get_serial_health",
                    line!(),
                )
                .ok();
            p.into_inner()
        }
    };

    let mut total_read = 0u64;
    let mut total_error = 0u64;
    let mut any_connected = false;
    let mut active_ports = Vec::new();
    let mut oldest_start = std::time::SystemTime::now();

    for (port_name, state) in map.iter() {
        total_read += state.read_count.load(Ordering::SeqCst);
        total_error += state.error_count.load(Ordering::SeqCst);
        if state.is_connected.load(Ordering::SeqCst) {
            any_connected = true;
            active_ports.push(port_name.clone());
        }
        if state.start_time < oldest_start {
            oldest_start = state.start_time;
        }
    }

    Ok(SerialHealthInfo {
        uptime_seconds: oldest_start.elapsed().unwrap_or_default().as_secs(),
        read_count: total_read,
        error_count: total_error,
        is_connected: any_connected,
        active_ports,
    })
}

// =============================================================================
// list_serial_ports
// =============================================================================
#[tauri::command]
pub fn list_serial_ports(logger: tauri::State<'_, Arc<Logger>>) -> Result<Vec<String>, String> {
    logger
        .log(LogLevel::INFO, "Listing available serial ports")
        .ok();
    available_ports()
        .map(|v| v.into_iter().map(|p| p.port_name).collect())
        .map_err(|e| {
            logger
                .log_error(
                    &format!("Failed to list ports: {}", e),
                    file!(),
                    "list_serial_ports",
                    line!(),
                )
                .ok();
            e.to_string()
        })
}

// =============================================================================
// stop_serial_reading
// Accepts an optional port_name:
//   - Some("COM5") -> stops only COM5, all other ports untouched
//   - None         -> stops ALL ports (app shutdown / full reset)
// =============================================================================
#[tauri::command]
pub fn stop_serial_reading(
    port_name: Option<String>,
    logger: tauri::State<'_, Arc<Logger>>,
) -> Result<(), String> {
    logger
        .log(
            LogLevel::INFO,
            &format!("Stopping serial reading (port={:?})", port_name),
        )
        .ok();

    // Collect handles to join OUTSIDE the lock to prevent deadlock
    let handles: Vec<(String, JoinHandle<()>)> = {
        let mut map = match PORT_MAP.lock() {
            Ok(m) => m,
            Err(p) => {
                logger
                    .log_error(
                        "Mutex poisoned in stop_serial_reading",
                        file!(),
                        "stop_serial_reading",
                        line!(),
                    )
                    .ok();
                p.into_inner()
            }
        };

        match &port_name {
            Some(pn) => {
                if let Some(state) = map.get_mut(pn) {
                    if let Some(h) = state.begin_stop() {
                        vec![(pn.clone(), h)]
                    } else {
                        vec![]
                    }
                } else {
                    vec![]
                }
            }
            None => map
                .iter_mut()
                .filter_map(|(name, state)| state.begin_stop().map(|h| (name.clone(), h)))
                .collect(),
        }
    }; // mutex released here

    for (pn, h) in handles {
        match h.join() {
            Ok(()) => println!("[SERIAL] Watcher stopped for {}.", pn),
            Err(_) => println!("[SERIAL] Watcher panicked for {}.", pn),
        }
    }

    // Remove stopped entries from map
    {
        let mut map = match PORT_MAP.lock() {
            Ok(m) => m,
            Err(p) => p.into_inner(),
        };
        match &port_name {
            Some(pn) => {
                map.remove(pn);
            }
            None => {
                map.clear();
            }
        }
    }

    logger
        .log(LogLevel::INFO, "Serial port reading stopped")
        .ok();
    Ok(())
}

// =============================================================================
// continuous_read
// Spawns a watcher thread for ONE specific port.
// Only stops and replaces the entry for THAT port — all other ports untouched.
// The watcher thread automatically reconnects when the port is replugged.
// =============================================================================
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
            &format!(
                "continuous_read port={} baud={} device={}",
                port_name, baud_rate, device_name
            ),
        )
        .ok();

    // Stop only THIS port's previous session (not any other port)
    let old_handle: Option<JoinHandle<()>> = {
        let mut map = match PORT_MAP.lock() {
            Ok(m) => m,
            Err(p) => {
                logger
                    .log_error("Mutex poisoned", file!(), "continuous_read", line!())
                    .ok();
                p.into_inner()
            }
        };
        if let Some(state) = map.get_mut(&port_name) {
            state.begin_stop()
        } else {
            None
        }
    }; // mutex released
    if let Some(h) = old_handle {
        h.join().ok();
    }

    // Build fresh per-port state
    let abort = Arc::new(AtomicBool::new(false));
    let read_count = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let error_count = Arc::new(std::sync::atomic::AtomicU64::new(0));
    let is_connected = Arc::new(AtomicBool::new(false));

    let handle = thread::Builder::new()
        .name(format!("serial-watcher-{}", port_name))
        .spawn({
            let pn = port_name.clone();
            let dn = device_name.clone();
            let a = abort.clone();
            let rc = read_count.clone();
            let ec = error_count.clone();
            let ic = is_connected.clone();
            let app = app_handle.clone();
            move || run_serial_watcher(app, pn, dn, baud_rate, a, rc, ec, ic)
        })
        .map_err(|e| format!("Failed to spawn watcher: {}", e))?;

    // Insert into the per-port map
    {
        let mut map = match PORT_MAP.lock() {
            Ok(m) => m,
            Err(p) => p.into_inner(),
        };
        let mut state = PortState::new();
        state.abort = abort;
        state.read_count = read_count;
        state.error_count = error_count;
        state.is_connected = is_connected;
        state.thread_handle = Some(handle);
        map.insert(port_name.clone(), state);
    }

    println!("[SERIAL] Watcher started for {}", port_name);
    Ok(())
}

// =============================================================================
// Serial Watcher Thread
// Loop: open port -> read STX/ETX frames -> on error -> wait -> reopen
// This is the core auto-reconnect loop.
// =============================================================================
fn run_serial_watcher(
    app: AppHandle,
    port_name: String,
    device_name: String,
    baud_rate: u32,
    abort: Arc<AtomicBool>,
    read_count: Arc<std::sync::atomic::AtomicU64>,
    error_count: Arc<std::sync::atomic::AtomicU64>,
    is_connected: Arc<AtomicBool>,
) {
    println!("[SERIAL-WATCHER] Started for {} (device={})", port_name, device_name);

    loop {
        if abort.load(Ordering::SeqCst) {
            break;
        }

        match serialport::new(&port_name, baud_rate)
            .data_bits(DataBits::Eight)
            .stop_bits(StopBits::One)
            .parity(Parity::None)
            .timeout(Duration::from_millis(200))
            .open()
        {
            Err(e) => {
                let msg = format!("Cannot open {}: {}", port_name, e);
                println!("[SERIAL-WATCHER] {}", msg);
                is_connected.store(false, Ordering::SeqCst);
                error_count.fetch_add(1, Ordering::SeqCst);
                let _ = app.emit(
                    "serial-status",
                    serde_json::json!({
                        "port": port_name,
                        "device": device_name,
                        "status": "error",
                        "error": msg
                    }),
                );
                // Wait for port to reappear in OS device list before retrying
                wait_for_port_reappear(&port_name, &abort);
                if abort.load(Ordering::SeqCst) {
                    break;
                }
                println!("[SERIAL-WATCHER] {} reappeared — reopening", port_name);
            }
            Ok(mut port) => {
                println!("[SERIAL-WATCHER] {} opened", port_name);
                is_connected.store(true, Ordering::SeqCst);
                let _ = app.emit(
                    "serial-status",
                    serde_json::json!({
                        "port": port_name,
                        "device": device_name,
                        "status": "running"
                    }),
                );

                let mut collecting = false;
                let mut data_buffer: Vec<u8> = Vec::with_capacity(1024);
                const MAX_BUF: usize = 4096;
                const TIMEOUT_MS: u128 = 5_000;
                let mut col_start = std::time::Instant::now();
                let mut port_error = false;

                while !abort.load(Ordering::SeqCst) {
                    let mut buf = [0u8; 1];

                    // Guard against stuck partial frames
                    if collecting && col_start.elapsed().as_millis() > TIMEOUT_MS {
                        println!("[SERIAL-WATCHER] Frame timeout — clearing buffer");
                        data_buffer.clear();
                        collecting = false;
                    }

                    match port.read_exact(&mut buf) {
                        Ok(_) => {
                            read_count.fetch_add(1, Ordering::SeqCst);
                            match buf[0] {
                                0x02 => {
                                    // STX — start of frame
                                    collecting = true;
                                    data_buffer.clear();
                                    col_start = std::time::Instant::now();
                                }
                                0x03 if collecting => {
                                    // ETX — end of frame, emit to frontend
                                    if !data_buffer.is_empty() {
                                        let data =
                                            String::from_utf8_lossy(&data_buffer).to_string();
                                        println!(
                                            "[SERIAL-WATCHER] Frame from {}: {}",
                                            device_name, data
                                        );
                                        let _ = app.emit(
                                            "serial-data",
                                            serde_json::json!({
                                                "device_name": device_name.clone(),
                                                "data": data
                                            }),
                                        );
                                    }
                                    data_buffer.clear();
                                    collecting = false;
                                }
                                _ if collecting => {
                                    if data_buffer.len() < MAX_BUF {
                                        data_buffer.push(buf[0]);
                                    } else {
                                        println!("[SERIAL-WATCHER] Buffer overflow — clearing");
                                        data_buffer.clear();
                                        collecting = false;
                                    }
                                }
                                _ => {}
                            }
                        }
                        Err(e) if e.kind() == std::io::ErrorKind::TimedOut => {
                            thread::yield_now();
                            continue;
                        }
                        Err(e) => {
                            error_count.fetch_add(1, Ordering::SeqCst);
                            println!(
                                "[SERIAL-WATCHER] Read error on {}: {} — will reconnect",
                                port_name, e
                            );
                            is_connected.store(false, Ordering::SeqCst);
                            let _ = app.emit(
                                "serial-status",
                                serde_json::json!({
                                    "port": port_name,
                                    "device": device_name,
                                    "status": "error",
                                    "error": format!("{}", e)
                                }),
                            );
                            port_error = true;
                            break; // break inner loop → outer loop reconnects
                        }
                    }
                }

                is_connected.store(false, Ordering::SeqCst);

                if abort.load(Ordering::SeqCst) {
                    break;
                }

                if port_error {
                    // Port was physically disconnected — poll until it comes back
                    wait_for_port_reappear(&port_name, &abort);
                    if abort.load(Ordering::SeqCst) {
                        break;
                    }
                    println!("[SERIAL-WATCHER] {} back — reopening", port_name);
                } else {
                    break;
                }
            }
        }
    }

    is_connected.store(false, Ordering::SeqCst);
    let _ = app.emit(
        "serial-status",
        serde_json::json!({
            "port": port_name,
            "device": device_name,
            "status": "stopped"
        }),
    );
    println!("[SERIAL-WATCHER] Exited for {}", port_name);
}

// =============================================================================
// Shared helper — poll OS port list until port reappears or stop flag is set
// =============================================================================
fn wait_for_port_reappear(port_name: &str, stop: &Arc<AtomicBool>) {
    println!("[WATCHER] Waiting for {} to reconnect...", port_name);
    loop {
        if stop.load(Ordering::SeqCst) {
            return;
        }
        thread::sleep(Duration::from_millis(RECONNECT_POLL_MS));
        let found = available_ports()
            .unwrap_or_default()
            .iter()
            .any(|p| p.port_name.eq_ignore_ascii_case(port_name));
        if found {
            println!(
                "[WATCHER] {} is back — waiting 500ms for driver init",
                port_name
            );
            thread::sleep(Duration::from_millis(500));
            return;
        }
    }
}

// =============================================================================
// print_with_options
// Opens printer port fresh for each job — no persistent connection needed.
// =============================================================================
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
    value: Option<String>,
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
                    &format!("Failed to open printer port: {}", e),
                    file!(),
                    "print_with_options",
                    line!(),
                )
                .ok();
            e.to_string()
        })?;

    // Set 80mm print width at 180 dpi
    let dots = (80.0_f32 * 180.0_f32 / 25.4_f32) as u16;
    let nL = (dots % 256) as u8;
    let nH = (dots / 256) as u8;
    let width_cmd = format!("\x1D\x57{}{}", nL as char, nH as char);
    write_serial(&mut *port, width_cmd.as_bytes()).map_err(|e| e.to_string())?;

    for cmd in print_options.commands {
        match cmd.commandType.as_str() {
            "bold" => {
                write_serial(&mut *port, b"\x1B\x45\x01").map_err(|e| e.to_string())?;
            }
            "unbold" => {
                write_serial(&mut *port, b"\x1B\x45\x00").map_err(|e| e.to_string())?;
            }
            "normal_text" => {
                write_serial(&mut *port, b"\x1D\x21\x00").map_err(|e| e.to_string())?;
            }
            "small_text" => {
                write_serial(&mut *port, b"\x1D\x21\x01").map_err(|e| e.to_string())?;
            }
            "medium_text" => {
                write_serial(&mut *port, b"\x1D\x21\x11").map_err(|e| e.to_string())?;
            }
            "large_text" => {
                write_serial(&mut *port, b"\x1D\x21\x33").map_err(|e| e.to_string())?;
            }
            "blank_line" => {
                write_serial(&mut *port, b"\n").map_err(|e| e.to_string())?;
            }
            "full_cut" => {
                write_serial(&mut *port, b"\x1D\x56\x00").map_err(|e| e.to_string())?;
            }
            "clear_all" => {
                write_serial(&mut *port, b"\x1B\x40").map_err(|e| e.to_string())?;
            }
            "alignment" => {
                if let Some(value) = cmd.value {
                    let align: &[u8] = match value.as_str() {
                        "left" => b"\x1B\x61\x00",
                        "center" => b"\x1B\x61\x01",
                        "right" => b"\x1B\x61\x02",
                        _ => return Err(format!("Invalid alignment: {}", value)),
                    };
                    write_serial(&mut *port, align).map_err(|e| e.to_string())?;
                }
            }
            "text" => match cmd.value {
                Some(v) => {
                    write_serial(&mut *port, v.as_bytes()).map_err(|e| e.to_string())?;
                }
                None => return Err("Missing value for text command".to_string()),
            },
            "korean_text" => match cmd.value {
                Some(v) => {
                    let (encoded, _, errors) = EUC_KR.encode(&v);
                    if errors {
                        return Err("EUC-KR encoding failed".to_string());
                    }
                    write_serial(&mut *port, b"\x1B\x74\x0B").map_err(|e| e.to_string())?;
                    write_serial(&mut *port, encoded.as_ref()).map_err(|e| e.to_string())?;
                    write_serial(&mut *port, b"\x1B\x74\x00").map_err(|e| e.to_string())?;
                }
                None => return Err("Missing value for korean_text command".to_string()),
            },
            "qr_code" => match cmd.value {
                Some(v) => {
                    if v.len() > 230 {
                        return Err("QR data too long (max 230 bytes)".to_string());
                    }
                    let mut qr: Vec<u8> = Vec::new();
                    qr.extend_from_slice(b"\x1B\x61\x01");
                    qr.extend_from_slice(b"\x1D\x4C\x00\x00");
                    if !v.is_empty() {
                        qr.push(0x1A);
                        qr.push(b'B');
                        qr.push(2);
                        qr.push(v.len() as u8);
                        qr.push(5);
                        qr.extend_from_slice(v.as_bytes());
                        qr.push(0x00);
                        qr.push(b'\n');
                    }
                    write_serial(&mut *port, &qr).map_err(|e| e.to_string())?;
                }
                None => return Err("Missing value for qr_code command".to_string()),
            },
            _ => return Err(format!("Unsupported command: {}", cmd.commandType)),
        }
    }

    Ok(())
}

fn write_serial(port: &mut dyn SerialPort, data: &[u8]) -> Result<usize, std::io::Error> {
    let n = port.write(data)?;
    if n < data.len() {
        eprintln!("[PRINTER] Only wrote {}/{} bytes", n, data.len());
    }
    if let Err(e) = port.flush() {
        eprintln!("[PRINTER] Flush error: {}", e);
    }
    Ok(n)
}

// =============================================================================
// Human Sensor Monitoring — also auto-reconnects on disconnect
// =============================================================================
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
            &format!("start_human_sensor_monitoring port={}", port_name),
        )
        .ok();

    // Stop any existing session first, join outside lock
    let old_handle = {
        let mut g = match HUMAN_SENSOR_STATE.lock() {
            Ok(g) => g,
            Err(p) => {
                logger
                    .log_error(
                        "Mutex poisoned",
                        file!(),
                        "start_human_sensor_monitoring",
                        line!(),
                    )
                    .ok();
                p.into_inner()
            }
        };
        g.continue_monitoring.store(false, Ordering::SeqCst);
        drop(g.port.take());
        g.thread_handle.take()
    };
    if let Some(h) = old_handle {
        h.join().ok();
    }

    let continue_monitoring = Arc::new(AtomicBool::new(true));
    {
        let mut g = match HUMAN_SENSOR_STATE.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        g.continue_monitoring = continue_monitoring.clone();
    }

    let handle = thread::Builder::new()
        .name(format!("hs-watcher-{}", port_name))
        .spawn({
            let pn = port_name.clone();
            let cm = continue_monitoring.clone();
            let app = app_handle.clone();
            move || run_human_sensor_watcher(app, pn, baud_rate, cm)
        })
        .map_err(|e| format!("Failed to spawn human sensor thread: {}", e))?;

    {
        let mut g = match HUMAN_SENSOR_STATE.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        g.thread_handle = Some(handle);
    }

    logger
        .log(LogLevel::INFO, "Human sensor watcher started")
        .ok();
    Ok(())
}

fn run_human_sensor_watcher(
    app: AppHandle,
    port_name: String,
    baud_rate: u32,
    continue_monitoring: Arc<AtomicBool>,
) {
    println!("[HS-WATCHER] Started for {}", port_name);
    let mut last_cts = false;
    let mut last_dsr = false;
    let mut error_logged = false;

    loop {
        if !continue_monitoring.load(Ordering::SeqCst) {
            break;
        }

        match serialport::new(&port_name, baud_rate)
            .data_bits(DataBits::Eight)
            .stop_bits(StopBits::One)
            .parity(Parity::None)
            .timeout(Duration::from_millis(100))
            .open()
        {
            Err(e) => {
                if !error_logged {
                    println!("[HS-WATCHER] Cannot open {}: {} — waiting", port_name, e);
                    error_logged = true;
                }
                wait_for_port_reappear(&port_name, &continue_monitoring);
                if !continue_monitoring.load(Ordering::SeqCst) {
                    break;
                }
                println!("[HS-WATCHER] {} reappeared — reopening", port_name);
                error_logged = false;
            }
            Ok(mut port) => {
                println!("[HS-WATCHER] {} opened", port_name);
                loop {
                    if !continue_monitoring.load(Ordering::SeqCst) {
                        break;
                    }
                    match (port.read_clear_to_send(), port.read_data_set_ready()) {
                        (Ok(cts), Ok(dsr)) => {
                            if cts != last_cts || dsr != last_dsr {
                                println!("[HS-WATCHER] State changed CTS:{} DSR:{}", cts, dsr);
                                let _ = app.emit(
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
                                );
                                last_cts = cts;
                                last_dsr = dsr;
                            }
                        }
                        (Err(e), _) | (_, Err(e)) => {
                            println!("[HS-WATCHER] Error on {}: {} — reconnecting", port_name, e);
                            // Emit cleared state so frontend knows sensor is gone
                            let _ = app.emit(
                                "human-sensor-state",
                                serde_json::json!({
                                    "cts": false,
                                    "dsr": false,
                                    "detected": false,
                                    "timestamp": std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap_or_default()
                                        .as_millis()
                                }),
                            );
                            last_cts = false;
                            last_dsr = false;
                            break; // break inner → outer will reconnect
                        }
                    }
                    thread::sleep(Duration::from_millis(50));
                }

                if !continue_monitoring.load(Ordering::SeqCst) {
                    break;
                }
                wait_for_port_reappear(&port_name, &continue_monitoring);
                if !continue_monitoring.load(Ordering::SeqCst) {
                    break;
                }
                println!("[HS-WATCHER] {} back — reopening", port_name);
            }
        }
    }
    println!("[HS-WATCHER] Exited for {}", port_name);
}

#[tauri::command]
pub fn stop_human_sensor_monitoring(logger: tauri::State<'_, Arc<Logger>>) -> Result<(), String> {
    logger
        .log(LogLevel::INFO, "Stopping human sensor monitoring")
        .ok();

    let handle = {
        let mut g = match HUMAN_SENSOR_STATE.lock() {
            Ok(g) => g,
            Err(p) => {
                logger
                    .log_error(
                        "Mutex poisoned",
                        file!(),
                        "stop_human_sensor_monitoring",
                        line!(),
                    )
                    .ok();
                p.into_inner()
            }
        };
        g.continue_monitoring.store(false, Ordering::SeqCst);
        drop(g.port.take());
        g.thread_handle.take()
    };

    if let Some(h) = handle {
        match h.join() {
            Ok(()) => println!("[HS-WATCHER] Thread stopped."),
            Err(_) => println!("[HS-WATCHER] Thread panicked."),
        }
    }

    logger
        .log(LogLevel::INFO, "Human sensor monitoring stopped")
        .ok();
    Ok(())
}