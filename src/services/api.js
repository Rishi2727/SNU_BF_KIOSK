import axios from "axios";

export const MAP_BASE_URL = "http://k-rsv.snu.ac.kr:8012";
export const ImageBaseUrl =
  "http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk";

const BASE_PATH = "/NEW_SNU_BOOKING";

const baseClient = axios.create({
  baseURL: BASE_PATH,
  withCredentials: true,
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    os_kind: "KIOSK",
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

/* ===============================
   PUBLIC API
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
   PROTECTED API
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
   AUTH
================================ */
export const loginBySchoolNo = (schoolno) =>
  publicApi.get("/kiosk/login/login", { schoolno });

export const getKioskUserInfo = () =>
  protectedApi.post("/json/getKioskUserInfo", {});

/* ===============================
   SECTOR LIST
================================ */
export const getSectorList = ({ floor, floorno }) =>
  publicApi.post("/json/getSectorList", { floor, floorno });

/* ===============================
   ✅ SEAT LIST (NEW)
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
   ✅ BOOKING TIME BY SEAT
================================ */
export const getBookingTimeSeat = ({ seatno, assignno }) =>
  protectedApi.post("/json/getBookingTimeSeat", {
    ...(seatno && { seatno }),
    ...(assignno && { assignno }),
  });
/* ===============================
   ✅ SET SEAT ASSIGN (BOOK SEAT)
================================ */
export const setSeatAssign = ({ seatno, date, useTime, schoolno, members }) =>
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

  export const setReturnSeat = ({ b_SeqNo }) =>
  protectedApi.post("/json/setReturnSeat", {
    b_SeqNo,
  });

  /* ===============================
   LOGOUT
================================ */
export const logout = () =>
  publicApi.get("/kiosk/login/logout");