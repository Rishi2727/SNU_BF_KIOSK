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
import { logEvent } from "../logger";

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
  const [listedSerialPorts, setListedSerialPorts] = useState([]);
  const [serialPortsData, setSerialPortsData] = useState([]);
  const [matchedPorts, setMatchedPorts] = useState([]);
  const [activeSerialConnections, setActiveSerialConnections] = useState(new Set());
  const networkErrorRef = useRef(false);

  // Configuration States
  const [kioskConfiguration, setKioskConfiguration] = useState({});

  // Sensor & Device States
  const [humanDetected, setHumanDetected] = useState(false);
  const [rfidMessages, setRfidMessages] = useState([]);

  // UI States
  const [isPolling, setIsPolling] = useState(false);
  const [pollingError, setPollingError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs for Connection Management
  const serialListenerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const lastConnectionAttemptRef = useRef(0);
  const previousMatchedPortsRef = useRef([]);
  const isInitializedRef = useRef(false);
  const portCheckIntervalRef = useRef(null);

  // Refs for Accessibility Features
  const blockSpeakRef = useRef(false);
  const modalShownRef = useRef(false);
  const focusModeRef = useRef("MODAL");

  // System Health Tracking
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

  const enableFocusAndSpeakPolling = (speak, t) => {
    let keyHandler = null;
    let mode = "TEXT";
    let isClosed = false;

    const popup = Swal.getPopup();
    const titleEl = Swal.getTitle();
    const textEl = popup?.querySelector(".swal2-html-container");
    const okBtn = Swal.getConfirmButton();

    const speakSafe = (msg) => {
      if (blockSpeakRef.current) return;
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
      blockSpeakRef.current = true;
      document.removeEventListener("keydown", keyHandler, true);
    };
  };

  /* ========================================================================== */
  /*                    SERIAL PORT CONFIGURATION FUNCTIONS                     */
  /* ========================================================================== */

  const listSerialPorts = async () => {
    try {
      const ports = await invoke("list_serial_ports");
      setListedSerialPorts(ports);
      logEvent("info", `Serial ports listed: [${ports.join(", ")}]`);
    } catch (error) {
      logEvent("error", `Failed to list serial ports: ${error.message ?? error}`);
      console.error("Error listing serial ports:", error);
    }
  };

  const readConfig = async () => {
    try {
      const config = await invoke("read_config");
      setSerialPortsData(config.serialdata || []);

      if (config) {
        setKioskConfiguration({
          machineUid: config.machine_uid || '',
          version: config.version || '1.0.0'
        });
        logEvent("info", `serialPorts=${config.serialdata?.length ?? 0}`);
      }
    } catch (error) {
      logEvent("error", `Failed to read kiosk config: ${error.message ?? error}`);
      console.error("Error reading store config:", error);
    }
  };

  const matchPorts = () => {
    const matches = serialPortsData.filter((configPort) => {
      return listedSerialPorts.some(
        (port) => port.trim().toLowerCase() === configPort.port?.trim().toLowerCase()
      );
    });

    setMatchedPorts(matches);
    logEvent("info", `Port matching complete — ${matches.length} matched: [${matches.map(p => `${p.port}(${p.name})`).join(", ")}]`);
  };

  /* ========================================================================== */
  /*                    SERIAL PORT CONNECTION MANAGEMENT                       */
  /* ========================================================================== */

  const stopSerialReading = async () => {
    try {
      await invoke("stop_serial_reading");
      await invoke("stop_human_sensor_monitoring");
      setActiveSerialConnections(new Set());
      previousMatchedPortsRef.current = [];
      isInitializedRef.current = false;
      systemHealthRef.current.lastCleanup = Date.now();
      logEvent("info", "Serial reading stopped and connections cleared");
    } catch (error) {
      logEvent("error", `Error stopping serial connections: ${error.message ?? error}`);
      console.error("Error stopping serial connections:", error);
      systemHealthRef.current.errorCount++;
    }
  };

  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('🚪 App closing, stopping serial connections...');
      logEvent("info", "App closing — stopping serial connections");
      stopSerialReading();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const performSystemCleanup = async () => {
    const now = Date.now();
    const timeSinceLastCleanup = now - systemHealthRef.current.lastCleanup;

    if (timeSinceLastCleanup > 24 * 60 * 60 * 1000) {
      logEvent("info", `Performing 24h system cleanup — uptime=${Math.floor(timeSinceLastCleanup / 3600000)}h, errorCount=${systemHealthRef.current.errorCount}`);
      try {
        if (activeSerialConnections.size > 0) {
          await stopSerialReading();
          await new Promise(resolve => setTimeout(resolve, 2000));

          if (matchedPorts.length > 0) {
            for (const portConfig of matchedPorts) {
              await startContinuousRead(portConfig);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }

        if (window.gc && typeof window.gc === 'function') {
          window.gc();
        }

        systemHealthRef.current.lastCleanup = now;
        logEvent("info", "System cleanup completed successfully");
      } catch (error) {
        logEvent("error", `System cleanup failed: ${error.message ?? error}`);
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

      if (navigator.onLine && modalShownRef.current) {
        networkErrorRef.current = false;
        modalShownRef.current = false;
        networkRecoveredRef.current = true;

        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        window.dispatchEvent(new Event("NETWORK_RESTORED"));
        logEvent("info", "Network restored — modal dismissed, NETWORK_RESTORED event dispatched");

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

        if (networkErrorRef.current) {
          networkErrorRef.current = false;
          modalShownRef.current = false;
          stop();
          setNetworkError(false);
          setIsModalOpen(false);
          logEvent("info", "Network recovered via kiosk login poll — error modal cleared");
        }
      } catch (error) {
        if (!mounted) return;

        const errorMsg = String(error);

        if (
          !navigator.onLine &&
          errorMsg === "Network error. Please check your internet connection and try again." &&
          !modalShownRef.current
        ) {
          modalShownRef.current = true;
          networkErrorRef.current = true;
          setNetworkError(true);
          setIsModalOpen(true);
          logEvent("error", `Network error detected — device offline, showing modal`);

          blockSpeakRef.current = false;
          speak(
            t("translations.Network error. Please check your internet connection and try again.")
          );
        }
      }
    };

    interval = setInterval(checkNetwork, 5000);
    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname === "/configuration") {
      if (modalShownRef.current || isModalOpen) {
        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        modalShownRef.current = false;
        networkErrorRef.current = false;
        logEvent("info", "Navigated to /configuration — network error modal dismissed");
      }
    }
  }, [location.pathname, isModalOpen, stop]);

  /* ========================================================================== */
  /*                    NETWORK MODAL ACCESSIBILITY                             */
  /* ========================================================================== */

  useEffect(() => {
    if (!networkError || !isModalOpen) return;

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

      if (e.key === "Enter") {
        if (networkModalButtonFocused) {
          e.preventDefault();
          logEvent("info", "Network error modal — Retry triggered via keyboard Enter");
          retryKioskLogin();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [networkError, isModalOpen, networkModalButtonFocused, speak, stop, t]);

  /* ========================================================================== */
  /*                       START CONTINUOUS PORT READ                           */
  /* ========================================================================== */

  const startContinuousRead = async (portConfig) => {
    const portKey = `${portConfig.port}_${portConfig.name}`;

    if (activeSerialConnections.has(portKey)) {
      return true;
    }

    try {
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
      logEvent("info", `Serial port connected: ${portConfig.port} (${portConfig.name})`);
      return true;

    } catch (error) {
      logEvent("error", `Failed to connect port ${portConfig.port} (${portConfig.name}): ${error.message ?? error}`);
      console.error(`Error starting port ${portConfig.port}:`, error.message);

      if ((error.toString().includes("Access is denied") || error.toString().includes("access denied")) && !portConfig._retryAttempted) {
        try {
          portConfig._retryAttempted = true;
          logEvent("info", `Retrying access-denied port after 2s: ${portConfig.port} (${portConfig.name})`);
          await new Promise(resolve => setTimeout(resolve, 2000));

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
          logEvent("info", `Serial port connected on retry: ${portConfig.port} (${portConfig.name})`);
          return true;

        } catch (retryError) {
          logEvent("error", `Retry failed for port ${portConfig.port} (${portConfig.name}): ${retryError.message ?? retryError}`);
          console.error(`Recovery failed for port ${portConfig.port}`);
          return false;
        }
      }
      return false;
    }
  };

  const writeToSerialPort = async (portConfig, printOptions) => {
    logEvent("info", `Print initiated — port=${portConfig?.port}`);
    try {
      await invoke("stop_serial_reading");
      await invoke("print_with_options", { printOptions });
      logEvent("info", `Print completed successfully — port=${portConfig?.port}`);
      return true;
    } catch (error) {
      logEvent("error", `Print failed — port=${portConfig?.port}: ${error.message ?? error}`);
      console.error(`Error writing to serial port ${portConfig.port}:`, error);
      return false;
    }
  };

  /* ========================================================================== */
  /*                     INITIALIZATION EFFECTS                                 */
  /* ========================================================================== */

  useEffect(() => {
    const initialize = async () => {
      try {
        logEvent("info", "SerialPortContext initializing — reading config and listing ports");
        await readConfig();
        await listSerialPorts();
        logEvent("info", "SerialPortContext initialized successfully");
        console.log('🎉 SerialPortContext initialized successfully');
      } catch (error) {
        logEvent("error", `SerialPortContext initialization failed: ${error.message ?? error}`);
        console.error('Error during SerialPortContext initialization:', error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const shouldMatch = () =>
      listedSerialPorts.length > 0 &&
      serialPortsData.length > 0 &&
      Object.keys(kioskConfiguration).length > 0;

    if (shouldMatch()) {
      matchPorts();
    }

    let intervalId;
    let cleanupIntervalId;

    if (shouldMatch()) {
      intervalId = setInterval(() => {
        matchPorts();
      }, 30000);
    }

    cleanupIntervalId = setInterval(() => {
      performSystemCleanup();
    }, 60 * 60 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (cleanupIntervalId) clearInterval(cleanupIntervalId);
    };
  }, [listedSerialPorts, serialPortsData, kioskConfiguration]);

  /* ========================================================================== */
  /*                   EFFECTS - CONNECTION MANAGEMENT                          */
  /* ========================================================================== */

  useEffect(() => {
    const arePortsEqual = (ports1, ports2) => {
      if (ports1.length !== ports2.length) return false;
      const sorted1 = ports1.map(p => `${p.port}_${p.name}`).sort();
      const sorted2 = ports2.map(p => `${p.port}_${p.name}`).sort();
      return sorted1.every((port, index) => port === sorted2[index]);
    };

    const connectToNewPorts = async () => {
      if (arePortsEqual(matchedPorts, previousMatchedPortsRef.current) && isInitializedRef.current) {
        return;
      }

      const now = Date.now();
      const timeSinceLastAttempt = now - lastConnectionAttemptRef.current;

      if (timeSinceLastAttempt < 3000) {
        return;
      }

      lastConnectionAttemptRef.current = now;
      previousMatchedPortsRef.current = [...matchedPorts];

      try {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }

        if (matchedPorts.length > 0) {
          logEvent("info", `Connecting to ${matchedPorts.length} matched port(s): [${matchedPorts.map(p => `${p.port}(${p.name})`).join(", ")}]`);

          for (const portConfig of matchedPorts) {
            const portKey = `${portConfig.port}_${portConfig.name}`;
            if (activeSerialConnections.has(portKey)) {
              continue;
            }
            await startContinuousRead(portConfig);
            await new Promise(resolve => setTimeout(resolve, 300));
          }

          isInitializedRef.current = true;
        }
      } catch (error) {
        logEvent("error", `Connection error during port setup: ${error.message ?? error}`);
        console.error('Connection error:', error);
      }
    };

    if (!isInitializedRef.current && matchedPorts.length > 0) {
      connectToNewPorts();
    } else if (isInitializedRef.current) {
      if (portCheckIntervalRef.current) {
        clearInterval(portCheckIntervalRef.current);
      }
      portCheckIntervalRef.current = setInterval(() => {
        connectToNewPorts();
      }, 5 * 60 * 1000);
    }

    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (portCheckIntervalRef.current) clearInterval(portCheckIntervalRef.current);
    };
  }, [matchedPorts]);

  /* ========================================================================== */
  /*                      EFFECTS - SERIAL DATA LISTENERS                       */
  /* ========================================================================== */

  useEffect(() => {
    let unlisten;
    let timeoutId;
    let isMounted = true;

    const handleQRLogin = async (qrCode) => {
      logEvent("info", `QR scan received — initiating login`);
      try {
        const cleanedQrCode = qrCode.trim();
        const response = await QRValidate(cleanedQrCode);
        console.log("QR Response:", response);

        if (!response) {
          logEvent("error", "QR validation returned empty response");
          speak(t("Invalid response from server"));
          return;
        }

        const { LOGIN_YN, MESSAGE, USERID } = response;

        if (LOGIN_YN !== "Y") {
          logEvent("error", `QR validation failed — LOGIN_YN=${LOGIN_YN}, MESSAGE=${MESSAGE}`);
          console.error("QR validation failed:", MESSAGE);
          speak(MESSAGE || t("QR validation failed"));
          return;
        }

        if (!USERID) {
          logEvent("error", "QR validation succeeded but USERID is missing");
          console.error("USERID missing");
          speak(t("User information not found"));
          return;
        }

        logEvent("info", `QR login validated — USERID=${USERID}, dispatching login`);
        window.dispatchEvent(new Event("LOGIN_LOADING_START"));

        const result = await dispatch(login(USERID)).unwrap();
        console.log("QR login result:", result);

        window.dispatchEvent(new Event("LOGIN_LOADING_END"));
        speak(t("Login successful"));

        localStorage.setItem("bookingInfo", JSON.stringify(result));

        if (result?.ASSIGN_NO && result.ASSIGN_NO !== "0") {
          logEvent("info", `QR login success with existing booking — ASSIGN_NO=${result.ASSIGN_NO}, dispatching QR_LOGIN_SUCCESS_WITH_BOOKING`);
          window.dispatchEvent(new Event("QR_LOGIN_SUCCESS_WITH_BOOKING"));
        } else {
          logEvent("info", `QR login success — no active booking, dispatching QR_LOGIN_SUCCESS`);
          window.dispatchEvent(new Event("QR_LOGIN_SUCCESS"));
        }

      } catch (error) {
        logEvent("error", `QR login exception: ${error.message ?? error}`);
        console.error("QR login failed:", error);
        window.dispatchEvent(new Event("LOGIN_LOADING_END"));
        speak(t("Login failed. Please try again."));
      }
    };

    const setupListener = async () => {
      try {
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
          dispatch(setSerialData({ deviceName: device_name, data }));

          if (device_name === "QR" && data && data.trim()) {
            logEvent("info", `QR data received on port — forwarding to QR login handler`);
            await handleQRLogin(data.trim());
          }

          if (device_name === "RFID" && data && data.trim()) {
            logEvent("info", `RFID data received: ${data.trim()}`);
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
          logEvent("info", `Serial data listener registered for path: ${location.pathname}`);
        }
      } catch (error) {
        logEvent("error", `Failed to set up serial data listener: ${error.message ?? error}`);
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
   */
  useEffect(() => {
    let isMounted = true;
    let unlisten;
    let lastDetectedState = null;

    const setupHumanSensorListener = async () => {
      try {
        unlisten = await listen("human-sensor-state", (event) => {
          if (!isMounted) return;

          const { detected } = event.payload;
          setHumanDetected(detected);

          // Only log on state change to avoid flooding
          if (detected !== lastDetectedState) {
            logEvent("info", `Human sensor state changed: ${detected ? "DETECTED" : "NOT DETECTED"}`);
            lastDetectedState = detected;
          }
        });
        logEvent("info", "Human sensor listener registered");
      } catch (error) {
        logEvent("error", `Failed to set up human sensor listener: ${error.message ?? error}`);
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

  const getSystemHealth = () => {
    const now = Date.now();
    const uptime = now - systemHealthRef.current.startTime;

    return {
      uptime,
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
    logEvent("info", "Network retry — invoking request_kiosk_login");
    try {
      await invoke("request_kiosk_login");
      blockSpeakRef.current = true;
      stop();
      setNetworkError(false);
      setIsModalOpen(false);
      modalShownRef.current = false;
      logEvent("info", "Network retry succeeded — modal dismissed");
    } catch (error) {
      if (navigator.onLine) {
        blockSpeakRef.current = true;
        stop();
        setNetworkError(false);
        setIsModalOpen(false);
        modalShownRef.current = false;
        logEvent("info", "Network retry: device online despite invoke error — modal dismissed");
      } else {
        blockSpeakRef.current = false;
        logEvent("error", `Network retry failed — device still offline: ${error.message ?? error}`);
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