// redux/slice/langSlice.js
import { createSlice } from "@reduxjs/toolkit";

const langSlice = createSlice({
  name: "lang",
  initialState: {
    current: localStorage.getItem("lang") || "ko",
  },
  reducers: {
    setLanguage: (state, action) => {
      state.current = action.payload;
      localStorage.setItem("lang", action.payload);
    },
  },
});

export const { setLanguage } = langSlice.actions;
export default langSlice.reducer;
