import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { loginBySchoolNo,} from "../../services/api";
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

/* =========================  
   LOGIN
========================= */
export const login = createAsyncThunk(
  "auth/login",
  async (schoolNo, { dispatch, rejectWithValue }) => {
    try {
      const response = await loginBySchoolNo(schoolNo);

      if (response?.header?.resultCode !== "200") {
        return rejectWithValue({
          errorCode: "ERROR_API",
          errorMessage: response?.header?.resultMsg || "Login failed",
        });
      }

      const bookingInfo = response.body;

      // Save auth state
      localStorage.setItem("authenticated", "true");

      // Save user info in Redux
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
