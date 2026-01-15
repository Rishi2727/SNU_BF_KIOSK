import { createSlice } from "@reduxjs/toolkit";

const initialLang = localStorage.getItem("lang") || "en";

const langSlice = createSlice({
  name: "lang",
  initialState: {
    current: initialLang,
  },
  reducers: {
    setLanguage: (state, action) => {
      state.current = action.payload;
    },
  },
});

export const { setLanguage } = langSlice.actions;
export default langSlice.reducer;
