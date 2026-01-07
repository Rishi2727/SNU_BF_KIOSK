// src/global/GlobalShortcuts.jsx
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  increaseVolume,
  decreaseVolume,
  toggleMagnifier,
} from "../redux/slice/accessibilitySlice";

export default function GlobalShortcuts() {
  const dispatch = useDispatch();
  const { volume } = useSelector((state) => state.accessibility);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat || e.isComposing) return;

      if (e.key === "ArrowUp" || e.key === "+") {
        e.preventDefault();
        dispatch(increaseVolume());
      }

      if (e.key === "ArrowDown" || e.key === "-") {
        e.preventDefault();
        dispatch(decreaseVolume());
      }

      if (e.key === "|") {
        e.preventDefault();
        dispatch(toggleMagnifier());
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [dispatch, volume]);

  return null;
}
