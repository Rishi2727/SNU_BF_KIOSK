import { useEffect, useRef, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  increaseVolume,
  decreaseVolume,
  toggleMagnifier,
} from "../redux/slice/accessibilitySlice";
import { useTranslation } from "react-i18next";
import { useVoice } from "../context/voiceContext";
import { disableNextFocus } from "../redux/slice/headphoneSlice";
import { logout } from "../redux/slice/authSlice";
import { useNavigateContext } from "../context/NavigateContext";
import { useLocation } from "react-router-dom";
import { managerCall } from "../services/api";

export default function GlobalShortcuts() {
  const dispatch = useDispatch();
  const { volume } = useSelector((state) => state.accessibility);
  const navigate = useNavigateContext();
  const { t } = useTranslation();
  const { speak } = useVoice();
  const [showManagerModal, setShowManagerModal] = useState(false);
  const yesBtnRef = useRef(null);
  const location = useLocation();
  /* ===============================
     Manager message (stable refs)
  =============================== */
  const sendingRef = useRef(false);
  const messageRef = useRef("관리자 호출");


 const isDashboard = location.pathname === "/";

  /* ===============================
     Send API to Manager
  =============================== */
  const sendToManager = useCallback(async () => {
    sendingRef.current = true;
    try {
      const res = await managerCall(messageRef.current);

      console.log("Manager call response:", res);

      if (res.status !== 200) {
        speak(t("translations.Failed to send message to administrator"));
        return;
      }
      speak(t("translations.Message sent to administrator"));
    } catch (err) {
      speak(t("translations.Network error. Unable to contact administrator"));
    } finally {
      sendingRef.current = false;
    }
  }, [speak, t]);

  /* ===============================
     Confirm actions
  =============================== */
  const openManagerModal = useCallback(() => {
    setShowManagerModal(true);
    speak(t("translations.Would you like to call the administrator?"));
  }, [speak, t]);

  const closeManagerModal = useCallback(() => {
    setShowManagerModal(false);
    speak(t("translations.Administrator call cancelled"));
  }, [speak, t]);

  const confirmManagerCall = useCallback(() => {
    setShowManagerModal(false);
    speak(t("translations.Calling the administrator"));
    sendToManager();
  }, [sendToManager, speak, t]);

  /* ===============================
     Auto focus YES button
  =============================== */
  useEffect(() => {
    if (showManagerModal) {
      setTimeout(() => {
        yesBtnRef.current?.focus();
      }, 50);
    }
  }, [showManagerModal]);




  /** ===============================
   *  Handle Earphone Injection
   ================================ */
  const handleEarphoneInjection = useCallback(() => {
    // 🔥 stop any auto focus after navigation
    dispatch(disableNextFocus());

    if (!isDashboard) {
      dispatch(logout());
      navigate("/");
    }
    // stays on dashboard without focusing anything
  }, [isDashboard, dispatch, navigate]);


  /* ===============================
     Global Key Handler
  =============================== */
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat || e.isComposing) return;


         /** Insert / End → Earphone injection */
      if (e.key === "Insert" || e.code === "End") {
        e.preventDefault();
        e.stopPropagation();
        handleEarphoneInjection();
        return;
      }

      /* ? or Shift + / → Call Manager */
      const isQuestion = e.key === "?" || (e.key === "/" && e.shiftKey);
      if (isQuestion) {
        e.preventDefault();
        e.stopPropagation();
        openManagerModal();
        return;
      }

      if (showManagerModal) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeManagerModal();
        }

        if (e.key === "Enter") {
          e.preventDefault();
          confirmManagerCall();
        }
        return;
      }

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
  }, [
    dispatch,
    confirmManagerCall,
    closeManagerModal,
    openManagerModal,
    showManagerModal,
    handleEarphoneInjection,
    speak,
    stop,
    t,
    volume
  ]);





  return (
    <>
      {/* ===============================
           Manager Normal Modal
      =============================== */}
      {showManagerModal && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center">
          <div
            className="bg-white rounded-2xl p-8 w-[700px] text-center shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-[34px] font-bold mb-4">
              {t("translations.Call Administrator")}
            </h2>

            <p className="text-[28px] mb-8">
              {t("translations.Would you like to call the administrator?")}
            </p>

            <div className="flex justify-center gap-10">
              <button
                ref={yesBtnRef}
                onClick={confirmManagerCall}
                className="px-8 py-4 rounded-xl text-white text-[28px] bg-green-600 hover:bg-green-700  "
              >
                {t("translations.Yes")}
              </button>

              <button
                onClick={closeManagerModal}
                className="px-8 py-4 rounded-xl text-white text-[28px] bg-gray-500 hover:bg-gray-600 "
              >
                {t("translations.No")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
