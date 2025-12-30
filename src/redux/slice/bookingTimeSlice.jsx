// src/redux/bookingTimeSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getBookingTimeSeat } from "../../services/api";

/* ---------------- THUNK FOR FETCH ---------------- */
export const fetchBookingTime = createAsyncThunk(
  "bookingTime/fetch",
  async ({ assignno, seatno }, { rejectWithValue }) => {
    try {
      const res = await getBookingTimeSeat({ assignno, seatno });

      console.log("API RAW RESPONSE --->", res);

      // Remove the .data - the response already IS the data object
      return {
        seatTimeInfo: res?.seatTimeInfo,        // Changed from res.data.seatTimeInfo
        bookingSeatInfo: res?.bookingSeatInfo   // Changed from res.data.bookingSeatInfo
      };
    } catch (err) {
      return rejectWithValue(err.response?.data || "Failed to fetch time info");
    }
  }
);

const bookingTimeSlice = createSlice({
  name: "bookingTime",
  initialState: {
    loading: false,
    timeOptions: [],
    defaultIndex: null,
    info: null,
    bookingSeatInfo: null,
    error: null,
  },

  reducers: {
    clearBookingTime: (state) => {
      state.timeOptions = [];
      state.info = null;
      state.defaultIndex = null;
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchBookingTime.pending, (state) => {
        state.loading = true;
      })
     .addCase(fetchBookingTime.fulfilled, (state, action) => {
  state.loading = false;
  state.info = action.payload.seatTimeInfo; // Also access the nested property
   state.bookingSeatInfo = action.payload.bookingSeatInfo;
  console.log("REDUX PAYLOAD --->", action.payload);
  
  const info = action.payload.seatTimeInfo; // Remove the 'x' and access seatTimeInfo
  if (!info) return;

  const labels = info.TIME_LABEL.split("|");
  const values = info.TIME_VALUE.split("|");
  const ynList = info.TIME_YN.split("|");

  state.timeOptions = labels.map((label, i) => ({
    label,
    value: Number(values[i]),
    enabled: ynList[i] === "Y",
  }));

  state.defaultIndex = Number(info.DEFAULT_INDEX) - 1;
})
      .addCase(fetchBookingTime.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearBookingTime } = bookingTimeSlice.actions;
export default bookingTimeSlice.reducer;
