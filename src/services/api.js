import axios from "axios";
import { invoke } from "@tauri-apps/api/core";

import axiosTauriApiAdapter from "axios-tauri-api-adapter";

export const client = axios.create({
  // adapter: axiosTauriApiAdapter
});

// Create a separate client with Tauri adapter for external APIs to bypass CORS
export const externalClient = axios.create({
  adapter: axiosTauriApiAdapter
});

let managerIpUrl = "";
let socket_URL = "";
let BASE = "";
let apiInitialized = null;
export const initializeApi = async (kioskConfigurationFromContext) => {
  if (!apiInitialized) {
    apiInitialized = (async () => {
      let isInitialized = false;

      do {
        showLoader();
        let kioskConfiguration = kioskConfigurationFromContext; // Use passed config

        try {
          const config = await invoke("read_config");
          const { server, protocol, api_key, manager_ip_url } = config;
          if (!server) throw new Error("Server not found");
          console.log("first", manager_ip_url);
          managerIpUrl = manager_ip_url;
          BASE = `${protocol}${server}`;
          const API_PATH = "/api/v1/kiosk";

          const BASE_URL = `${BASE}${API_PATH}`;

          socket_URL =
            protocol === "https://"
              ? `wss://${server}/api/v1/kiosk/ws`
              : `ws://${server}/api/v1/kiosk/ws`;
          publicApi.defaults.baseURL = BASE_URL;
          protectedApi.defaults.baseURL = BASE_URL;

          const lng = localStorage.getItem("language") || "ko";
          publicApi.defaults.headers["Accept-Language"] = lng;
          protectedApi.defaults.headers["Accept-Language"] = lng;
          publicApi.defaults.headers["x-kiosk-uuid"] =
            kioskConfiguration?.machineUid;
          publicApi.defaults.headers["x-kiosk-version"] =
            kioskConfiguration?.version;
          protectedApi.defaults.headers["x-kiosk-uuid"] =
            kioskConfiguration?.machineUid;
          protectedApi.defaults.headers["x-kiosk-version"] =
            kioskConfiguration?.version;
          publicApi.defaults.headers["x-api-key"] = api_key;
          protectedApi.defaults.headers["x-api-key"] = api_key;

          isInitialized = true;
        } catch (error) {
          console.error("Failed to fetch configuration:", error);
        } finally {
          hideLoader();
        }
      } while (!isInitialized);
    })();
  }
  return apiInitialized;
};

export { socket_URL, managerIpUrl };


/* ===============================
   🌐 RUNTIME LANGUAGE MANAGER
================================ */

// 🔥 Single live source for API layer
let runtimeLang = localStorage.getItem("lang") || "en";
let lastSyncedLang = runtimeLang;

export const setApiLang = (lang) => {
  runtimeLang = lang;
};

export const getLang = () => runtimeLang;


/* ===============================
   🌐 BASE URLS
================================ */

const BASE_PATH = "/NEW_SNU_BOOKING";
export const BASE_URL_2 = "/SEATAPI";

export const ImageBaseUrl =
  "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk";

export const FloorImageUrl = "http://k-rsv.snu.ac.kr:8012";


/* ===============================
   🌐 SERVER LOCALE SYNC
================================ */

const syncServerLocale = async (lang) => {
  const formData = new URLSearchParams({ locale: lang });

  await axios.post(
    "/NEW_SNU_BOOKING/json/setChangeLocale",
    formData,
    {
      withCredentials: true,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    }
  );
};


/* ===============================
   ⚙️ COMMON HEADERS
================================ */

const commonHeaders = () => ({
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
  os_kind: "KIOSK",
  langcode: getLang(),
  locale: getLang(),
  "Content-Type": "application/x-www-form-urlencoded",
});


/* ===============================
   ⚙️ AXIOS CLIENTS
================================ */

const baseClient = axios.create({
  baseURL: BASE_PATH,
  withCredentials: true,
  timeout: 60000,
  headers: commonHeaders(),
});

const baseClient_2 = axios.create({
  baseURL: BASE_URL_2,
  timeout: 60000,
  headers: commonHeaders(),
});


/* ===============================
   🔁 INTERCEPTORS
================================ */

baseClient.interceptors.request.use(async (config) => {
  const currentLang = getLang();

  if (lastSyncedLang !== currentLang) {
    console.log("🌐 Sync backend locale →", currentLang);
    await syncServerLocale(currentLang);
    lastSyncedLang = currentLang;
  }

  config.headers.langcode = currentLang;
  config.headers.locale = currentLang;
  config.headers.os_kind = "KIOSK";

  return config;
});

baseClient_2.interceptors.request.use((config) => {
  const currentLang = getLang();
  config.headers.langcode = currentLang;
  config.headers.locale = currentLang;
  config.headers.os_kind = "KIOSK";
  return config;
});


/* ===============================
   📦 API WRAPPERS
================================ */

export const publicApi = {
  get: async (url, params = {}) => {
    const res = await baseClient.get(url, { params });
    return res.data;
  },
  post: async (url, data = {}) => {
    const formData = new URLSearchParams(data);
    const res = await baseClient.post(url, formData);
    return res.data;
  },
};

export const protectedApi = {
  post: async (url, data = {}) => {
    const formData = new URLSearchParams(data);
    const res = await baseClient.post(url, formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
      },
    });
    return res.data;
  },
};


/* ===============================
   🏢 FLOOR / SECTOR
================================ */

export const getFloorList = async (libno) => {
  const res = await baseClient_2.get("/GetFloorUsingCount.asp", {
    params: { libno },
  });
  return res.data;
};

export const getNoticeInfo = async () => {
  const res = await baseClient_2.get("/GetNoticeInfo_TEST.asp");
  return res.data;
};

export const getSectorList = ({ floor, floorno }) =>
  publicApi.post("/json/getSectorList", { floor, floorno });


/* ===============================
   🔐 AUTH
================================ */

export const loginBySchoolNo = (schoolno) =>
  publicApi.get("/kiosk/login/login", { schoolno });

export const getKioskUserInfo = () =>
  protectedApi.post("/json/getKioskUserInfo", {});

export const QRValidate = (qrCode) => {
  // URL encode the qrCode to handle special characters and spaces
  const encodedQrCode = encodeURIComponent(qrCode);
  return externalClient.get("https://libapp.snu.ac.kr/SNU_MOB/qrCheck.do", {
    params: { code: qrCode },
    responseType: 'text', // Expect text/XML response instead of JSON
    transformResponse: [(data) => {
      // Try to parse as JSON if possible, otherwise return raw text
      try {
        return JSON.parse(data);
      } catch (e) {
        // If XML or other format, return as-is
        return data;
      }
    }]
  });
};

/* ===============================
   💺 SEAT
================================ */

export const getSeatList = ({
  sectorno,
  floor,
  floorno,
  roomno,
  type = "S",
}) =>
  protectedApi.post("/json/getSeatList", {
    sectorno,
    floor,
    floorno,
    roomno,
    type,
  });

export const getBookingTimeSeat = ({ seatno, assignno }) =>
  protectedApi.post("/json/getBookingTimeSeat", {
    ...(seatno && { seatno }),
    ...(assignno && { assignno }),
  });


/* ===============================
   ✅ BOOKING
================================ */

export const setSeatAssign = (payload) =>
  protectedApi.post("/json/setSeatAssign", payload);

export const setExtend = (payload) =>
  protectedApi.post("/json/setExtend", payload);

export const setMove = (payload) =>
  protectedApi.post("/json/setMove", payload);

export const setReturnSeat = (payload) =>
  protectedApi.post("/json/setReturnSeat", payload);

export const setAssignSeatInfo = (payload) =>
  protectedApi.post("/json/getAssignSeatInfo", payload);


/* ===============================
   🚪 LOGOUT
================================ */

export const logout = () =>
  publicApi.get("/kiosk/login/logout");
