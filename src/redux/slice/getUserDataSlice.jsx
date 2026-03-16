import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getUserInfo } from "../../services/api";

// Async thunk
export const fetchUserInfo = createAsyncThunk(
  "user/fetchUserInfo",
  async ({ schoolno }, { rejectWithValue }) => {
    try {
      const data = await getUserInfo({ schoolno });
      return data?.body;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    userInfo: null,
    loading: false,
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(fetchUserInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.userInfo = action.payload;
      })
      .addCase(fetchUserInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default userSlice.reducer;