import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  magnifierEnabled: false,
  volume: Number(localStorage.getItem("volume")) || 1,
};

const accessibilitySlice = createSlice({
  name: "accessibility",
  initialState,
  reducers: {
    toggleMagnifier(state) {
      state.magnifierEnabled = !state.magnifierEnabled;
    },
    enableMagnifier(state) {
      state.magnifierEnabled = true;
    },
    disableMagnifier(state) {
      state.magnifierEnabled = false;
    },
    increaseVolume(state) {
      state.volume = Math.min(1, state.volume + 0.1);
      localStorage.setItem("volume", state.volume);
    },

    decreaseVolume(state) {
      state.volume = Math.max(0, state.volume - 0.1);
      localStorage.setItem("volume", state.volume);
    },

    setVolume(state, action) {
      state.volume = action.payload;
      localStorage.setItem("volume", action.payload);
    },
  },
});

export const {
  toggleMagnifier,
  enableMagnifier,
  disableMagnifier,
  increaseVolume,
  decreaseVolume,
  setVolume,
} = accessibilitySlice.actions;

export default accessibilitySlice.reducer;
