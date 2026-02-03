import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginBySchoolNo, getKioskUserInfo, logout as logoutApi } from "../../services/api";
import { setUserInfo, clearUserInfo } from "./userInfo";

const initialState = {
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunk for login
export const login = createAsyncThunk(
  "auth/login",
  async (schoolNo, { dispatch, rejectWithValue }) => {
    try {
      const response = await loginBySchoolNo(schoolNo);
      const params = new URLSearchParams(response.split("?")[1]);

      if (params.get("ERROR_YN") === "Y") {
        const errorCode = params.get("ERROR_CD");
        const errorText = params.get("ERROR_TEXT");
        return rejectWithValue({
          errorCode,
          errorMessage: errorText || "Login failed"
        });
      }

      // Get user info after successful login
      const userInfo = await getKioskUserInfo();

      if (userInfo?.successYN === "Y") {
        localStorage.setItem("authenticated", "true");
        
        // Dispatch setUserInfo to update userInfo slice
        dispatch(setUserInfo(userInfo.bookingInfo));
        
        return userInfo.bookingInfo;
      } else {
        return rejectWithValue({
          errorCode: "ERROR_USER_INFO",
          errorMessage: "Failed to get user information"
        });
      }
    } catch (error) {
      return rejectWithValue({
        errorCode: "ERROR_NETWORK",
        errorMessage: error.message || "Network error"
      });
    }
  }
);

// Async thunk for logout
export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { dispatch, rejectWithValue }) => {
    try {
      await logoutApi();
      
      // Clear all authentication-related localStorage
      localStorage.removeItem("authenticated");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("isAuthenticated");
      
      // Dispatch clearUserInfo to clear userInfo slice
      dispatch(clearUserInfo());
      
      return null;
    } catch (error) {
      // Even if API fails, clear local state
      localStorage.removeItem("authenticated");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");
      localStorage.removeItem("token");
      localStorage.removeItem("isLoggedIn");
      localStorage.removeItem("isAuthenticated");
      
      // Dispatch clearUserInfo to clear userInfo slice
      dispatch(clearUserInfo());
      
      return null;
    }
  }
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
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      })
      // Logout
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
