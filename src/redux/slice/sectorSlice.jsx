import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getSectorList } from "../../services/api";

/* ===============================
   Thunk: Fetch Sector List
================================ */
export const fetchSectorList = createAsyncThunk(
  "sector/fetchSectorList",
  async ({ floor, floorno }, { rejectWithValue }) => {
    try {
      const response = await getSectorList({ floor, floorno });
      return response?.SectorList || response;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data || "Failed to fetch sector list"
      );
    }
  }
);

/* ===============================
   Slice
================================ */
const sectorSlice = createSlice({
  name: "sector",
  initialState: {
    sectors: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearSectors: (state) => {
      state.sectors = [];
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSectorList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSectorList.fulfilled, (state, action) => {
        state.loading = false;
        state.sectors = action.payload;
      })
      .addCase(fetchSectorList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSectors } = sectorSlice.actions;
export default sectorSlice.reducer;
