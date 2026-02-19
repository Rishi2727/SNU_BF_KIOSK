import axios from "axios";
import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { logEvent } from "../logger";

// Custom Tauri adapter that properly handles large responses and null bytes
const customTauriAdapter = async (config) => {
  try {
    const url = config.baseURL ? config.baseURL + config.url : config.url;

    // Build query parameters
    let fullUrl = url;
    if (config.params) {
      const params = new URLSearchParams(config.params);
      fullUrl += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Make request using Tauri's fetch
    const response = await tauriFetch(fullUrl, {
      method: config.method?.toUpperCase() || 'GET',
      headers: config.headers || {},
      body: config.data,
    });

    // Always get as arrayBuffer to prevent truncation
    const arrayBuffer = await response.arrayBuffer();

    // Normalize status code to valid range (handle 999 and other non-standard codes)
    let status = response.status;
    if (status < 200 || status > 599) {
      console.warn(`⚠️ Non-standard HTTP status ${status}, normalizing to 200`);
      status = 200;
    }

    return {
      data: arrayBuffer,
      status: status,
      statusText: response.statusText || 'OK',
      headers: Object.fromEntries(response.headers.entries()),
      config: config,
      request: {}
    };
  } catch (error) {
    console.error('Custom Tauri adapter error:', error);
    throw error;
  }
};

const parseApiResponse = (data) => {
  // Already parsed object
  if (data && typeof data === "object" && !Array.isArray(data) && !(data instanceof ArrayBuffer)) {
    return data;
  }

  // ArrayBuffer from Tauri adapter
  if (data instanceof ArrayBuffer) {
    const decoder = new TextDecoder('utf-8');
    data = decoder.decode(data);
  }

  // Not a string at this point
  if (typeof data !== "string") {
    return data;
  }

  // Clean the string FIRST before parsing
  const cleaned = data
    .replace(/^\uFEFF/, "")  // Remove BOM
    .replace(/\0/g, "")      // Remove ALL null bytes (this is critical!)
    .trim();

  // Try JSON parse on cleaned string
  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (e) {
    // Log detailed error info
    console.warn("⚠️ API Response is not valid JSON, returning raw text.", cleaned.substring(0, 80));
    console.error("Parse error:", e.message);
    console.log("Data length:", cleaned.length, "Original length:", data.length);

    // Try to find where the JSON is broken
    const errorPos = e.message.match(/position (\d+)/);
    if (errorPos) {
      const pos = parseInt(errorPos[1]);
      console.log("Error context:", cleaned.substring(Math.max(0, pos - 50), Math.min(cleaned.length, pos + 50)));
    }

    return data;
  }
};

export const masterClient = axios.create({
  adapter: customTauriAdapter,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
   
  },
  withCredentials: true,
  timeout: 60000,
  transformResponse: [parseApiResponse],
});

let managerIpUrl = "";
let apiInitialized = null;
let PRIMARY_SERVER_URL = "";
let SECONDARY_SERVER_URL = "";
let QR_SERVER_URL = "";
let RFID_SERVER_URL = "";
let popupTimers = [];
let MACHINE_ID = "";
let MACHINE_NAME = "";
let HUMAN_SENSOR_DETECTION = false;


export const getPopupTimers = () => popupTimers;

/* ==================== LANGUAGE MANAGEMENT =================== */
let runtimeLang = localStorage.getItem("lang") || "en";
let lastSyncedLang = null; // ✅ Start as null to force first sync
export const setApiLang = (lang) => {
  console.log("🌍 setApiLang called with:", lang);
  runtimeLang = lang;
  lastSyncedLang = null; // ✅ Force re-sync when language changes
};
export const getLang = () => runtimeLang;

const syncServerLocale = async (lang) => {
  console.log("🔄 Syncing server locale to:", lang);
  try {
    const formData = new URLSearchParams({ locale: lang });
    await masterClient.post(
      `${PRIMARY_SERVER_URL}/json/setChangeLocale`,
      formData
    );
    console.log("✅ Server locale synced successfully to:", lang);
    lastSyncedLang = lang; // ✅ Update after successful sync
  } catch (error) {
    console.error("❌ Failed to sync server locale:", error);
    // Don't update lastSyncedLang on error, so it retries next time
  }
};

const KioskLangInterceptor = async (config) => {
  console.log("🔍 KioskLangInterceptor: runtimeLang =", runtimeLang, "lastSyncedLang =", lastSyncedLang);

  // ✅ Always sync if not yet synced or language changed
  if (lastSyncedLang !== runtimeLang) {
    console.log("🔄 Language mismatch detected, syncing...");
    await syncServerLocale(runtimeLang);
  }

  config.headers.langcode = runtimeLang;
  config.headers.locale = runtimeLang;
  config.headers.os_kind = "KIOSK";

  return config;
};
/* ============================================================ */

const ensureInitialized = async () => {
  const MAX_WAIT_MS = 10_000;
  const INTERVAL_MS = 500;
  const start = Date.now();

  console.log("Ensuring API Initialization...");

  while (Date.now() - start < MAX_WAIT_MS) {
    if (apiInitialized) {
      try {
        await apiInitialized; // wait for actual completion
        console.log("API is initialized.");
        return true;          // ✅ return immediately when ready
      } catch (err) {
        // initialization failed → keep waiting until timeout
      }
    }

    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }

  throw new Error("API is not initialized after 10 seconds.");
};

let ApiClientManagerIP = axios.create();
let ApiClientPrimary = masterClient.create();
let ApiClientSecondary = masterClient.create();
let ApiClientQR = masterClient.create();
let ApiClientRFID = masterClient.create();

ApiClientManagerIP.interceptors.request.use(KioskLangInterceptor);
ApiClientPrimary.interceptors.request.use(KioskLangInterceptor);
ApiClientSecondary.interceptors.request.use(KioskLangInterceptor);
ApiClientQR.interceptors.request.use(KioskLangInterceptor);
ApiClientRFID.interceptors.request.use(KioskLangInterceptor);

export const initializeApi = async () => {
  if (!apiInitialized) {
    apiInitialized = (async () => {
      let isInitialized = false;

      do {
        try {
          const config = await invoke("read_config");
          const { machineId, machineName, primary_server_url, secondary_server_url, qr_server_url, rfid_server_url, manager_ip_url, popup_timers, humanSensorDetection } = config;
          managerIpUrl = manager_ip_url || "";
          MACHINE_ID = machineId || "";
          MACHINE_NAME = machineName || "";
          PRIMARY_SERVER_URL = primary_server_url;
          SECONDARY_SERVER_URL = secondary_server_url;
          QR_SERVER_URL = qr_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";
          RFID_SERVER_URL = rfid_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";
          popupTimers = popup_timers || [];
          HUMAN_SENSOR_DETECTION = humanSensorDetection ?? false;


          console.log(config, "data")
          console.log("Config Loaded:", {
            PRIMARY_SERVER_URL,
            SECONDARY_SERVER_URL
          });

          if (PRIMARY_SERVER_URL || SECONDARY_SERVER_URL) {
            ApiClientManagerIP.defaults.baseURL = managerIpUrl;
            ApiClientPrimary.defaults.baseURL = PRIMARY_SERVER_URL;
            ApiClientSecondary.defaults.baseURL = SECONDARY_SERVER_URL;
            ApiClientQR.defaults.baseURL = QR_SERVER_URL;
            ApiClientRFID.defaults.baseURL = RFID_SERVER_URL;

            // ✅ CRITICAL FIX: Sync server locale immediately after API initialization
            console.log("🌍 Initializing server locale on startup...");
            await syncServerLocale(runtimeLang);
          }
          await logEvent("info", "API initialized successfully");
          isInitialized = true;
        } catch (error) {
            await logEvent("error", `Failed to initialize API: ${error.message}`);
          console.error("Failed to fetch configuration:", error);
        }
      } while (!isInitialized);
    })();
  }
  return apiInitialized;
};

export { PRIMARY_SERVER_URL, SECONDARY_SERVER_URL, QR_SERVER_URL, RFID_SERVER_URL, managerIpUrl, MACHINE_ID, MACHINE_NAME, HUMAN_SENSOR_DETECTION };

export const ImageBaseUrl =
  "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk";

export const FloorImageUrl = "http://k-rsv.snu.ac.kr:8012";

/* =============================== API CALL USAGE ============================== */

export const getFloorList = async (libno) => {
  await ensureInitialized();
  const res = await ApiClientSecondary.get("/GetFloorUsingCount.asp", { params: { libno } });
  return res.data;
};

export const getNoticeInfo = async () => {
  await ensureInitialized();
  const res = await ApiClientSecondary.get("/GetNoticeInfo_TEST.asp");
  return res.data;
};

export const getSectorList = async ({ floor, floorno }) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/getSectorList", { floor, floorno }))?.data;
};

/* ===============================
   🔐 AUTH
================================ */

export const loginBySchoolNo = async (schoolno) => {
  await ensureInitialized();
  await logEvent("info", `Login attempt for school number: ${schoolno}`);
  const res = await ApiClientPrimary.get("/kiosk/login/login", { params: { schoolno } });
  await logEvent("info", `Login response received for: ${schoolno}`); 
  return res?.data;
};

export const getKioskUserInfo = async () => {
  await ensureInitialized();
  console.log("Fetching Kiosk User Info...", ApiClientPrimary.defaults.baseURL);
  return (await ApiClientPrimary.get("/json/getKioskUserInfo", {}))?.data;
};

export const QRValidate = async (qrCode) => {
  await ensureInitialized();
  await logEvent("info", `QR validation attempt`); 
  const encodedQrCode = encodeURIComponent(qrCode);
  return (await ApiClientQR.get("/qrCheck.do", { params: { code: qrCode } }));
};
/* ===============================
   💺 SEAT
================================ */

export const getSeatList = async ({ sectorno, floor, floorno, roomno, type = "S", }) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/getSeatList", { sectorno, floor, floorno, roomno, type, }))?.data;
};

export const getBookingTimeSeat = async ({ seatno, assignno }) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/getBookingTimeSeat", {
    ...(seatno && { seatno }),
    ...(assignno && { assignno }),
  }))?.data;
};

/* ===============================
   ✅ BOOKING
================================ */

export const setSeatAssign = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Assigning seat: ${JSON.stringify(payload)}`); 
  return (await ApiClientPrimary.post("/json/setSeatAssign", payload))?.data;
};

export const setExtend = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Extending seat: ${JSON.stringify(payload)}`);
  return (await ApiClientPrimary.post("/json/setExtend", payload))?.data;
};

export const setMove = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Moving seat: ${JSON.stringify(payload)}`); 
  return (await ApiClientPrimary.post("/json/setMove", payload))?.data;
};

export const setReturnSeat = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Returning seat: ${JSON.stringify(payload)}`); 
  return (await ApiClientPrimary.post("/json/setReturnSeat", payload))?.data;
};

export const setAssignSeatInfo = async (payload) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/getAssignSeatInfo", payload))?.data;
};

/* ===============================
   🚪 LOGOUT
================================ */

export const logout = async () => {
  await ensureInitialized();
  await logEvent("info", "User logout"); 
  return (await ApiClientPrimary.get("/kiosk/login/logout"))?.data;
};

export const managerCall = async (message) => {
  await ensureInitialized();
  const response = await fetch(`${managerIpUrl}/callMan.api?msg=${encodeURIComponent(message)}`, { mode: 'no-cors' });
  return await response.json();
}

