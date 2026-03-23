import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginBySchoolNo, getUserInfo, getBookingOnlySchoolNo } from "../../services/api";
import { setUserInfo, clearUserInfo } from "./userInfo";

const initialState = {
  isAuthenticated: false,
  loading: false,
  error: null,
};

const clearAuthStorage = () => {
  localStorage.removeItem("authenticated");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("token");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("isAuthenticated");
};

export const login = createAsyncThunk(
  "auth/login",
  async (schoolNo, { dispatch, rejectWithValue }) => {
    try {
      // Step 1: Validate user exists
      const userInfoResponse = await getUserInfo({ schoolno: schoolNo });
      if (userInfoResponse?.header?.resultCode !== "200") {
        return rejectWithValue({
          errorCode: "ERROR_USER_NOT_FOUND",
          errorMessage: "사용자 정보가 없습니다",
        });
      }

      // Step 2: Get base booking info
      const bookingResponse = await loginBySchoolNo(schoolNo);
      const bookingInfo = bookingResponse?.body;
      const returnedSchoolNo = bookingInfo?.SCHOOLNO;

      if (!returnedSchoolNo || String(returnedSchoolNo) !== String(schoolNo)) {
        return rejectWithValue({
          errorCode: "ERROR_USER_NOT_FOUND",
          errorMessage: "사용자 정보가 없습니다",
        });
      }

      // Step 3: Call getBookingOnlySchoolNo to check for reservations
      let mergedInfo = { ...bookingInfo };

      try {
        const bookingOnlyResponse = await getBookingOnlySchoolNo({ schoolno: schoolNo });
        const bookingOnlyList = bookingOnlyResponse?.body?.BookingList ?? [];

        if (bookingOnlyList.length > 0) {
          // Pick the most relevant booking (STATUS 2 = reserved, STATUS 3 = in use)
          const activeBooking =
            bookingOnlyList.find((b) => b.STATUS === 3) ||
            bookingOnlyList.find((b) => b.STATUS === 2);
console.log("activeBooking", activeBooking)
          if (activeBooking) {
            mergedInfo = {
              ...bookingInfo,

              // Enable these 3 buttons when booking exists
              BOOKING_CHECK_YN: activeBooking.CHECK_YN ?? "Y",
              CANCEL_YN:        "Y",   // reservation cancel always available if booking exists
              // Keep other flags from loginBySchoolNo (extend, move, return)
              EXTEND_YN:        bookingInfo.EXTEND_YN ?? "N",
              MOVE_YN:          bookingInfo.MOVE_YN   ?? "N",
              RETURN_YN:        bookingInfo.RETURN_YN ?? "N",
              ASSIGN_CHECK_YN:  bookingInfo.ASSIGN_CHECK_YN ?? "N",

              // Booking identifiers for SeatActionModal
              BOOKING_NO:   activeBooking.BSEQNO,
              ASSIGN_NO:    activeBooking.STATUS === 3
                              ? String(activeBooking.BSEQNO)
                              : "0",

              // Seat/time info to display in modal
              USESTART:     activeBooking.USESTART,
              USEEXPIRE:    activeBooking.USEEXPIRE,
              FLOOR_NAME:   activeBooking.FLOOR_NAME,
              SECTOR_NAME:  activeBooking.SECTOR_NAME,
              SEAT_VNAME:   activeBooking.SEAT_VNAME,
              SEAT_NAME:    activeBooking.SEAT_NAME,
              SEATNO:       activeBooking.SEATNO,
              SECTORNO:     activeBooking.SECTORNO,
              STATUS:       activeBooking.STATUS,
              STATUS_NAME:  activeBooking.STATUS_NAME,
            };
          }
        }
      } catch (bookingOnlyErr) {
        // Non-fatal — proceed with base bookingInfo flags
        console.warn("getBookingOnlySchoolNo failed:", bookingOnlyErr.message);
      }

      localStorage.setItem("authenticated", "true");
      dispatch(setUserInfo(mergedInfo));

      return mergedInfo;
    } catch (error) {
      return rejectWithValue({
        errorCode: "ERROR_NETWORK",
        errorMessage: error.message || "Network error",
      });
    }
  },
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch }) => {
    clearAuthStorage();
    dispatch(clearUserInfo());
    return true;
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending,    (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled,  (state) => { state.loading = false; state.isAuthenticated = true; })
      .addCase(login.rejected,   (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      .addCase(logout.pending,   (state) => { state.loading = true; })
      .addCase(logout.fulfilled, (state) => { state.loading = false; state.isAuthenticated = false; })
      .addCase(logout.rejected,  (state) => { state.loading = false; state.isAuthenticated = false; });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;