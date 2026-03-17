import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getFloorList } from "../../services/api";

/* ===============================
   ✅ THUNK: FETCH FLOOR LIST
================================ */
export const fetchFloorList = createAsyncThunk(
  "floor/fetchFloorList",
  async (libno, { rejectWithValue }) => {
    try {
      const res = await getFloorList(libno);
      return res?.body?.FloorUsingList || [];
    } catch (error) {
      return rejectWithValue(error.message || "Floor API failed");
    }
  }
);

/* ===============================
   ✅ SLICE
================================ */
const floorSlice = createSlice({
  name: "floor",
  initialState: {
    floors: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearFloors: (state) => {
      state.floors = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFloorList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFloorList.fulfilled, (state, action) => {
        state.loading = false;

        state.floors = action.payload.map((f) => ({
          id: f.FLOORNO,
          title: f.EN_NAME,      // 🔹 ALWAYS use for routing (stable)
          name: f.NAME,          // 🔹 localized (API already respects lang)
          floor: String(f.FLOOR),
          floorno: String(f.FLOORNO),
          total: Number(f.TOTAL_CNT),
          occupied: Number(f.USE_CNT),
        }));
      }).addCase(fetchFloorList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearFloors } = floorSlice.actions;
export default floorSlice.reducer;
