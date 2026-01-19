import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { disableNextFocus } from "../redux/slice/headphoneSlice";
import { clearLoginSession } from "../utils/clearLoginSession";
import { clearUserInfo } from "../redux/slice/userInfo";




const HEADPHONE_HINT =
  /(headphone|headset|earphone|earbuds|buds|airpods|이어폰|헤드폰|헤드셋|버즈)/i;

function isHeadphoneDevice(device) {
  return (
    device.kind === "audiooutput" &&
    HEADPHONE_HINT.test(device.label || "")
  );
}

export function useHeadphoneGuard() {
  const dispatch = useDispatch();

  const permissionRequestedRef = useRef(false);
  const prevConnectedRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;

    const ensurePermissionOnce = async () => {
      if (permissionRequestedRef.current) return;
      permissionRequestedRef.current = true;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        console.log("[HeadphoneGuard] audio permission granted");
      } catch {
        console.warn("[HeadphoneGuard] audio permission denied");
      }
    };

    const checkDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const connected = devices.some(isHeadphoneDevice);

      if (prevConnectedRef.current === null) {
        prevConnectedRef.current = connected;
        return;
      }

      // 🎧 JUST CONNECTED
      if (!prevConnectedRef.current && connected) {
        console.log("🎧 Headphone detected");

        clearLoginSession();
        dispatch(clearUserInfo());

        // 🔥 tell app: earphone injected, prevent focus, trigger speech
        dispatch(disableNextFocus());
      }

      prevConnectedRef.current = connected;
    };

    ensurePermissionOnce().then(checkDevices);

    navigator.mediaDevices.addEventListener("devicechange", checkDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", checkDevices);
  }, [dispatch]);
}
