import { configureStore } from "@reduxjs/toolkit";
import userInfoReducer from "../redux/slice/userInfo";
import bookingTimeReducer from "../redux/slice/bookingTimeSlice";

export const store = configureStore({
  reducer: {
    userInfo: userInfoReducer,
    bookingTime: bookingTimeReducer,
  },
});
