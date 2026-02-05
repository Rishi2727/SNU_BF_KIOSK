import axios from "axios";
import { invoke } from "@tauri-apps/api/core";
import axiosTauriApiAdapter from "axios-tauri-api-adapter";

const parseApiResponse = (data) => {
  // console.log("Raw API Response:", data);

  // Already parsed or non-string
  if (typeof data !== "string") {
    return data;
  }
  // Try JSON parse
  try {
    const cleaned = data
    .replace(/^\uFEFF/, "") // BOM
    .replace(/\0/g, "")     // NULL bytes
    .trim();
    return Object.freeze(JSON.parse(cleaned));
  } catch {
    // Not JSON → return text as-is
    console.warn("API Response is not valid JSON, returning raw text.", data.substring(0, 30));
    console.log("Full non-JSON response:", data);
    return data;
  }
};

export const masterClient = axios.create({
  adapter: axiosTauriApiAdapter,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
  },
  withCredentials: true,
  timeout: 60000,
  responseType: "text",
  transformResponse: [parseApiResponse],
});

let managerIpUrl = "";
let apiInitialized = null;
let PRIMARY_SERVER_URL = "";
let SECONDARY_SERVER_URL = "";
let QR_SERVER_URL = "";
let RFID_SERVER_URL = "";

/* ==================== LANGUAGE MANAGEMENT =================== */
let runtimeLang = localStorage.getItem("lang") || "en";
let lastSyncedLang = runtimeLang;
export const setApiLang = (lang) => { runtimeLang = lang; };
export const getLang = () => runtimeLang;
const syncServerLocale = async (lang) => {
  const formData = new URLSearchParams({ locale: lang });
  await masterClient.post(
    `${PRIMARY_SERVER_URL}/json/setChangeLocale`,
    formData
  );
};
const KioskLangInterceptor = async (config) => {
  console.log("KioskLangInterceptor: Setting langcode and locale to", runtimeLang);
  if (lastSyncedLang !== runtimeLang) {
    await syncServerLocale(runtimeLang);
    lastSyncedLang = runtimeLang;
  }
  config.headers.langcode = runtimeLang;
  config.headers.locale = runtimeLang;
  config.headers.os_kind = "KIOSK";

  // if (config.data && config.headers['Content-Type'] === 'application/x-www-form-urlencoded; charset=utf-8') {
  //   const params = new URLSearchParams();
  //   Object.keys(config.data).forEach(key => {
  //     params.append(key, config.data[key]);
  //   });
  //   config.data = params.toString();
  // }
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

let ApiClientManagerIP = masterClient.create();
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
          const { primary_server_url, secondary_server_url, qr_server_url, rfid_server_url, manager_ip_url } = config;
          managerIpUrl = manager_ip_url || "";
          PRIMARY_SERVER_URL = primary_server_url;
          SECONDARY_SERVER_URL = secondary_server_url;
          QR_SERVER_URL = qr_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";
          RFID_SERVER_URL = rfid_server_url || "https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do";

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
          }

          isInitialized = true;
        } catch (error) {
          console.error("Failed to fetch configuration:", error);
        } finally {
          // hideLoader();
        }
      } while (!isInitialized);
    })();
  }
  return apiInitialized;
};

export { PRIMARY_SERVER_URL, SECONDARY_SERVER_URL, QR_SERVER_URL, RFID_SERVER_URL, managerIpUrl };



export const ImageBaseUrl =
  "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk";

export const FloorImageUrl = "http://k-rsv.snu.ac.kr:8012";

/* =============================== API CALL USAGE ============================== */

export const getFloorList = async (libno) => {
  await ensureInitialized();
  const res = await ApiClientSecondary.get("/GetFloorUsingCount.asp", { params: { libno }});
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
  return (await ApiClientPrimary.get("/kiosk/login/login", { params: { schoolno } }))?.data;
};

export const getKioskUserInfo = async () => {
  await ensureInitialized();
  console.log("Fetching Kiosk User Info...", ApiClientPrimary.defaults.baseURL);
  return (await ApiClientPrimary.get("/json/getKioskUserInfo", {}))?.data;
};

export const QRValidate = async (qrCode) => {
  await ensureInitialized();
  // URL encode the qrCode to handle special characters and spaces
  const encodedQrCode = encodeURIComponent(qrCode);
  return (await ApiClientQR.get("/qrCheck.do", {params: { code: encodedQrCode },}))?.data;
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
  return (await ApiClientPrimary.post("/json/setSeatAssign", payload))?.data;
};

export const setExtend = async (payload) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/setExtend", payload))?.data;
};

export const setMove = async (payload) => {
  await ensureInitialized();
  return (await ApiClientPrimary.post("/json/setMove", payload))?.data;
};

export const setReturnSeat = async (payload) => {
  await ensureInitialized();
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
  return (await ApiClientPrimary.get("/kiosk/login/logout"))?.data;
};