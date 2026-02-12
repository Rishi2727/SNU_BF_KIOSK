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
import { managerCall,  MACHINE_NAME } from "../services/api";
import moment from "moment-timezone";
import "moment/dist/locale/ko";
import i18n from "i18next";

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
  const modalCursorRef = useRef(0);
  const [modalCursor, setModalCursor] = useState(0);

  const dialogRef = useRef(null);
  const noBtnRef = useRef(null);


  const isDashboard = location.pathname === "/";

  /* ===============================
     Send API to Manager
  =============================== */
  const sendToManager = useCallback(async () => {
    sendingRef.current = true;
    try {
      // 🚨 Wait until MACHINE_ID is loaded
      if (!MACHINE_NAME) {
        console.log("Machine Name not loaded yet");
        speak(t("translations.Failed to send message to administrator"));
        return;
      }
      // 🌍 Get current language
      const lang = i18n.language.split("-")[0];

      // 📅 Get Korean datetime with locale
      const koreanDateTime = moment()
        .tz("Asia/Seoul")
        .locale(lang)
        .format("LLL");

      // 📝 Construct message: "Machine ID에서 도움 요청 발생, timestamp"
      const message = `${MACHINE_NAME}에서 도움 요청 발생, ${koreanDateTime}`;

      // Update ref with the formatted message
      messageRef.current = message;

      console.log("Sending manager call message:", message);

      const res = await managerCall(messageRef.current);

      console.log("Manager call response:", res);

      if (res.status !== 200) {
        speak(t("translations.Failed to send message to administrator"));
        return;
      }
      speak(t("translations.Message sent to administrator"));
    } catch (err) {
      console.error("Manager call error:", err);
      // speak(t("translations.Network error. Unable to contact administrator"));
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
    if (!showManagerModal) return;

    modalCursorRef.current = 0;
    setModalCursor(0);

    // focus dialog container first
    setTimeout(() => {
      dialogRef.current?.focus();
    }, 50);
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
        e.preventDefault();
        e.stopPropagation();

        if (e.key === "Escape") {
          closeManagerModal();
          return;
        }

        if (e.key === "ArrowRight") {
          setModalCursor((prev) => (prev + 1) % 3);
          return;
        }

        if (e.key === "ArrowLeft") {
          setModalCursor((prev) => (prev - 1 + 3) % 3);
          return;
        }

        if (e.key === "Enter") {
          if (modalCursorRef.current === 1) {
            confirmManagerCall();
          }
          if (modalCursorRef.current === 2) {
            closeManagerModal();
          }
          return;
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
    t,
    volume
  ]);



  useEffect(() => {
    modalCursorRef.current = modalCursor;
  }, [modalCursor]);

  useEffect(() => {
    if (!showManagerModal) return;

    if (modalCursor === 0) {
      dialogRef.current?.focus();
      speak(t("translations.Would you like to call the administrator?"));
      return;
    }

    if (modalCursor === 1) {
      yesBtnRef.current?.focus();
      speak(t("translations.Yes"));
      return;
    }

    if (modalCursor === 2) {
      noBtnRef.current?.focus();
      speak(t("translations.No"));
      return;
    }
  }, [modalCursor, showManagerModal, speak, t]);



  return (
    <>
      {/* ===============================
           Manager Normal Modal
      =============================== */}
      {showManagerModal && (
        <div className="fixed inset-0 z-[3000] bg-black/60 flex items-center justify-center ">
          <div
            className={`bg-white rounded-2xl focus:outline-none
 p-8 w-[700px] text-center shadow-2xl
    ${modalCursor === 0 ? "outline-[6px] outline-[#dc2f02]" : ""}
  `}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
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
                className={`px-8 py-4 rounded-xl text-white text-[28px]   bg-green-600 hover:bg-green-700
    ${modalCursor === 1 ? "outline-[6px] outline-[#dc2f02]" : "outline-[6px] outline-transparent"}
  `}
              >
                {t("translations.Yes")}
              </button>

              <button
                ref={noBtnRef}
                onClick={closeManagerModal}
                className={`px-8 py-4 rounded-xl text-white text-[28px] bg-gray-500 hover:bg-gray-600
    ${modalCursor === 2 ? "outline-[6px] outline-[#dc2f02]" : "outline-[6px] outline-transparent"}
  `}
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