import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getBookingList } from "../../services/api";

/* ================= FETCH BOOKING LIST ================= */

export const fetchBookingList = createAsyncThunk(
  "booking/fetchBookingList",
  async ({ schoolno, sDate, eDate }, { rejectWithValue }) => {
    try {
      const data = await getBookingList({ schoolno, sDate, eDate });
      return data;
    } catch (error) {
      console.error("BookingList API error:", error);
      return rejectWithValue(error.response?.data || "API Error");
    }
  }
);

/* ================= SLICE ================= */

const bookingSlice = createSlice({
  name: "booking",
  initialState: {
    bookingList: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearBookingList: (state) => {
      state.bookingList = [];
    },
  },
  extraReducers: (builder) => {
    builder

      /* ===== PENDING ===== */
      .addCase(fetchBookingList.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      /* ===== SUCCESS ===== */
      .addCase(fetchBookingList.fulfilled, (state, action) => {
        state.loading = false;
        state.bookingList = action.payload;
      })

      /* ===== ERROR ===== */
      .addCase(fetchBookingList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookingList } = bookingSlice.actions;

export default bookingSlice.reducer;