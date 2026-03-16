import { configureStore } from "@reduxjs/toolkit";
import userInfoReducer from "../redux/slice/userInfo";
import bookingTimeReducer from "../redux/slice/bookingTimeSlice";
import sectorReducer from "../redux/slice/sectorSlice";
import accessibilityReducer from "../redux/slice/accessibilitySlice";
import floorReducer from "../redux/slice/floorSlice";
import langReducer from "../redux/slice/langSlice";
import headphoneReducer from "../redux/slice/headphoneSlice";
import authReducer from "../redux/slice/authSlice";
import bookingReducer from "../redux/slice/bookingHistroySlice";
import userReducer from "./slice/getUserDataSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    userInfo: userInfoReducer,
    bookingTime: bookingTimeReducer,
    sector: sectorReducer,
    accessibility: accessibilityReducer,
    floor: floorReducer,
    lang: langReducer,
    headphone: headphoneReducer,
    booking: bookingReducer,
    user: userReducer,
  },
});
