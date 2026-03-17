import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginBySchoolNo, getUserInfo} from "../../services/api";
import { setUserInfo, clearUserInfo } from "./userInfo";

const initialState = {
  isAuthenticated: false,
  loading: false,
  error: null,
};

/* =========================
   Helper: Clear localStorage
========================= */
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
      // Step 1: Call getUserInfo as the login API
      const userInfoResponse = await getUserInfo({ schoolno: schoolNo });

      if (userInfoResponse?.header?.resultCode !== "200") {
        return rejectWithValue({
          errorCode: "ERROR_USER_NOT_FOUND",
          errorMessage: "사용자 정보가 없습니다",
        });
      }

      // Step 2: Check SCHOOLNO exists in loginBySchoolNo response
      const bookingResponse = await loginBySchoolNo(schoolNo);

      const bookingInfo = bookingResponse?.body;

      const returnedSchoolNo =
        bookingInfo?.SCHOOLNO;

      if (!returnedSchoolNo || String(returnedSchoolNo) !== String(schoolNo)) {
        return rejectWithValue({
          errorCode: "ERROR_USER_NOT_FOUND",
          errorMessage: "사용자 정보가 없습니다",
        });
      }

      // Step 3: Both checks passed — save and proceed
      localStorage.setItem("authenticated", "true");
      dispatch(setUserInfo(bookingInfo));

      return bookingInfo;
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
    // Clear local storage
    clearAuthStorage();

    // Clear redux user info
    dispatch(clearUserInfo());

    return true;
  },
);
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      /* LOGIN */
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })

      /* LOGOUT */
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      })
      .addCase(logout.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
