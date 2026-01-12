import axios from "axios";

/* ===============================
   🌐 LANGUAGE HELPERS
================================ */
export const getLang = () => {
  return localStorage.getItem("lang") || "ko"; // ko | en
};

export const setLang = (lang) => {
  localStorage.setItem("lang", lang);
};

/* ===============================
   🌐 BASE URLS
================================ */
export const BASE_URL_2 = "/SEATAPI";

export const ImageBaseUrl =
  "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk";

const BASE_PATH = "/NEW_SNU_BOOKING";

export const FloorImageUrl = "http://k-rsv.snu.ac.kr:8012";

/* ===============================
   ⚙️ COMMON HEADERS
================================ */
const commonHeaders = () => ({
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
  os_kind: "KIOSK",
  langcode: getLang(),   // ✅ language support
  locale: getLang(),     // ✅ matches old system
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
   🔁 INTERCEPTORS (AUTO LANG)
================================ */
baseClient.interceptors.request.use((config) => {
  config.headers.langcode = getLang();
  config.headers.locale = getLang();
  config.headers.os_kind = "KIOSK";
  return config;
});

baseClient_2.interceptors.request.use((config) => {
  config.headers.langcode = getLang();
  config.headers.locale = getLang();
  config.headers.os_kind = "KIOSK";
  return config;
});

/* ===============================
   PUBLIC API WRAPPER
================================ */
export const publicApi = {
  get: async (url, params = {}) => {
    const res = await baseClient.get(url, { params });
    return res.data;
  },
  post: async (url, data = {}) => {
    const res = await baseClient.post(url, data);
    return res.data;
  },
};

/* ===============================
   PROTECTED API WRAPPER
================================ */
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
   ✅ PUBLIC FLOOR API (SEAT MAP)
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

/* ===============================
   🔐 AUTH
================================ */
export const loginBySchoolNo = (schoolno) =>
  publicApi.get("/kiosk/login/login", { schoolno });

export const getKioskUserInfo = () =>
  protectedApi.post("/json/getKioskUserInfo", {});

/* ===============================
   🏢 SECTOR LIST
================================ */
export const getSectorList = ({ floor, floorno }) =>
  publicApi.post("/json/getSectorList", { floor, floorno });

/* ===============================
   💺 SEAT LIST
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

/* ===============================
   ⏱️ BOOKING TIME BY SEAT
================================ */
export const getBookingTimeSeat = ({ seatno, assignno }) =>
  protectedApi.post("/json/getBookingTimeSeat", {
    ...(seatno && { seatno }),
    ...(assignno && { assignno }),
  });

/* ===============================
   ✅ SET SEAT ASSIGN (BOOK SEAT)
================================ */
export const setSeatAssign = ({
  seatno,
  date,
  useTime,
  schoolno,
  members,
}) =>
  protectedApi.post("/json/setSeatAssign", {
    seatno,
    date,
    useTime,
    schoolno,
    members,
  });

export const setExtend = ({ b_SeqNo, extendM, useExpire }) =>
  protectedApi.post("/json/setExtend", {
    b_SeqNo,
    extendM,
    useExpire,
  });

export const setMove = async ({ seatNo, bSeqNo }) =>
  protectedApi.post("/json/setMove", {
    seatNo,
    bSeqNo,
  });

export const setReturnSeat = ({ b_SeqNo }) =>
  protectedApi.post("/json/setReturnSeat", {
    b_SeqNo,
  });

export const setAssignSeatInfo = ({ bseqno }) =>
  protectedApi.post("/json/getAssignSeatInfo", {
    bseqno,
  });

/* ===============================
   🚪 LOGOUT
================================ */
export const logout = () => publicApi.get("/kiosk/login/logout");
