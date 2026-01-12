import { configureStore } from "@reduxjs/toolkit";
import userInfoReducer from "../redux/slice/userInfo";
import bookingTimeReducer from "../redux/slice/bookingTimeSlice";
import sectorInfoReducer from "../redux/slice/sectorSlice";
import accessibilityReducer from "../redux/slice/accessibilitySlice";
import floorReducer from "../redux/slice/floorSlice";
import langReducer from "../redux/slice/langSlice";

export const store = configureStore({
  reducer: {
    userInfo: userInfoReducer,
    bookingTime: bookingTimeReducer,
    sectorInfo: sectorInfoReducer,
    accessibility: accessibilityReducer,
    floor: floorReducer,
    lang: langReducer, 
  },
});
