import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BgMainImage from "../../assets/images/SNU_bg.jpg";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import FooterControls from "../../components/common/Footer";
import UserInfoModal from "../../components/layout/dashboard/useInfoModal";
import SeatActionModal from "../../components/common/SeatActionModal";
import { getBookingBseqno, HUMAN_SENSOR_DETECTION, setApiLang } from "../../services/api";
import { setUserInfo } from "../../redux/slice/userInfo";
import { login, logout } from "../../redux/slice/authSlice";
import { MODAL_TYPES } from "../../utils/constant";
import NoticeBanner from "../../components/layout/dashboard/Notice";
import { useVoice } from "../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { useFloorData } from "../../hooks/useFloorData";
import { fetchFloorList } from "../../redux/slice/floorSlice";
import { clearHeadphoneFocus } from "../../redux/slice/headphoneSlice";
import Modal from "../../components/common/Modal";
import { formatFloorForSpeech } from "../../utils/speechFormatter";
import { useSerialPort } from "../../context/SerialPortContext";
import { AlertTriangle } from "lucide-react";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { resetAccessibility } from "../../redux/slice/accessibilitySlice";
import { logEvent } from "../../logger";
import { formatDateNum } from "../../utils/momentConfig";
import { fetchBookingList } from "../../redux/slice/bookingHistroySlice";

// ─── Constants ────────────────────────────────────────────────────────────────

const FocusRegion = Object.freeze({
  MAIN_SECTION: "mainSection",
  NOTICE_BANNER: "noticeBanner",
  FOOTER: "footer",
  HEADING: "heading",
});

const FocusRegionforKeyboardModal = Object.freeze({
  KEYBOARD: "keyboard",
});

const FOCUS_CYCLE = [
  FocusRegion.MAIN_SECTION,
  FocusRegion.NOTICE_BANNER,
  FocusRegion.FOOTER,
];

const EMPTY_MODAL_STATES = {
  [MODAL_TYPES.EXTENSION]: false,
  [MODAL_TYPES.RETURN]: false,
  [MODAL_TYPES.ASSIGN_CHECK]: false,
};

// ─── Component ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const { setCurrentFloor } = useFloorData(null, null);
  const { humanDetected } = useSerialPort();

  // ─── Redux selectors ────────────────────────────────────────────────────
  const lang = useSelector((s) => s.lang.current);
  const volume = useSelector((s) => s.accessibility.volume);
  const { userInfo, isAuthenticated } = useSelector((s) => s.userInfo);
  const { floors, loading } = useSelector((s) => s.floor);
  const { earphoneInjected } = useSelector((s) => s.headphone);
  const { bookingList, loading: bookingLoading } = useSelector((state) => state.booking)
  // ─── UI state ───────────────────────────────────────────────────────────
  const [focused, setFocused] = useState(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [modalStates, setModalStates] = useState(EMPTY_MODAL_STATES);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [selectedAssignNo, setSelectedAssignNo] = useState(null);
  const [seatno, setSeatno] = useState(null);
  const [showGlobalLoading, setShowGlobalLoading] = useState(true);

  // ─── Login error modal ──────────────────────────────────────────────────
  const [loginErrorModal, setLoginErrorModal] = useState({ isOpen: false, title: "", message: "" });
  const [loginErrorButtonFocused, setLoginErrorButtonFocused] = useState(false);
  const [isLoginErrorFocused, setIsLoginErrorFocused] = useState(false);

  // ─── Floor selection modal ──────────────────────────────────────────────
  const [isFloorSelectionModalOpen, setIsFloorSelectionModalOpen] = useState(false);
  const [floorSelectionFocusedIndex, setFloorSelectionFocusedIndex] = useState(0);
  const [isFloorSelectionFocused, setIsFloorSelectionFocused] = useState(false);

  // ─── Refs ───────────────────────────────────────────────────────────────
  const prevVolumeRef = useRef(volume);
  const lastHumanStateRef = useRef(false);
  const hasSpokenLoginErrorRef = useRef(false);

  // ─── Derived ────────────────────────────────────────────────────────────
  const isAnyModalOpen = useMemo(() =>
    isKeyboardOpen ||
    isUserInfoModalOpen ||
    modalStates[MODAL_TYPES.EXTENSION] ||
    modalStates[MODAL_TYPES.RETURN] ||
    modalStates[MODAL_TYPES.ASSIGN_CHECK] ||
    isFloorSelectionModalOpen ||
    loginErrorModal.isOpen,
    [isKeyboardOpen, isUserInfoModalOpen, modalStates, isFloorSelectionModalOpen, loginErrorModal.isOpen]
  );

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const speakMainScreen = useCallback(() => {
    if (isAnyModalOpen || window.__INFO_MODAL_OPEN__) return;
    stop();
    speak(t("speech.This screen is the main screen."));
  }, [speak, stop, t, isAnyModalOpen]);

  const shouldShowModal = useCallback((bookingInfo) => {
    if (!bookingInfo || bookingInfo.ASSIGN_NO === "0") return false;
    return !(
      bookingInfo.ASSIGN_YN === "Y" &&
      bookingInfo.EXTEND_YN === "N" &&
      bookingInfo.MOVE_YN === "N" &&
      bookingInfo.RETURN_YN === "N" &&
      bookingInfo.BOOKING_CHECK_YN === "N" &&
      bookingInfo.CANCEL_YN === "N" &&
      bookingInfo.ASSIGN_CHECK_YN === "N"
    );
  }, []);

  const toggleModal = useCallback((modalType, isOpen) => {
    setModalStates((prev) => ({ ...prev, [modalType]: isOpen }));
  }, []);

  // ─── Login error modal ───────────────────────────────────────────────────

  const openLoginErrorModal = useCallback((title, message) => {
    setLoginErrorModal({ isOpen: true, title, message });
  }, []);

  const closeLoginErrorModal = useCallback(() => {
    setLoginErrorModal({ isOpen: false, title: "", message: "" });
  }, []);

  // ─── Floor selection modal ───────────────────────────────────────────────

  const closeFloorSelectionModal = useCallback(() => {
    setIsFloorSelectionModalOpen(false);
    setIsFloorSelectionFocused(false);
    setFloorSelectionFocusedIndex(0);
    stop();
  }, [stop]);

  const openFloorSelectionModal = useCallback(() => {
    setIsFloorSelectionModalOpen(true);
    setIsFloorSelectionFocused(true);
    setFloorSelectionFocusedIndex(-1);
    stop();
    speak(t("speech.Please select a desired floor"));
  }, [stop, speak, t]);

  const handleLogout = useCallback(() => {
    logEvent("info", "User logged out from dashboard");
    dispatch(logout());
  }, [dispatch]);

  const handleFloorSelectionClose = useCallback(() => {
    closeFloorSelectionModal();
    handleLogout();
  }, [closeFloorSelectionModal, handleLogout]);

  const navigateToFloor = useCallback((floorTitle) => {
    const floorObj = floors.find((f) => f.title === floorTitle);
    if (!floorObj) { console.error("Floor not found:", floorTitle); return; }
    navigate(`/floor/${floorTitle}`, { state: { floorInfo: floorObj } });
  }, [floors, navigate]);

  const handleFloorSelect = useCallback((floorTitle) => {
    logEvent("info", `Floor selected: ${floorTitle}`);
    closeFloorSelectionModal();
    navigateToFloor(floorTitle);
  }, [closeFloorSelectionModal, navigateToFloor]);

  const handleFloorSelectionLogout = useCallback(() => {
    closeFloorSelectionModal();
    setShowGlobalLoading(true);
    dispatch(logout());
    setTimeout(() => setShowGlobalLoading(false), 400);
  }, [closeFloorSelectionModal, dispatch]);

  const openKeyboard = useCallback((floor = null, shouldAutoFocus = false) => {
    setSelectedFloor(floor);
    setIsKeyboardOpen(true);
    if (shouldAutoFocus) {
      setTimeout(() => setFocused(FocusRegionforKeyboardModal.KEYBOARD), 100);
    }
  }, []);

  const handleBackToUserInfo = useCallback(() => setIsUserInfoModalOpen(true), []);

  const handleUserInfoModalClose = useCallback(() => {
    setIsUserInfoModalOpen(false);
    dispatch(logout());
    navigate("/");
  }, [dispatch, navigate]);

  const handleAssignCheckClose = useCallback(() => {
    toggleModal(MODAL_TYPES.ASSIGN_CHECK, false);
  }, [toggleModal]);

  // ─── Move action ─────────────────────────────────────────────────────────

const handleMoveAction = useCallback(async (assignNo) => {
  if (userInfo?.MOVE_YN !== "Y") return;

  try {
    let bookingData = null;

    // 1️⃣ Check Redux booking list first
    if (bookingList?.length) {
      bookingData = bookingList.find(
        (item) => item.STATUS === 3 && item.MOVE_YN === "Y"
      );
    }

    // 2️⃣ If not found → call API
    if (!bookingData) {
      setApiLang(lang);

      const today = formatDateNum();

      const result = await dispatch(
        fetchBookingList({
          schoolno: userInfo.SCHOOLNO,
          sDate: today,
          eDate: today,
        })
      ).unwrap();

      bookingData = result?.find(
        (item) => item.STATUS === 3 && item.MOVE_YN === "Y"
      );
    }

    if (!bookingData) return;

    const { FLOOR_NAME, SECTORNO } = bookingData;

    // Extract floorId from "6F"
    const floorId = FLOOR_NAME?.replace(/[^\d]/g, "");

    const floorInfo = {
      id: floorId,
      title: FLOOR_NAME,
      floor: floorId,
    };

    setCurrentFloor(floorInfo);
    // 3️⃣ Navigate according to routes config
    navigate(`/floor/${floorInfo?.title}/${SECTORNO}/move`, {
      state: {
        mode: "move",
        floorInfo,
        selectedSectorNo: SECTORNO,
      },
    });

  } catch (error) {
    await logEvent(
      "error",
      `Error fetching booking info for move: ${error.message}`
    );
  }
}, [
  userInfo,
  bookingList,
  dispatch,
  navigate,
  setCurrentFloor,
  lang
]);
  // ─── User action from UserInfoModal ──────────────────────────────────────

  const handleUserAction = useCallback(async (actionType, assignNo) => {
  await logEvent("info", `User action selected: ${actionType}, assignNo=${assignNo}`);

  setIsUserInfoModalOpen(false);
  setSelectedAssignNo(assignNo);

  const actionHandlers = {
    extend: () => toggleModal(MODAL_TYPES.EXTENSION, true),
    move: () => handleMoveAction(assignNo),
    return: () => toggleModal(MODAL_TYPES.RETURN, true),
    check: () => navigate("/booking/check"),
    cancel: () => navigate("/booking/cancel"),
    assign: () =>
      selectedFloor
        ? navigateToFloor(selectedFloor)
        : navigate("/floor/select"),
    assignCheck: () => toggleModal(MODAL_TYPES.ASSIGN_CHECK, true),
  };

  if (actionHandlers[actionType]) {
    await actionHandlers[actionType]();
  } else {
    console.warn("Unknown action:", actionType);
  }

  setSelectedFloor(null);
}, [selectedFloor, toggleModal, handleMoveAction, navigate, navigateToFloor]);

  // ─── Keyboard submit (login) ─────────────────────────────────────────────

  const handleKeyboardSubmit = useCallback(async (value) => {
    const mapBackendErrorToKey = (errorText) => {
      if (!errorText) return t("translations.Not Found");
      if (errorText.includes("사용자 정보가 없습니다")) return "ERROR_USER_NOT_FOUND";
      return t("translations.Not Found");
    };

    try {
      await logEvent("info", "Keyboard login attempt started");
      setShowGlobalLoading(true);
      const result = await dispatch(login(value)).unwrap();
      if (!result || !result.SCHOOLNO) {
        throw new Error("User not found");
      }

      await logEvent("info", `Login successful, ASSIGN_NO=${result?.SCHOOLNO}`);

      const showModal = shouldShowModal(result);

      if (result.ASSIGN_NO === "0" && !selectedFloor) {
        await logEvent("info", "No booking found, opening floor selection modal");
        openFloorSelectionModal();
        return;
      }

      if (selectedFloor) {
        if (showModal) {
          await logEvent("info", "Booking found, opening user info modal");
          setIsUserInfoModalOpen(true);
        } else {
          await logEvent("info", `Navigating to floor: ${selectedFloor}`);
          await navigateToFloor(selectedFloor);
        }
      } else if (showModal) {
        setIsUserInfoModalOpen(true);
      }
    } catch (error) {
      await logEvent("warn", `Login failed: ${error?.errorMessage || error?.message}`);
      openLoginErrorModal(
        t("translations.Login Failed"),
        t(`translations.${mapBackendErrorToKey(error.errorMessage)}`)
      );
    } finally {
      setIsKeyboardOpen(false);
      setShowGlobalLoading(false);
    }
  }, [dispatch, selectedFloor, shouldShowModal, navigateToFloor, t, openLoginErrorModal, openFloorSelectionModal]);

const fetchBookingInfo = async (bseqno) => {
  if (!bseqno) return;

  try {
    const res = await getBookingBseqno({ bseqno });
    if (res?.body?.SEATNO) {
      setSeatno(res.body.SEATNO);
    }
  } catch (error) {
    console.error("Error fetching booking info:", error);
  }
};
useEffect(() => {
  if (!selectedAssignNo) return;
  fetchBookingInfo(selectedAssignNo);
}, [selectedAssignNo]);
  // ─── Effects ──────────────────────────────────────────────────────────────

  // Sync API language
  useEffect(() => { setApiLang(lang); }, [lang]);

  // Fetch floors on lang change
  useEffect(() => { dispatch(fetchFloorList(1)); }, [dispatch, lang]);

  // One-time app init (contrast + accessibility reset)
  useEffect(() => {
    if (!sessionStorage.getItem("appInitialized")) {
      dispatch(resetAccessibility());
      localStorage.removeItem("contrastMode");
      document.documentElement.setAttribute("data-contrast", "normal");
      sessionStorage.setItem("appInitialized", "true");
    }
  }, [dispatch]);



  // Global loading tied to floors fetch
  useEffect(() => {
    if (loading || !floors?.length) {
      setShowGlobalLoading(true);
      return;
    }
    const id = setTimeout(() => setShowGlobalLoading(false), 300);
    return () => clearTimeout(id);
  }, [loading, floors]);

  // Speak main screen on initial load (once floors are ready)
  useEffect(() => {
    if (location.pathname !== "/" || focused !== null || showGlobalLoading) return;
    const id = setTimeout(() => speakMainScreen(), 800);
    return () => clearTimeout(id);
  }, [location.pathname, focused, showGlobalLoading]); // eslint-disable-line

  // Speak main screen when keyboard closes
  const prevKeyboardOpenRef = useRef(false);
  useEffect(() => {
    if (prevKeyboardOpenRef.current && !isKeyboardOpen) speakMainScreen();
    prevKeyboardOpenRef.current = isKeyboardOpen;
  }, [isKeyboardOpen, speakMainScreen]);

  // Global modal close hook
  useEffect(() => {
    window.__ON_MODAL_CLOSE__ = () => setTimeout(() => speakMainScreen(), 200);
    return () => { window.__ON_MODAL_CLOSE__ = null; };
  }, [speakMainScreen]);

  // Keyboard autofocus + speech on open
  useEffect(() => {
    if (!isKeyboardOpen) return;
    const focusId = setTimeout(() => setFocused(FocusRegionforKeyboardModal.KEYBOARD), 100);
    const speechId = setTimeout(() => { stop(); speak(t("speech.Virtual Keyboard")); }, 150);
    return () => { clearTimeout(focusId); clearTimeout(speechId); };
  }, [isKeyboardOpen, stop, speak, t]);

  // '#' key → speak main screen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const isHash = e.key === "#" || e.code === "NumpadHash" || (e.keyCode === 51 && e.shiftKey);
      if (isHash) speakMainScreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [speakMainScreen]);

  // '*' key → cycle focus regions
  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk = e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106;
      if (!isAsterisk) return;

      if (isKeyboardOpen && focused !== FocusRegionforKeyboardModal.KEYBOARD) {
        e.preventDefault();
        e.stopPropagation();
        setFocused(FocusRegionforKeyboardModal.KEYBOARD);
        return;
      }

      if (
        focused === FocusRegionforKeyboardModal.KEYBOARD ||
        isUserInfoModalOpen ||
        modalStates[MODAL_TYPES.EXTENSION] ||
        modalStates[MODAL_TYPES.RETURN] ||
        modalStates[MODAL_TYPES.ASSIGN_CHECK] ||
        isFloorSelectionModalOpen
      ) return;

      setFocused((prev) => {
        const currentIdx = FOCUS_CYCLE.indexOf(prev);
        return FOCUS_CYCLE[(currentIdx + 1) % FOCUS_CYCLE.length];
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isKeyboardOpen, isUserInfoModalOpen, modalStates, isFloorSelectionModalOpen, focused]);

  // Human sensor
  useEffect(() => {
    if (!HUMAN_SENSOR_DETECTION || typeof humanDetected !== "boolean") return;
    if (humanDetected && !lastHumanStateRef.current) speakMainScreen();
    lastHumanStateRef.current = humanDetected;
    if (humanDetected) return;
    const id = setInterval(() => speakMainScreen(), 60000 * 3);
    return () => clearInterval(id);
  }, [humanDetected, speakMainScreen]);

  // Earphone injection → logout
  useEffect(() => {
    if (!earphoneInjected) return;
    dispatch(logout());
    setFocused(null);
    setIsKeyboardOpen(false);
    speakMainScreen();
    dispatch(clearHeadphoneFocus());
  }, [earphoneInjected, dispatch, speakMainScreen]);

  // QR login success
  useEffect(() => {
    const handler = () => {
      const bookingInfo = JSON.parse(localStorage.getItem("bookingInfo") || "null");
      if (!bookingInfo || bookingInfo.ASSIGN_NO === "0") openFloorSelectionModal();
    };
    window.addEventListener("QR_LOGIN_SUCCESS", handler);
    return () => window.removeEventListener("QR_LOGIN_SUCCESS", handler);
  }, [openFloorSelectionModal]);

  // QR loading events
  useEffect(() => {
    const start = () => setShowGlobalLoading(true);
    const end = () => setShowGlobalLoading(false);
    window.addEventListener("LOGIN_LOADING_START", start);
    window.addEventListener("LOGIN_LOADING_END", end);
    return () => {
      window.removeEventListener("LOGIN_LOADING_START", start);
      window.removeEventListener("LOGIN_LOADING_END", end);
    };
  }, []);

  // Speech on focused region change
  useEffect(() => {
    if (!focused || isAnyModalOpen) return;
    stop();
    const speechMap = {
      [FocusRegion.MAIN_SECTION]: t("speech.Floor Selection Section"),
      [FocusRegion.NOTICE_BANNER]: t("speech.Notice information"),
      [FocusRegion.FOOTER]: t("speech.Footer controls"),
    };
    const text = speechMap[focused];
    if (text) speak(text);
  }, [focused, stop, speak, t, isAnyModalOpen]);

  // Volume speech
  useEffect(() => {
    if (focused !== FocusRegion.FOOTER) { prevVolumeRef.current = volume; return; }
    if (prevVolumeRef.current === volume) return;
    const percent = Math.round(volume * 100);
    stop();
    speak(t(volume > prevVolumeRef.current ? "speech.Volume Up With Percent" : "speech.Volume Down With Percent", { percent }));
    prevVolumeRef.current = volume;
  }, [volume, focused, speak, stop]);

  // Login error modal: focus + speech
  useEffect(() => {
    if (loginErrorModal.isOpen) {
      setIsLoginErrorFocused(true);
      setLoginErrorButtonFocused(false);
      hasSpokenLoginErrorRef.current = false;
      stop();
      speak(`${loginErrorModal.title} ${loginErrorModal.message.replace(/<[^>]*>/g, "")}`);
    } else {
      setIsLoginErrorFocused(false);
      setLoginErrorButtonFocused(false);
      hasSpokenLoginErrorRef.current = false;
      stop();
    }
  }, [loginErrorModal.isOpen, loginErrorModal.title, loginErrorModal.message, stop, speak]);

  // Login error modal: keyboard
  useEffect(() => {
    if (!loginErrorModal.isOpen || !isLoginErrorFocused) return;
    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (loginErrorButtonFocused) closeLoginErrorModal();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setLoginErrorButtonFocused((prev) => {
          const next = !prev;
          if (next) {
            speak(t("translations.OK"));
          } else {
            speak(`${loginErrorModal.title} ${loginErrorModal.message.replace(/<[^>]*>/g, "")}`);
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [loginErrorModal.isOpen, isLoginErrorFocused, loginErrorButtonFocused, closeLoginErrorModal, speak, t, loginErrorModal.title, loginErrorModal.message]);

  // Floor selection modal: keyboard
  useEffect(() => {
    if (!isFloorSelectionModalOpen || !isFloorSelectionFocused) return;

    const onKeyDown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (floorSelectionFocusedIndex === -1) return;
        if (floorSelectionFocusedIndex < floors.length) {
          handleFloorSelect(floors[floorSelectionFocusedIndex].title);
        } else if (floorSelectionFocusedIndex === floors.length) {
          handleFloorSelectionLogout();
        } else {
          handleFloorSelectionClose();
        }
        return;
      }

      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();

      setFloorSelectionFocusedIndex((prev) => {
        const max = floors.length + 1;
        const next = e.key === "ArrowRight"
          ? (prev + 1 > max ? -1 : prev + 1)
          : (prev - 1 < -1 ? max : prev - 1);

        stop();
        if (next === -1) speak(t("speech.Please select a desired floor"));
        else if (next < floors.length) speak(t("speech.Floor", { floor: formatFloorForSpeech(floors[next].title, lang) }));
        else if (next === floors.length) speak(t("speech.Logout"));
        else speak(t("speech.Close"));

        return next;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isFloorSelectionModalOpen, isFloorSelectionFocused, floorSelectionFocusedIndex,
    floors, handleFloorSelect, handleFloorSelectionLogout, handleFloorSelectionClose,
    stop, speak, t, lang,
  ]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      {showGlobalLoading && (
        <div className="absolute inset-0 z-9999 flex items-center justify-center bg-black/40">
          <LoadingSpinner showText={false} />
        </div>
      )}

      <img src={BgMainImage} alt="Background" className="absolute inset-0 h-full w-full object-cover" />
      <div className="contrast-overlay absolute inset-0 pointer-events-none"></div>
      <MainSection
        openKeyboard={openKeyboard}
        userInfo={userInfo}
        isAuthenticated={isAuthenticated}
        focusedRegion={focused}
        FocusRegion={FocusRegion}
      />

      <NoticeBanner isFocused={focused === FocusRegion.NOTICE_BANNER} FocusRegion={FocusRegion} lang={lang} />

      <div className={focused === FocusRegion.FOOTER ? "border-[6px] border-[#dc2f02]" : "border-[6px] border-transparent"}>
        <FooterControls
          userInfo={userInfo}
          openKeyboard={(shouldAutoFocus) => openKeyboard(null, shouldAutoFocus)}
          logout={handleLogout}
          isFocused={focused === FocusRegion.FOOTER}
        />
      </div>

      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={() => { setIsKeyboardOpen(false); setFocused(null); }}
        onSubmit={handleKeyboardSubmit}
        autoCloseTime={30000}
        isFocused={focused === FocusRegionforKeyboardModal.KEYBOARD}
        setFocused={setFocused}
      />

      {/* Login Error Modal */}
      <Modal
        isOpen={loginErrorModal.isOpen}
        onClose={closeLoginErrorModal}
        title={loginErrorModal.title}
        size="large"
        className={"seat-action-modal" + (isLoginErrorFocused ? " outline-[6px] outline-[#dc2f02]" : "")}
        showCloseButton={false}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-12 h-12 text-red-600" strokeWidth={2.5} />
          </div>
          <div
            className="text-gray-700 text-[30px] leading-relaxed font-medium"
            dangerouslySetInnerHTML={{ __html: loginErrorModal.message }}
          />
          <button
            onClick={closeLoginErrorModal}
            className={`mt-4 px-10 py-3 rounded-full bg-red-600 text-white text-[30px] font-semibold
              hover:bg-red-700 focus:outline-none transition-all
              ${loginErrorButtonFocused ? "ring-[6px] ring-red-300 scale-105" : "ring-0"}`}
          >
            {t("translations.OK")}
          </button>
        </div>
      </Modal>

      {/* Floor Selection Modal */}
      <Modal
        isOpen={isFloorSelectionModalOpen}
        onClose={handleFloorSelectionClose}
        title={t("translations.Select Floor")}
        size="large"
        className={isFloorSelectionFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
        closeFocused={floorSelectionFocusedIndex === floors.length + 1}
      >
        <div className="flex flex-col gap-6 p-6">
          <h2 className={`text-[32px] font-semibold text-gray-800 text-center capitalize
            ${floorSelectionFocusedIndex === -1 ? "outline-[6px] outline-[#dc2f02]" : ""}`}>
            {t("translations.Please select a desired floor")}
          </h2>

          <div className="flex justify-center gap-4 flex-wrap">
            {floors.map((floor, index) => (
              <button
                key={floor.id}
                onClick={() => handleFloorSelect(floor.title)}
                className={`flex flex-col bg-[#FFCA08] hover:bg-[#D7D8D2] transition rounded-2xl h-[220px] w-[250px] p-6
                  ${floorSelectionFocusedIndex === index ? "outline outline-[6px] outline-[#dc2f02]" : ""}`}
              >
                <div className="text-[50px] font-bold text-[#9A7D4C] leading-tight">
                  {floor.name || floor.title}
                </div>
                <div className="mt-20 relative">
                  <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9A7D4C] transition-all duration-300"
                      style={{ width: `${floor.total > 0 ? (floor.occupied / floor.total) * 100 : 0}%` }}
                    />
                  </div>
                  <div
                    className="absolute -top-11 -translate-x-1/2 bg-[#9A7D4C] text-white px-2 rounded-md text-[30px] font-bold shadow-md"
                    style={{ left: `${floor.total > 0 ? (floor.occupied / floor.total) * 100 : 0}%` }}
                  >
                    {floor.occupied || 0}
                  </div>
                  <div className="absolute right-2 top-7 -translate-y-1/2 text-gray-600 text-[30px] font-medium">
                    {floor.total || 0}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleFloorSelectionLogout}
            className={`mt-4 w-full p-4 rounded-2xl font-semibold text-lg transition-all
              ${floorSelectionFocusedIndex === floors.length
                ? "bg-red-600 text-white ring-4 ring-red-200 scale-105"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
          >
            {t("translations.Logout")}
          </button>
        </div>
      </Modal>

      <UserInfoModal
        isOpen={isUserInfoModalOpen}
        onClose={handleUserInfoModalClose}
        userInfo={userInfo}
        onAction={handleUserAction}
      />

      <SeatActionModal
        mode="extension"
        assignNo={seatno}
        isOpen={modalStates[MODAL_TYPES.EXTENSION]}
        onClose={() => toggleModal(MODAL_TYPES.EXTENSION, false)}
        onBackToUserInfo={handleBackToUserInfo}
      />

      <SeatActionModal
        mode="return"
        assignNo={selectedAssignNo}
        isOpen={modalStates[MODAL_TYPES.RETURN]}
        onClose={() => toggleModal(MODAL_TYPES.RETURN, false)}
        onBackToUserInfo={handleBackToUserInfo}
      />

      <SeatActionModal
        mode="assignCheck"
        assignNo={selectedAssignNo}
        isOpen={modalStates[MODAL_TYPES.ASSIGN_CHECK]}
        onClose={handleAssignCheckClose}
        onBackToUserInfo={handleBackToUserInfo}
      />
    </div>
  );
};

export default Dashboard;