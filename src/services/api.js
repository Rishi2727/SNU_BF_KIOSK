import axios from "axios";
import { invoke } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { logEvent } from "../logger";

// Custom Tauri adapter that properly handles large responses and null bytes
const customTauriAdapter = async (config) => {
  try {
    const url = config.baseURL ? config.baseURL + config.url : config.url;

    // Build query parameters
    let fullUrl = url;
    if (config.params) {
      const params = new URLSearchParams(config.params);
      fullUrl += (url.includes("?") ? "&" : "?") + params.toString();
    }

    // Make request using Tauri's fetch
    const response = await tauriFetch(fullUrl, {
      method: config.method?.toUpperCase() || "GET",
      headers: config.headers || {},
      body: config.data,
    });
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
      statusText: response.statusText || "OK",
      headers: Object.fromEntries(response.headers.entries()),
      config: config,
      request: {},
    };
  } catch (error) {
    console.error("Custom Tauri adapter error:", error);
    throw error;
  }
};

const parseApiResponse = (data) => {
  // Already parsed object
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    !(data instanceof ArrayBuffer)
  ) {
    return data;
  }

  // ArrayBuffer from Tauri adapter
  if (data instanceof ArrayBuffer) {
    const decoder = new TextDecoder("utf-8");
    data = decoder.decode(data);
  }

  // Not a string at this point
  if (typeof data !== "string") {
    return data;
  }

  // Clean the string FIRST before parsing
  const cleaned = data
    .replace(/^\uFEFF/, "") // Remove BOM
    .replace(/\0/g, "") // Remove ALL null bytes (this is critical!)
    .trim();

  // Try JSON parse on cleaned string
  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (e) {
    // Log detailed error info
    console.warn(
      "⚠️ API Response is not valid JSON, returning raw text.",
      cleaned.substring(0, 80),
    );
    console.error("Parse error:", e.message);
    console.log(
      "Data length:",
      cleaned.length,
      "Original length:",
      data.length,
    );

    // Try to find where the JSON is broken
    const errorPos = e.message.match(/position (\d+)/);
    if (errorPos) {
      const pos = parseInt(errorPos[1]);
      console.log(
        "Error context:",
        cleaned.substring(
          Math.max(0, pos - 50),
          Math.min(cleaned.length, pos + 50),
        ),
      );
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
    // "x-forwarded-for": "103.83.146.30"
  },
  withCredentials: true,
  timeout: 60000,
  transformResponse: [parseApiResponse],
});

let managerIpUrl = "";
let apiInitialized = null;
let PRIMARY_SERVER_URL = "";
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
export const setApiLang = async (lang) => {
  console.log("🌍 setApiLang called with:", lang);

  runtimeLang = lang;

  // If API already initialized → sync immediately
  if (PRIMARY_SERVER_URL) {
    await syncServerLocale(lang);
  }

  lastSyncedLang = lang;
};

const syncServerLocale = async (lang) => {
  console.log("🔄 Syncing server locale to:", lang);
  try {
    const formData = new URLSearchParams({ locale: lang });
    await masterClient.post(
      `${PRIMARY_SERVER_URL}/json/setChangeLocale`,
      formData,
    );
    console.log("✅ Server locale synced successfully to:", lang);
    lastSyncedLang = lang; // ✅ Update after successful sync
  } catch (error) {
    console.error("❌ Failed to sync server locale:", error);
    // Don't update lastSyncedLang on error, so it retries next time
  }
};

const KioskLangInterceptor = async (config) => {
  // ✅ Always sync if not yet synced or language changed
  if (lastSyncedLang !== runtimeLang) {
    console.log("🔄 Language mismatch detected, syncing...");
    await syncServerLocale(runtimeLang);
  }

  config.headers.langcode = runtimeLang;
  config.headers.locale = runtimeLang;
  config.headers.oskind = "KIOSK";

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
        return true; // ✅ return immediately when ready
      } catch (err) {
        // initialization failed → keep waiting until timeout
      }
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  throw new Error("API is not initialized after 10 seconds.");
};

let ApiClientManagerIP = axios.create();
let ApiClientPrimary = masterClient.create();
let ApiClientQR = masterClient.create();
let ApiClientRFID = masterClient.create();

ApiClientManagerIP.interceptors.request.use(KioskLangInterceptor);
ApiClientPrimary.interceptors.request.use(KioskLangInterceptor);
ApiClientQR.interceptors.request.use(KioskLangInterceptor);
ApiClientRFID.interceptors.request.use(KioskLangInterceptor);

export const initializeApi = async () => {
  if (!apiInitialized) {
    apiInitialized = (async () => {
      let isInitialized = false;

      do {
        try {
          const config = await invoke("read_config");
          const {
            machineId,
            machineName,
            primary_server_url,
            qr_server_url,
            rfid_server_url,
            manager_ip_url,
            popup_timers,
            humanSensorDetection,
          } = config;
          managerIpUrl = manager_ip_url || "";
          MACHINE_ID = machineId || "";
          MACHINE_NAME = machineName || "";
          PRIMARY_SERVER_URL = primary_server_url;
          QR_SERVER_URL =
            qr_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";
          RFID_SERVER_URL =
            rfid_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";
          popupTimers = popup_timers || [];
          HUMAN_SENSOR_DETECTION = humanSensorDetection ?? false;

          if (PRIMARY_SERVER_URL) {
            ApiClientManagerIP.defaults.baseURL = managerIpUrl;
            ApiClientPrimary.defaults.baseURL = PRIMARY_SERVER_URL;
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

export {
  PRIMARY_SERVER_URL,
  QR_SERVER_URL,
  RFID_SERVER_URL,
  managerIpUrl,
  MACHINE_ID,
  MACHINE_NAME,
  HUMAN_SENSOR_DETECTION,
};

export const getImageBaseUrl = () =>
  `${PRIMARY_SERVER_URL}/MAP/ICON`;
export const getFloorImageUrl = () => PRIMARY_SERVER_URL;

/* =============================== API CALL USAGE ============================== */

export const getFloorList = async (libno) => {
  await ensureInitialized();
  await logEvent("info", `Fetching floor list for libno: ${libno}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/GetFloorUsingCount.asp", {
      params: { libno },
    });
    return res.data;
  } catch (error) {
    await logEvent("error", `Failed to fetch floor list for libno ${libno}: ${error.message}`);
    throw error;
  }
};

export const getNoticeInfo = async () => {
  await ensureInitialized();
  await logEvent("info", "Fetching notice info");
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/GetNoticeInfo.asp");
    return res.data;
  } catch (error) {
    await logEvent("error", `Failed to fetch notice info: ${error.message}`);
    throw error;
  }
};

export const getSectorList = async ({ floor, floorno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching sector list for floor: ${floor}, floorno: ${floorno}`);
  try {
    const res = await ApiClientPrimary.post("/SEATAPI/GetSector.asp", {
      floor,
      floorno,
    });
    return res?.data?.body?.SectorList || [];
  } catch (error) {
    await logEvent("error", `Failed to fetch sector list for floor ${floor}, floorno ${floorno}: ${error.message}`);
    throw error;
  }
};

/* ===============================
   🔐 AUTH
================================ */

export const loginBySchoolNo = async (schoolno) => {
  await ensureInitialized();
  await logEvent("info", `Login attempt for school number: ${schoolno}`);
  try {
    const res = await ApiClientPrimary.get(
      "/SEATAPI/GetBookingInfoSchoolno.asp",
      { params: { schoolno } },
    );
    await logEvent("info", `Login response received for: ${schoolno}`);
    return res?.data;
  } catch (error) {
    await logEvent("error", `Login failed for schoolno ${schoolno}: ${error.message}`);
    throw error;
  }
};

export const getUserInfo = async ({ schoolno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching user info for schoolno: ${schoolno}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/GetUserInfo.asp", {
      params: { schoolno },
    });
    console.log("use info ", res?.data);
    return res.data;
  } catch (error) {
    await logEvent("error", `Failed to fetch user info for schoolno ${schoolno}: ${error.message}`);
    throw error;
  }
};
export const getBookingOnlySchoolNo = async ({ schoolno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching booking (only) for confirmation seat: ${schoolno}`);

  try {
    const res = await ApiClientPrimary.get(
      "/SEATAPI/GetBookingOnlySchoolno.asp",
      {
        params: { schoolno },
      }
    );

    console.log("getBookingOnlySchoolNo response:", res?.data);
    return res?.data;
  } catch (error) {
    await logEvent(
      "error",
      `Failed to fetch booking only for schoolno ${schoolno}: ${error.message}`
    );
    throw error;
  }
};
export const QRValidate = async (qrCode) => {
  await ensureInitialized();
  await logEvent("info", `QR validation attempt`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/GetUserLogin_NEW.asp", {
      params: { qrCd: qrCode },
    });
    console.log("qr data", res?.data?.body);
    return res?.data?.body;
  } catch (error) {
    await logEvent("error", `QR validation failed: ${error.message}`);
    throw error;
  }
};

/* ===============================
   💺 SEAT
================================ */

export const getSeatList = async ({ sectorno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching seat list for sectorno: ${sectorno}`);
  try {
    const res = await ApiClientPrimary.post("/SEATAPI/GetBookingSeat.asp", {
      sectorno,
    });
    return res?.data?.body?.SeatList || [];
  } catch (error) {
    await logEvent("error", `Failed to fetch seat list for sectorno ${sectorno}: ${error.message}`);
    throw error;
  }
};

export const getBookingBseqno = async ({ bseqno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching booking for bseqno: ${bseqno}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/GetBookingBseqno.asp", {
      params: { bseqno },
    });
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to fetch booking for bseqno ${bseqno}: ${error.message}`);
    throw error;
  }
};

export const getBookingTimeSeat = async ({ seatno, assignno }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching booking time for seatno: ${seatno}`);
  try {
    const res = await ApiClientPrimary.post("/SEATAPI/GetBookingTimeSeat.asp", {
      ...(seatno && { seatno }),
    });
    return res?.data?.body || [];
  } catch (error) {
    await logEvent("error", `Failed to fetch booking time for seatno ${seatno}: ${error.message}`);
    throw error;
  }
};

export const getBookingList = async ({ schoolno, sDate, eDate }) => {
  await ensureInitialized();
  await logEvent("info", `Fetching booking list for schoolno: ${schoolno}, sDate: ${sDate}, eDate: ${eDate}`);
  try {
    const res = await ApiClientPrimary.get(
      "/SEATAPI/GetBookingListSchoolno.asp",
      { params: { schoolno, sDate, eDate } },
    );
    return res?.data?.body?.BookingList || [];
  } catch (error) {
    await logEvent("error", `Failed to fetch booking list for schoolno ${schoolno}: ${error.message}`);
    throw error;
  }
};

/* ===============================
   ✅ BOOKING
================================ */

export const setSeatAssign = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Assigning seat: ${JSON.stringify(payload)}`);
  try {
    const res = await ApiClientPrimary.post("/SEATAPI/RunSeatAssign.asp", payload);
    console.log("response", res?.data);
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to assign seat: ${error.message}`);
    throw error;
  }
};

export const setExtend = async ({ bseqno, min, endTime }) => {
  await ensureInitialized();
  await logEvent("info", `Extending seat: bseqno=${bseqno}, min=${min}, endTime=${endTime}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/RunExtendTime.asp", {
      params: { bseqno, min, endTime },
    });
    console.log("--------------", res?.data);
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to extend seat for bseqno ${bseqno}: ${error.message}`);
    throw error;
  }
};

export const setMove = async ({ bseqno, newSeatno }) => {
  await ensureInitialized();
  await logEvent("info", `Moving seat: bseqno=${bseqno}, newSeatno=${newSeatno}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/RunMoveSeat.asp", {
      params: { bseqno, newSeatno },
    });
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to move seat from bseqno ${bseqno} to ${newSeatno}: ${error.message}`);
    throw error;
  }
};

export const setReturnSeat = async (payload) => {
  await ensureInitialized();
  await logEvent("info", `Returning seat: ${JSON.stringify(payload)}`);
  try {
    const res = await ApiClientPrimary.post("/SEATAPI/RunReturnSeat.asp", payload);
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to return seat: ${error.message}`);
    throw error;
  }
};

export const runBookingCheck = async ({ bseqno }) => {
  await ensureInitialized();
  await logEvent("info", `Running booking check for bseqno: ${bseqno}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/RunBookingCheck.asp", {
      params: { bseqno },
    });
    console.log("RunBookingCheck response:", res?.data);
    return res?.data;
  } catch (error) {
    await logEvent("error", `Booking check failed for bseqno ${bseqno}: ${error.message}`);
    throw error;
  }
};

export const setAssignSeatInfo = async ({ schoolno, date, seatno, useTime }) => {
  await ensureInitialized();
  await logEvent("info", `Booking seat: schoolno=${schoolno}, date=${date}, seatno=${seatno}, useTime=${useTime}`);
  try {
    const res = await ApiClientPrimary.get("/SEATAPI/RunSeatBooking.asp", {
      params: { schoolno, date, seatno, useTime },
    });
    return res?.data;
  } catch (error) {
    await logEvent("error", `Failed to book seat ${seatno} for schoolno ${schoolno}: ${error.message}`);
    throw error;
  }
};

export const managerCall = async (message) => {
  await ensureInitialized();
  await logEvent("info", `Manager call with message: ${message}`);
  try {
    const response = await fetch(
      `${managerIpUrl}/callMan.api?msg=${encodeURIComponent(message)}`,
      { method: "GET", mode: "no-cors" },
    );
    return await response.json();
  } catch (error) {
    await logEvent("error", `Manager call failed with message "${message}": ${error.message}`);
    throw error;
  }
};