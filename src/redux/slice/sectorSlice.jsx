// redux/slice/sectorInfo.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  sectorList: [],
  currentFloor: null,
  loading: false,
  error: null,
};

const sectorInfoSlice = createSlice({
  name: 'sectorInfo',
  initialState,
  reducers: {
    setSectorList: (state, action) => {
      state.sectorList = action.payload;
      state.loading = false;
      state.error = null;
    },
    setCurrentFloor: (state, action) => {
      state.currentFloor = action.payload;
    },
    setSectorLoading: (state, action) => {
      state.loading = action.payload;
    },
    setSectorError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearSectorInfo: (state) => {
      state.sectorList = [];
      state.currentFloor = null;
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setSectorList,
  setCurrentFloor,
  setSectorLoading,
  setSectorError,
  clearSectorInfo,
} = sectorInfoSlice.actions;

export default sectorInfoSlice.reducer;