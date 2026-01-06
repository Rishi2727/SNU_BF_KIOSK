import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  magnifierEnabled: false,
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
  },
});

export const {
  toggleMagnifier,
  enableMagnifier,
  disableMagnifier,
} = accessibilitySlice.actions;

export default accessibilitySlice.reducer;
