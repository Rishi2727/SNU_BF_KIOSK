import { createSlice } from '@reduxjs/toolkit';
const initialState = {
  shouldFocusContent: false,
  shouldResetCursor: false,
  triggeredAt: null,
  preventFocus: false,
  earphoneInjected: false,   
};

const headphoneSlice = createSlice({
  name: "headphone",
  initialState,
  reducers: {
    triggerHeadphoneFocus: (state) => {
      state.shouldFocusContent = true;
      state.shouldResetCursor = true;
      state.triggeredAt = Date.now();
      state.preventFocus = false;
      state.earphoneInjected = false;
    },

    clearHeadphoneFocus: (state) => {
      state.shouldFocusContent = false;
      state.shouldResetCursor = false;
      state.triggeredAt = null;
      state.preventFocus = false;
      state.earphoneInjected = false;
    },

    disableNextFocus: (state) => {
      state.preventFocus = true;
      state.shouldFocusContent = false;
      state.shouldResetCursor = false;
      state.earphoneInjected = true;  
      state.triggeredAt = Date.now();
    },
  },
});

export const {
  triggerHeadphoneFocus,
  clearHeadphoneFocus,
  disableNextFocus,
} = headphoneSlice.actions;

export default headphoneSlice.reducer;
