import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  data: null,
  deviceName: null,
};

const serialDataSlice = createSlice({
  name: "serialData",
  initialState,
  reducers: {
    setSerialData: (state, action) => {
      const payload = action.payload || {};
      state.data = payload.data || null;
      state.deviceName = payload.deviceName || null;
    },
    resetSerialData: (state) => {
      state.data = null;
      state.deviceName = null;
    },
  },
});

export const { setSerialData, resetSerialData } = serialDataSlice.actions;

export default serialDataSlice.reducer;
