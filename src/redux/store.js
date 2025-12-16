import { configureStore } from "@reduxjs/toolkit";
import userInfoReducer from "../redux/userInfo";

export const store = configureStore({
  reducer: {
    userInfo: userInfoReducer,
  },
});
