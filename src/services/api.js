import axios from "axios";

export const MAP_BASE_URL = "http://k-rsv.snu.ac.kr:8012";
const BASE_PATH = "/NEW_SNU_BOOKING"; 
const baseClient = axios.create({
  baseURL: BASE_PATH,
  withCredentials: true, 
  timeout: 60000,
  headers: {
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
    "os_kind": "KIOSK",
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

/* =====================================================
   PUBLIC API
   (No auth required)
===================================================== */
export const publicApi = {
  get: async (url, params = {}) => {
    try {
      const response = await baseClient.get(url, { params });
      return response.data;
    } catch (error) {
      console.error(`Public GET failed: ${url}`, error);
      throw error;
    }
  },

  post: async (url, data = {}) => {
    try {
      const response = await baseClient.post(url, data);
      return response.data;
    } catch (error) {
      console.error(`Public POST failed: ${url}`, error);
      throw error;
    }
  },
};

/* =====================================================
   PROTECTED API
   (Requires valid JSESSIONID)
===================================================== */
export const protectedApi = {
  get: async (url, params = {}) => {
    try {
      const response = await baseClient.get(url, { params });
      return response.data;
    } catch (error) {
      console.error(`Protected GET failed: ${url}`, error);

      if (error.response?.status === 401) {
        console.warn("Session expired");
      }

      throw error;
    }
  },

  post: async (url, data = {}) => {
    try {
      // ✅ Convert data to URLSearchParams for form-urlencoded
      const formData = new URLSearchParams(data);
      
      const response = await baseClient.post(url, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
        }
      });
      return response.data;
    } catch (error) {
      console.error(`Protected POST failed: ${url}`, error);
      throw error;
    }
  },
};
/* =====================================================
   AUTH APIS
===================================================== */

export const loginBySchoolNo = async (schoolNo) => {
  if (!schoolNo) throw new Error("School number is required");

  return publicApi.get("/kiosk/login/login", {
    schoolno: schoolNo,
  });
};

/* =====================================================
   GET KIOSK USER INFO
===================================================== */
export const getKioskUserInfo = async () => {
  try {
    // ✅ Changed from GET to POST with empty body
    const response = await protectedApi.post("/json/getKioskUserInfo", {});
    return response;
  } catch (error) {
    console.error("Failed to fetch kiosk user info", error);
    throw error;
  }
};

/* =====================================================
   GET SECTOR LIST
===================================================== */
export const getSectorList = async ({ floor, floorno }) => {
  try {
    // GET /NEW_SNU_BOOKING/json/getSectorList
    const response = await publicApi.post("/json/getSectorList", {
    floor,
    floorno,
  });
    return response;
  } catch (error) {
    console.error("Failed to fetch sector list", error);
    throw error;
  }
};
