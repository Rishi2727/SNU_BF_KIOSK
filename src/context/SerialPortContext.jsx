/**
 * SerialPortContext - Manages serial port connections and hardware device communication
 * 
 * Handles:
 * - Serial port initialization and lifecycle management
 * - QR/RFID scanner data processing
 * - Human sensor monitoring
 * - Automatic QR-based authentication
 * - Long-term system stability and cleanup
 */

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { setSerialData } from "../redux/slice/serialData";
import { useVoice } from "./voiceContext";
import { logout } from "../redux/slice/authSlice";
import { QRValidate } from "../services/api";
import { login } from "../redux/slice/authSlice";
import Modal from "../components/common/Modal";

/* ========================================================================== */
/*                           CONTEXT INITIALIZATION                           */
/* ========================================================================== */

const SerialPortContext = createContext();
export const useSerialPort = () => useContext(SerialPortContext);

export const SerialPortProvider = ({ children }) => {
  /* ========================================================================== */
  /*                              STATE MANAGEMENT                              */
  /* ========================================================================== */

  // Serial Port States
  const [listedSerialPorts, setListedSerialPorts] = useState([]);           // Available system ports
  const [serialPortsData, setSerialPortsData] = useState([]);               // Configured ports from config
  const [matchedPorts, setMatchedPorts] = useState([]);                     // Ports available in both config and system
  const [activeSerialConnections, setActiveSerialConnections] = useState(new Set()); // Currently connected ports
  const networkErrorRef = useRef(false);
  // Configuration States
  const [kioskConfiguration, setKioskConfiguration] = useState({});         // Machine UID and version

  // Sensor & Device States
  const [humanDetected, setHumanDetected] = useState(false);                // Human presence sensor state
  const [rfidMessages, setRfidMessages] = useState([]);                     // RFID scan history

  // UI States (for future modal implementations)
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs for Connection Management
  const serialListenerRef = useRef(null);                                   // Serial data event listener
  const connectionTimeoutRef = useRef(null);                                // Connection timeout handler
  const lastConnectionAttemptRef = useRef(0);                               // Debounce connection attempts
  const previousMatchedPortsRef = useRef([]);                               // Track port changes
  const isInitializedRef = useRef(false);                                   // Initial connection flag
  const portCheckIntervalRef = useRef(null);                                // Periodic port check interval

  // Refs for Accessibility Features
  const blockSpeakRef = useRef(false);                                      // Prevent speech outside modals
  const modalShownRef = useRef(false);                                      // Track modal display state
  const focusModeRef = useRef("MODAL");
  // System Health Tracking (for long-term stability)
  const systemHealthRef = useRef({
    startTime: Date.now(),
    connectionCount: 0,
    errorCount: 0,
    lastCleanup: Date.now()
  });

  // Hooks
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const location = useLocation();
  const { speak, stop } = useVoice();
  const navigate = useNavigate();
  const [networkError, setNetworkError] = useState(false);
  const [networkModalButtonFocused, setNetworkModalButtonFocused] = useState(false);
  const networkRecoveredRef = useRef(false);


  /* ========================================================================== */
  /*                      ACCESSIBILITY HELPER FUNCTIONS                        */
  /* ========================================================================== */

  /**
   * Enable focus and speech accessibility for SweetAlert modals
   * 
   * Features:
   * - Announces modal content via text-to-speech
   * - Keyboard navigation between modal text and buttons (use * key to toggle)
   * - Visual focus indicators with orange outline
   * - Enter key to confirm when focused on button
   * - Blocks speech when modal is closed to prevent audio leaks
   * 
   * @param {Function} speak - TTS function from useVoice hook
   * @param {Function} t - Translation function from i18n
   * @returns {Function} Cleanup function to remove event listeners
   */
  const enableFocusAndSpeakPolling = (speak, t) => {
    let keyHandler = null;
    let mode = "TEXT";
    let isClosed = false;

    const popup = Swal.getPopup();
    const titleEl = Swal.getTitle();
    const textEl = popup?.querySelector(".swal2-html-container");
    const okBtn = Swal.getConfirmButton();

    const speakSafe = (msg) => {
      if (blockSpeakRef.current) return;   // 🔥 DO NOT SPEAK OUTSIDE MODAL
      if (isClosed) return;
      try {
        speak(String(msg));
      } catch (err) {
        console.error("Speak error:", err);
      }
    };

    const combinedText =
      (titleEl?.innerText || "") + " " + (textEl?.innerText || "");

    speakSafe(combinedText);

    const applyFocus = () => {
      if (blockSpeakRef.current || isClosed) return;

      [popup, okBtn].forEach((el) => {
        if (!el) return;
        el.style.outline = "none";
        el.style.borderRadius = "";
      });

      popup.style.outline = "6px solid #dc2f02";
      popup.style.borderRadius = "12px";

      if (mode === "TEXT") popup.focus();

      if (mode === "BUTTON") {
        okBtn.style.outline = "6px solid #dc2f02";
        okBtn.style.borderRadius = "6px";
        okBtn.focus();
        speakSafe(okBtn.innerText || okBtn.textContent);
      }
    };

    popup.tabIndex = -1;
    popup.focus();
    applyFocus();

    keyHandler = (e) => {
      if (blockSpeakRef.current || isClosed) return;

      const isStar =
        e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106;

      if (isStar) {
        e.preventDefault();
        mode = mode === "TEXT" ? "BUTTON" : "TEXT";
        applyFocus();
        return;
      }

      if (e.key === "Enter" && mode === "BUTTON") {
        okBtn.click();
        return;
      }
    };

    document.addEventListener("keydown", keyHandler, true);

    return () => {
      isClosed = true;
      blockSpeakRef.current = true;   // Block speech after modal closes
      document.removeEventListener("keydown", keyHandler, true);
    };
  };

  /* ========================================================================== */
  /*                    SERIAL PORT CONFIGURATION FUNCTIONS                     */
  /* ========================================================================== */

  /**
   * List all available serial ports from the system
   * Called from Rust backend via Tauri invoke
   */
  const listSerialPorts = async () => {
    try {
      const ports = await invoke("list_serial_ports");
      setListedSerialPorts(ports);
    } catch (error) {
      console.error("Error listing serial ports:", error);
    }
  };

  /**
   * Read kiosk configuration from Rust backend
   * Loads serial port configurations and machine metadata
   */
  const readConfig = async () => {
    try {
      const config = await invoke("read_config");
      setSerialPortsData(config.serialdata || []);

      // Store machine metadata for API headers
      if (config) {
        setKioskConfiguration({
          machineUid: config.machine_uid || '',
          version: config.version || '1.0.0'
        });
      }
    } catch (error) {
      console.error("Error reading store config:", error);
    }
  };

  /**
   * Match configured ports with available system ports
   * Only ports present in both config and system will be connected
   */
  const matchPorts = () => {
    const matches = serialPortsData.filter((configPort) => {
      return listedSerialPorts.some(
        (port) => port.trim().toLowerCase() === configPort.port?.trim().toLowerCase()
      );
    });

    setMatchedPorts(matches);
  };

  /* ========================================================================== */
  /*                    SERIAL PORT CONNECTION MANAGEMENT                       */
  /* ========================================================================== */

  /**
   * Stop all active serial port connections
   * Called during system cleanup or application shutdown
   */
  const stopSerialReading = async () => {
    try {
      await invoke("stop_serial_reading");
      await invoke("stop_human_sensor_monitoring");
      setActiveSerialConnections(new Set());
      previousMatchedPortsRef.current = [];
      isInitializedRef.current = false;
      systemHealthRef.current.lastCleanup = Date.now();
    } catch (error) {
      console.error("Error stopping serial connections:", error);
      systemHealthRef.current.errorCount++;
    }
  };

  // Stop serial reading only when window/app closes
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🚪 App closing, stopping serial connections...');
      stopSerialReading();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /**
   * Perform 24-hour system cleanup to prevent memory leaks
   * Restarts all serial connections and forces garbage collection
   */
  const performSystemCleanup = async () => {
    const now = Date.now();
    const timeSinceLastCleanup = now - systemHealthRef.current.lastCleanup;

    // Auto cleanup every 24 hours
    if (timeSinceLastCleanup > 24 * 60 * 60 * 1000) {
      try {
        // Stop and restart all connections to prevent resource leaks
        if (activeSerialConnections.size > 0) {
          await stopSerialReading();
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Restart connections if we have matched ports
          if (matchedPorts.length > 0) {
            for (const portConfig of matchedPorts) {
              await startContinuousRead(portConfig);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }

        // Force garbage collection if available
        if (window.gc && typeof window.gc === 'function') {
          window.gc();
        }

        systemHealthRef.current.lastCleanup = now;
      } catch (error) {
        console.error('Error during system cleanup:', error);
        systemHealthRef.current.errorCount++;
      }
    }
  };


  /* ========================================================================== */
  /*                     KIOSK LOGIN POLLING (NETWORK CHECK)                    */
  /* ========================================================================== */


  useEffect(() => {
    networkErrorRef.current = networkError;
  }, [networkError]);

  useEffect(() => {
    let interval;
    let mounted = true;

    const checkNetwork = async () => {

      // ✅ NEVER show modal on configuration page
      if (location.pathname === "/configuration") {
        if (modalShownRef.current) {
          stop();
          setNetworkError(false);
          setIsModalOpen(false);
          modalShownRef.current = false;
          networkErrorRef.current = false;
        }
        return;
      }

      // ✅ INTERNET RESTORED → close modal + reload API silently
      if (navigator.onLine && modalShownRef.current) {
        networkErrorRef.current = false;
        modalShownRef.current = false;
        networkRecoveredRef.current = true;

        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        window.dispatchEvent(new Event("NETWORK_RESTORED"));

        // 🔥 reload API automatically after reconnect
        setTimeout(async () => {
          try {
            await invoke("request_kiosk_login");
          } catch (e) {
            console.log("Reconnect fetch ignored");
          }
        }, 500);

        return;
      }

      try {
        await invoke("request_kiosk_login");

        if (!mounted) return;

        // if request success → close modal
        if (networkErrorRef.current) {
          networkErrorRef.current = false;
          modalShownRef.current = false;

          stop();
          setNetworkError(false);
          setIsModalOpen(false);
        }

      } catch (error) {
        if (!mounted) return;

        const errorMsg = String(error);

        if (
          !navigator.onLine &&
          errorMsg ===
          "Network error. Please check your internet connection and try again." &&
          !modalShownRef.current
        ) {
          modalShownRef.current = true;
          networkErrorRef.current = true;
          setNetworkError(true);
          setIsModalOpen(true);

          blockSpeakRef.current = false;
          speak(
            t(
              "translations.Network error. Please check your internet connection and try again."
            )
          );
        }
      }
    };


    // ✅ Listen for online status to immediately retry/close logic


    interval = setInterval(checkNetwork, 5000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);

    };

  }, [location.pathname]);


  // ✅ INSTANTLY CLOSE NETWORK MODAL WHEN ENTERING CONFIGURATION PAGE
  useEffect(() => {
    if (location.pathname === "/configuration") {
      if (modalShownRef.current || isModalOpen) {
        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        modalShownRef.current = false;
        networkErrorRef.current = false;
      }
    }
  }, [location.pathname, isModalOpen, stop]);



  /* ========================================================================== */
  /*                    NETWORK MODAL ACCESSIBILITY (DASHBOARD STYLE)           */
  /* ========================================================================== */

  useEffect(() => {
    if (!networkError || !isModalOpen) return;

    // 🔥 When modal opens → focus TEXT first (same as dashboard)
    setNetworkModalButtonFocused(false);

    stop();
    speak(t("translations.Network error. Please check your internet connection and try again."));

  }, [networkError, isModalOpen, stop, speak, t]);


  useEffect(() => {
    if (!networkError || !isModalOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();

        setNetworkModalButtonFocused((prev) => {
          const next = !prev;

          stop();

          if (next) {
            speak(t("translations.Retry"));
          } else {
            speak(t("translations.Network error. Please check your internet connection and try again."));
          }

          return next;
        });
      }

      // ✅ ENTER triggers retry (same as dashboard modal)
      if (e.key === "Enter") {
        if (networkModalButtonFocused) {
          e.preventDefault();
          retryKioskLogin();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [networkError, isModalOpen, networkModalButtonFocused, speak, stop, t]);

  /**
   * Start continuous reading from a serial port
   * 
   * @param {Object} portConfig - Port configuration object
   * @param {string} portConfig.port - COM port name (e.g., "COM19")
   * @param {string} portConfig.name - Device type (e.g., "QR", "RFID", "HUMAN_SENSOR")
   * @param {number} portConfig.baudrate - Baud rate for serial communication
   * @returns {boolean} Success status
   */
  const startContinuousRead = async (portConfig) => {
    const portKey = `${portConfig.port}_${portConfig.name}`;

    // Skip if already connected
    if (activeSerialConnections.has(portKey)) {
      return true;
    }

    try {
      // Handle HUMAN_SENSOR differently - use pin monitoring instead of data reading
      if (portConfig.name === "HUMAN_SENSOR") {
        await invoke("start_human_sensor_monitoring", {
          portName: portConfig.port,
          baudRate: portConfig.baudrate,
        });
      } else {
        await invoke("continuous_read", {
          portName: portConfig.port,
          baudRate: portConfig.baudrate,
          deviceName: portConfig.name,
        });
      }

      setActiveSerialConnections(prev => new Set([...prev, portKey]));
      systemHealthRef.current.connectionCount++;
      return true;

    } catch (error) {
      console.error(`Error starting port ${portConfig.port}:`, error.message);

      // Attempt recovery for access denied errors (only once per port)
      if ((error.toString().includes("Access is denied") || error.toString().includes("access denied")) && !portConfig._retryAttempted) {
        try {
          // Mark retry attempt and wait for port release
          portConfig._retryAttempted = true;
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Retry connection
          if (portConfig.name === "HUMAN_SENSOR") {
            await invoke("start_human_sensor_monitoring", {
              portName: portConfig.port,
              baudRate: portConfig.baudrate,
            });
          } else {
            await invoke("continuous_read", {
              portName: portConfig.port,
              baudRate: portConfig.baudrate,
              deviceName: portConfig.name,
            });
          }

          setActiveSerialConnections(prev => new Set([...prev, portKey]));
          return true;

        } catch (retryError) {
          console.error(`Recovery failed for port ${portConfig.port}`);
          return false;
        }
      }
      return false;
    }
  };

  /**
   * Write data to serial port (for printer, etc.)
   * 
   * @param {Object} portConfig - Port configuration
   * @param {Object} printOptions - Print options to send
   * @returns {boolean} Success status
   */
  const writeToSerialPort = async (portConfig, printOptions) => {
    try {
      await invoke("stop_serial_reading");
      await invoke("print_with_options", { printOptions });
      return true;
    } catch (error) {
      console.error(`Error writing to serial port ${portConfig.port}:`, error);
      return false;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        await readConfig();
        await listSerialPorts();
        console.log('🎉 SerialPortContext initialized successfully');
      } catch (error) {
        console.error('Error during SerialPortContext initialization:', error);
      }
    };

    initialize();

    // No cleanup - let serial connections run continuously
    // Cleanup will only happen when app closes completely
  }, []);

  useEffect(() => {
    const shouldMatch = () =>
      listedSerialPorts.length > 0 &&
      serialPortsData.length > 0 &&
      Object.keys(kioskConfiguration).length > 0;

    if (shouldMatch()) {
      matchPorts();
    }

    // Optimize polling - only poll if we have data that can change
    let intervalId;
    let cleanupIntervalId;

    if (shouldMatch()) {
      intervalId = setInterval(() => {
        matchPorts();
      }, 30000); // Reduced frequency to 30 seconds to reduce memory pressure
    }

    // Setup 24-hour cleanup cycle for long-term stability
    cleanupIntervalId = setInterval(() => {
      performSystemCleanup();
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (cleanupIntervalId) clearInterval(cleanupIntervalId);
    };
  }, [listedSerialPorts, serialPortsData, kioskConfiguration]);

  /* ========================================================================== */
  /*                   EFFECTS - CONNECTION MANAGEMENT                          */
  /* ========================================================================== */

  /**
   * Connect to new matched ports and maintain active connections
   * Implements debouncing and periodic checks to prevent memory leaks
   */
  useEffect(() => {
    // Compare two port arrays for equality
    const arePortsEqual = (ports1, ports2) => {
      if (ports1.length !== ports2.length) return false;

      const sorted1 = ports1.map(p => `${p.port}_${p.name}`).sort();
      const sorted2 = ports2.map(p => `${p.port}_${p.name}`).sort();

      return sorted1.every((port, index) => port === sorted2[index]);
    };

    const connectToNewPorts = async () => {
      // Skip if ports haven't changed
      if (arePortsEqual(matchedPorts, previousMatchedPortsRef.current) && isInitializedRef.current) {
        return;
      }

      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;

      // Debounce rapid connection attempts (minimum 3 seconds)
      if (timeSinceLastAttempt < 3000) {
        return;
      }

      lastConnectionAttemptRef.current = now;
      previousMatchedPortsRef.current = [...matchedPorts];

      try {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        // Connect to new ports only (don't stop existing connections)
        if (matchedPorts.length > 0) {
          for (const portConfig of matchedPorts) {
            const portKey = `${portConfig.port}_${portConfig.name}`;

            // Skip if already connected
            if (activeSerialConnections.has(portKey)) {
              continue;
            }

            await startContinuousRead(portConfig);
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          isInitializedRef.current = true;
        }
      } catch (error) {
        console.error('Connection error:', error);
      }
    };

    // Initial connection when ports first become available
    if (!isInitializedRef.current && matchedPorts.length > 0) {
      connectToNewPorts();
    }
    // Periodic port check every 5 minutes
    else if (isInitializedRef.current) {
      if (portCheckIntervalRef.current) {
        clearInterval(portCheckIntervalRef.current);
      }

      portCheckIntervalRef.current = setInterval(() => {
        connectToNewPorts();
      }, 5 * 60 * 1000);
    }

    return () => {
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      if (portCheckIntervalRef.current) {
        clearInterval(portCheckIntervalRef.current);
      }
    };
  }, [matchedPorts]);

  /* ========================================================================== */
  /*                      EFFECTS - SERIAL DATA LISTENERS                       */
  /* ========================================================================== */

  /**
   * Listen for serial data events from QR, RFID, and other devices
   * Handles automatic QR-based authentication
   */
  useEffect(() => {
    let unlisten;
    let timeoutId;
    let isMounted = true;

    /**
     * Handle QR code login flow
     * 1. Validate QR code with external API
     * 2. Parse XML response to JSON
     * 3. Extract user ID and dispatch login action
     */
    const handleQRLogin = async (qrCode) => {
      try {
        const cleanedQrCode = qrCode.trim();

        // Validate QR code
        const qrResponse = await QRValidate(cleanedQrCode);

        // Parse XML response to JSON
        if (typeof qrResponse.data === 'string') {
          // Extract values from CDATA sections using regex
          const resultCodeMatch = qrResponse.data.match(/<resultCode><!\[CDATA\[(.*?)\]\]><\/resultCode>/);
          const resultMsgMatch = qrResponse.data.match(/<resultMsg><!\[CDATA\[(.*?)\]\]><\/resultMsg>/);
          const userIDMatch = qrResponse.data.match(/<userID><!\[CDATA\[(.*?)\]\]><\/userID>/);
          const patCdMatch = qrResponse.data.match(/<patCd><!\[CDATA\[(.*?)\]\]><\/patCd>/);
          const patNmMatch = qrResponse.data.match(/<patNm><!\[CDATA\[(.*?)\]\]><\/patNm>/);
          const deptCdMatch = qrResponse.data.match(/<deptCd><!\[CDATA\[(.*?)\]\]><\/deptCd>/);
          const deptNmMatch = qrResponse.data.match(/<deptNm><!\[CDATA\[(.*?)\]\]><\/deptNm>/);

          // Build JSON object from extracted data
          const jsonData = {
            resultCode: resultCodeMatch ? resultCodeMatch[1].trim() : "",
            resultMsg: resultMsgMatch ? resultMsgMatch[1].trim() : "Unknown error",
            item: {
              userID: userIDMatch ? userIDMatch[1].trim() : "",
              patCd: patCdMatch ? patCdMatch[1].trim() : "",
              patNm: patNmMatch ? patNmMatch[1].trim() : "",
              deptCd: deptCdMatch ? deptCdMatch[1].trim() : "",
              deptNm: deptNmMatch ? deptNmMatch[1].trim() : ""
            }
          };

          const { resultCode, resultMsg, item } = jsonData;
          const userId = item.userID;

          // Validate result code
          if (resultCode === "1") {
            console.error("QR validation failed:", resultMsg);
            speak(resultMsg || t("QR code validation failed"));
            return;
          }

          if (resultCode !== "0") {
            console.error("Unexpected result code:", resultCode);
            speak(t("Unexpected response from server"));
            return;
          }

          if (!userId) {
            console.error("No user ID found in QR response");
            speak(t("Unable to extract user information"));
            return;
          }

          // Login with extracted user ID
          window.dispatchEvent(new Event("LOGIN_LOADING_START"));
          await dispatch(login(userId)).unwrap();

          speak(t("Login successful"));
          window.dispatchEvent(new Event("LOGIN_LOADING_END"));
          window.dispatchEvent(new Event("QR_LOGIN_SUCCESS"));

        } else {
          console.error("Expected XML string response");
          speak(t("Invalid response format"));
        }
      } catch (error) {
        console.error("QR login failed:", error.message);
        speak(t("Login failed. Please try again."));
      }
    };

    const setupListener = async () => {
      try {
        // Clean up previous listener if it exists
        if (serialListenerRef.current && typeof serialListenerRef.current === "function") {
          try {
            await serialListenerRef.current();
          } catch (err) {
            console.warn("Error cleaning up previous listener:", err);
          }
          serialListenerRef.current = null;
        }

        if (!isMounted) return;

        unlisten = await listen("serial-data", async (event) => {
          if (!isMounted) return;

          const { device_name, data } = event.payload;

          // Store serial data in Redux
          dispatch(setSerialData({ deviceName: device_name, data }));

          // Handle QR code data
          if (device_name === "QR" && data && data.trim()) {
            await handleQRLogin(data.trim());
          }

          // Handle RFID data (placeholder for future implementation)
          if (device_name === "RFID" && data && data.trim()) {
            // Add RFID login logic here if needed
          }

          if (timeoutId) clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            if (isMounted) {
              dispatch(setSerialData(null));
            }
          }, 100);
        });

        if (isMounted) {
          serialListenerRef.current = unlisten;
        }
      } catch (error) {
        console.error("Error setting up serial listener:", error);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);

      if (typeof unlisten === "function") {
        try {
          unlisten();
        } catch (err) {
          console.warn("Error during unlisten:", err);
        }
      }

      if (serialListenerRef.current && typeof serialListenerRef.current === "function") {
        try {
          serialListenerRef.current();
        } catch (err) {
          console.warn("Error during serialListenerRef cleanup:", err);
        }
        serialListenerRef.current = null;
      }
    };
  }, [dispatch, location.pathname, speak, t]);

  /**
   * Listen for human sensor state changes
   * Tracks human presence detection for kiosk interaction
   */
  useEffect(() => {
    let isMounted = true;
    let unlisten;

    const setupHumanSensorListener = async () => {
      try {
        unlisten = await listen("human-sensor-state", (event) => {
          if (!isMounted) return;

          const { detected } = event.payload;
          setHumanDetected(detected);
        });
      } catch (error) {
        console.error("Error setting up human sensor listener:", error);
      }
    };

    setupHumanSensorListener();

    return () => {
      isMounted = false;
      if (typeof unlisten === "function") unlisten();
    };
  }, []);

  /* ========================================================================== */
  /*                            CONTEXT PROVIDER                                */
  /* ========================================================================== */

  /**
   * Get system health metrics for monitoring
   * @returns {Object} System health statistics
   */
  const getSystemHealth = () => {
    const now = Date.now();
    const uptime = now - systemHealthRef.current.startTime;

    return {
      uptime: uptime,
      uptimeDays: Math.floor(uptime / (24 * 60 * 60 * 1000)),
      uptimeHours: Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
      totalConnections: systemHealthRef.current.connectionCount,
      errorCount: systemHealthRef.current.errorCount,
      lastCleanup: systemHealthRef.current.lastCleanup,
      timeSinceCleanup: now - systemHealthRef.current.lastCleanup,
      nextCleanupIn: Math.max(0, (24 * 60 * 60 * 1000) - (now - systemHealthRef.current.lastCleanup)),
    };
  };

  /* ========================================================================== */
  /*                            RETRY NETWORK REQUEST                            */
  /* ========================================================================== */
  const retryKioskLogin = async () => {
    try {
      await invoke("request_kiosk_login");
      // ✅ Success → close modal cleanly, no page refresh
      blockSpeakRef.current = true;
      stop();
      setNetworkError(false);
      setIsModalOpen(false);
      modalShownRef.current = false;
    } catch (error) {
      // ✅ If internet is available but request failed, close modal anyway
      if (navigator.onLine) {
        blockSpeakRef.current = true;
        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        modalShownRef.current = false;
      } else {
        blockSpeakRef.current = false;
        speak(t("translations.Network Error"));
      }
    }
  };


  return (
    <SerialPortContext.Provider
      value={{
        // Serial Port Data
        listedSerialPorts,
        serialPortsData,
        matchedPorts,
        activeSerialConnections: Array.from(activeSerialConnections),

        // Configuration
        kioskConfiguration,

        // Sensor Data
        humanDetected,
        rfidMessages,

        // Functions
        writeToSerialPort,
        stopSerialReading,
        performSystemCleanup,

        // Debug Information
        isSerialInitialized: isInitializedRef.current,
        connectionCount: activeSerialConnections.size,
        systemHealth: getSystemHealth(),
      }}
    >
      {networkError && (
        <Modal
          isOpen={isModalOpen}
          title={t("translations.Network Error")}
          onClose={() => { }}
          size="medium"
          showCloseButton={false}
          closeFocused={false}

          className="outline-[6px] outline-[#dc2f02]"
          footer={
            <div className="flex justify-center">
              <button
                onClick={retryKioskLogin}
                className={`
px-10 py-3 text-2xl bg-orange-600 text-white rounded-lg
hover:bg-orange-700 transition-all
${networkModalButtonFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
`}
              >
                {t("translations.Retry")}
              </button>
            </div>
          }
        >
          <div
            className={`text-center py-4 outline-none ${!networkModalButtonFocused ? "outline-[6px] outline-[#dc2f02]" : ""
              }`}
          >

            <p className="text-2xl">
              {t("translations.Network error. Please check your internet connection and try again.")}
            </p>
          </div>
        </Modal>
      )}


      {children}
    </SerialPortContext.Provider>
  );
};
