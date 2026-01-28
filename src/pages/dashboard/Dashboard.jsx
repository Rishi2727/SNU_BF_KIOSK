import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BgMainImage from "../../assets/images/BgMain.jpg";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import FooterControls from "../../components/common/Footer";
import UserInfoModal from "../../components/layout/dashboard/useInfoModal";
import SeatActionModal from "../../components/common/SeatActionModal";
import { getKioskUserInfo, loginBySchoolNo } from "../../services/api";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import { fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
import { MODAL_TYPES } from "../../utils/constant";
import NoticeBanner from "../../components/layout/dashboard/Notice";
import { useVoice } from "../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { useFloorData } from "../../hooks/useFloorData";
import { fetchFloorList } from "../../redux/slice/floorSlice";
import { clearHeadphoneFocus } from "../../redux/slice/headphoneSlice";
import Modal from "../../components/common/Modal";


const Dashboard = () => {
  // State management
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const { speak, stop } = useVoice();
  const { setCurrentFloor } = useFloorData(null, null);
  const lang = useSelector((state) => state.lang.current);
  const [modalStates, setModalStates] = useState({
    [MODAL_TYPES.EXTENSION]: false,
    [MODAL_TYPES.RETURN]: false,
    [MODAL_TYPES.ASSIGN_CHECK]: false
  });
  const [selectedAssignNo, setSelectedAssignNo] = useState(null);
  // Add this state near your other modal states
  const [loginErrorButtonFocused, setLoginErrorButtonFocused] = useState(false);

  //state for modal focus 
  const [isLoginErrorFocused, setIsLoginErrorFocused] = useState(false);
  const hasSpokenLoginErrorRef = useRef(false);

  // ✅ Focus state
  const [focused, setFocused] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { t } = useTranslation()
  const { earphoneInjected } = useSelector(
    (state) => state.headphone
  );
  // 🔴 Login error modal state
  const [loginErrorModal, setLoginErrorModal] = useState({
    isOpen: false,
    title: "",
    message: ""
  });

  // Redux selectors
  const { userInfo, isAuthenticated } = useSelector((state) => state.userInfo);
  const { bookingSeatInfo } = useSelector((state) => state.bookingTime);
  const { floors, loading, error } = useSelector((state) => state.floor);
  // ✅ Define focus regions (Logo → MainSection → Notice → Footer)
  const FocusRegion = Object.freeze({
    LOGO: "logo",
    MAIN_SECTION: "mainSection",
    NOTICE_BANNER: "noticeBanner",
    FOOTER: "footer",
    HEADING: "heading",
  });

  const FocusRegionforKeyboardModal = Object.freeze({
    KEYBOARD: "keyboard",
  });


  // Speak on main Screen
  const speakMainScreen = () => {
    stop();
    speak(t("speech.This screen is the main screen."));
  };
  useEffect(() => {
    const onKeyDown = (e) => {
      const isHash =
        e.key === "#" ||
        e.code === "NumpadHash" ||
        (e.keyCode === 51 && e.shiftKey);

      if (!isHash) return;
      if (e.repeat) return;

      speakMainScreen(); // ✅ unified call
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [t, speak]); // t is enough, speak/stop are stable in your hook

  useEffect(() => {
    dispatch(fetchFloorList(1)); // libno = 1
  }, [dispatch, lang]);


  //headphones func
  useEffect(() => {
    if (!earphoneInjected) return;

    // 🔴 FORCE LOGOUT on headphone removal
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());

    // ❌ reset focus
    setFocused(null);

    // 🔊 speak main screen
    speakMainScreen();

    // 🧹 reset headphone flag
    dispatch(clearHeadphoneFocus());
  }, [earphoneInjected, dispatch]);



  // ✅ Focus cycling with '*' key
  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk =
        e.key === "*" ||
        e.code === "NumpadMultiply" ||
        e.keyCode === 106;

      if (!isAsterisk) return;

      // Don't cycle focus if any modal is open
      // ⭐ CASE 1: Keyboard is open but NOT focused → Shift + * enters keyboard focus
      if (
        isKeyboardOpen &&
        focused !== FocusRegionforKeyboardModal.KEYBOARD
      ) {
        e.preventDefault();
        e.stopPropagation();
        setFocused(FocusRegionforKeyboardModal.KEYBOARD);
        return;
      }

      // ⭐ CASE 2: Keyboard already focused → dashboard should NOT react
      if (
        focused === FocusRegionforKeyboardModal.KEYBOARD ||
        isUserInfoModalOpen ||
        modalStates[MODAL_TYPES.EXTENSION] ||
        modalStates[MODAL_TYPES.RETURN] ||
        modalStates[MODAL_TYPES.ASSIGN_CHECK]
      ) {
        return;
      }


      // Cycle through focus regions: Logo → MainSection → Notice → Footer → Logo
      setFocused((prev) => {
        if (prev === null) return FocusRegion.LOGO;
        if (prev === FocusRegion.LOGO) return FocusRegion.MAIN_SECTION;
        if (prev === FocusRegion.MAIN_SECTION) return FocusRegion.NOTICE_BANNER;
        if (prev === FocusRegion.NOTICE_BANNER) return FocusRegion.FOOTER;
        if (prev === FocusRegion.FOOTER) return FocusRegion.LOGO;

        return FocusRegion.LOGO;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isKeyboardOpen, isUserInfoModalOpen, modalStates, FocusRegion]);

  /**
   * Check if modal should be shown based on booking info
   * Show modal UNLESS only ASSIGN_YN is 'Y' and all others are 'N'
   */
  const shouldShowModal = useCallback((bookingInfo) => {
    if (!bookingInfo || bookingInfo.ASSIGN_NO === "0") return false;

    const onlyAssignAvailable =
      bookingInfo.ASSIGN_YN === 'Y' &&
      bookingInfo.EXTEND_YN === 'N' &&
      bookingInfo.MOVE_YN === 'N' &&
      bookingInfo.RETURN_YN === 'N' &&
      bookingInfo.BOOKING_CHECK_YN === 'N' &&
      bookingInfo.CANCEL_YN === 'N' &&
      bookingInfo.ASSIGN_CHECK_YN === 'N';

    return !onlyAssignAvailable;
  }, []);

  /**
   * Initialize authenticated user on mount
   */
  useEffect(() => {
    const initializeUser = async () => {
      const isAuth = localStorage.getItem("authenticated");
      if (isAuth !== "true") return;

      try {
        const info = await getKioskUserInfo();
        if (info?.successYN === "Y") {
          dispatch(setUserInfo(info.bookingInfo));
        }
      } catch (error) {
        console.error("Failed to fetch kiosk user info:", error);
      }
    };

    initializeUser();
  }, [dispatch]);

  /**
   * Navigate to floor page with sector data
   */
  const navigateToFloor = useCallback((floorTitle) => {
    const floorObj = floors.find(f => f.title === floorTitle);

    if (!floorObj) {
      console.error("Floor not found:", floorTitle);
      return;
    }

    navigate(`/floor/${floorTitle}`, {
      state: {
        floorInfo: floorObj,
      },
    });
  }, [floors, navigate]);

  /**
   * Open keyboard modal
   */

  const openKeyboard = useCallback((floor = null, shouldAutoFocus = false) => {
    setSelectedFloor(floor);
    setIsKeyboardOpen(true);

    // ✅ If opened via focused login button, auto-focus keyboard
    if (shouldAutoFocus) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        setFocused(FocusRegionforKeyboardModal.KEYBOARD);
      }, 100);
    }
  }, []);

  /**
   * Close keyboard modal
   */
  const closeKeyboard = useCallback(() => {
    setIsKeyboardOpen(false);
    setFocused(null);
  }, []);


  const openLoginErrorModal = useCallback((title, message) => {
    setLoginErrorModal({
      isOpen: true,
      title,
      message
    });
  }, []);

  const closeLoginErrorModal = useCallback(() => {
    setLoginErrorModal({
      isOpen: false,
      title: "",
      message: ""
    });
  }, []);

  /**
   * Handle keyboard submission (login)
   */
  const handleKeyboardSubmit = useCallback(async (value) => {

    const mapBackendErrorToKey = (errorText) => {
      if (!errorText) return "ERROR_GENERIC";

      if (errorText.includes("사용자 정보가 없습니다")) {
        return "ERROR_USER_NOT_FOUND";
      }

      return "ERROR_GENERIC";
    };

    try {
      const response = await loginBySchoolNo(value);
      const params = new URLSearchParams(response.split("?")[1]);

      if (params.get("ERROR_YN") === "Y") {
        const rawError = params.get("ERROR_TEXT");
        const errorKey = mapBackendErrorToKey(rawError);

        openLoginErrorModal(
          t("translations.Login Failed"),
          t(`translations.${errorKey}`)
        );

        return;
      }



      const info = await getKioskUserInfo();

      if (info?.successYN === "Y") {
        dispatch(setUserInfo(info.bookingInfo));
        localStorage.setItem("authenticated", "true");
        const showModal = shouldShowModal(info.bookingInfo);
        if (selectedFloor) {
          if (showModal) {
            setIsUserInfoModalOpen(true);
          } else {
            await navigateToFloor(selectedFloor);
          }
        } else if (showModal) {
          setIsUserInfoModalOpen(true);
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsKeyboardOpen(false);
    }
  }, [dispatch, selectedFloor, shouldShowModal, navigateToFloor, t]);

  /**
   * Toggle modal state
   */
  const toggleModal = useCallback((modalType, isOpen) => {
    setModalStates(prev => ({ ...prev, [modalType]: isOpen }));
  }, []);

  /**
   * Handle move action
   */
  const handleMoveAction = useCallback(async (assignNo) => {
    if (userInfo?.MOVE_YN !== "Y") return;

    try {
      let bookingData = bookingSeatInfo;

      if (!bookingData) {
        const result = await dispatch(
          fetchBookingTime({
            assignno: assignNo,
            seatno: userInfo.SEATNO,
          })
        ).unwrap();

        bookingData = result.bookingSeatInfo;
      }

      if (!bookingData) return;

      const { FLOOR, SECTORNO, FLOORNO } = bookingData;

      // ✅ build floor object
      const floorInfo = {
        id: FLOORNO,
        title: `${FLOOR}F`,
        floor: FLOOR,
        floorno: FLOORNO,
      };

      // ✅ trigger hook (will clear + fetch sectors)
      setCurrentFloor(floorInfo);

      // ✅ navigate (sector list will come from redux via hook)
      navigate(`/floor/${FLOOR}/${SECTORNO}/move`, {
        state: {
          mode: "move",
          floorInfo: floorInfo,
          selectedSectorNo: SECTORNO, // pass only id, not whole list
        },
      });
    } catch (error) {
      console.error("Error fetching booking info:", error);
    }
  }, [userInfo, bookingSeatInfo, dispatch, navigate, setCurrentFloor]);

  /**
   * Handle actions from UserInfoModal
   */
  const handleUserAction = useCallback(async (actionType, assignNo) => {
    console.log(`Action selected: ${actionType}`, assignNo);
    setIsUserInfoModalOpen(false);
    setSelectedAssignNo(assignNo);

    const actionHandlers = {
      extend: () => toggleModal(MODAL_TYPES.EXTENSION, true),
      move: () => handleMoveAction(assignNo),
      return: () => toggleModal(MODAL_TYPES.RETURN, true),
      check: () => navigate('/booking/check'),
      cancel: () => navigate('/booking/cancel'),
      assign: () => selectedFloor ? navigateToFloor(selectedFloor) : navigate('/floor/select'),
      assignCheck: () => toggleModal(MODAL_TYPES.ASSIGN_CHECK, true)
    };

    const handler = actionHandlers[actionType];
    if (handler) {
      await handler();
    } else {
      console.warn('Unknown action:', actionType);
    }

    setSelectedFloor(null);
  }, [selectedFloor, toggleModal, handleMoveAction, navigate, navigateToFloor]);

  /**
   * Handle UserInfoModal close
   */
  const handleUserInfoModalClose = useCallback(() => {
    setIsUserInfoModalOpen(false);
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
    navigate("/");
  }, [dispatch, navigate]);

  /**
   * Handle assign check modal close
   */
  const handleAssignCheckClose = useCallback(() => {
    toggleModal(MODAL_TYPES.ASSIGN_CHECK, false);
  }, [toggleModal]);

  /**
   * Navigate back to UserInfoModal
   */
  const handleBackToUserInfo = useCallback(() => {
    setIsUserInfoModalOpen(true);
  }, []);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(() => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
  }, [dispatch]);


  // useEffect for login error modal focus and speech
  useEffect(() => {
    if (loginErrorModal.isOpen) {
      setIsLoginErrorFocused(true);
      setLoginErrorButtonFocused(true);
      hasSpokenLoginErrorRef.current = false;

      stop();
      // Speak the title and message
      const cleanMessage = loginErrorModal.message.replace(/<[^>]*>/g, ''); // Remove HTML tags
      speak(`${loginErrorModal.title} ${cleanMessage}  ${t("speech.Press OK button")}`);
    } else {
      setIsLoginErrorFocused(false);
      setLoginErrorButtonFocused(false);
      hasSpokenLoginErrorRef.current = false;
      stop();
    }
  }, [loginErrorModal.isOpen, loginErrorModal.title, loginErrorModal.message, stop, speak]);

  useEffect(() => {
    if (!loginErrorModal.isOpen || !isLoginErrorFocused) return;

    const handleKeyDown = (e) => {
      // Handle Enter key
      if (e.key === "Enter") {
        e.preventDefault();
        if (loginErrorButtonFocused) {
          closeLoginErrorModal();
        }
      }

      // Handle Arrow keys - toggle button focus
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setLoginErrorButtonFocused(prev => {
          const newFocus = !prev;

          // Speak when button gets focus
          if (newFocus) {
            stop();
            speak(t("speech.Press OK button"));
          }

          return newFocus;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loginErrorModal.isOpen, isLoginErrorFocused, loginErrorButtonFocused, closeLoginErrorModal, stop, speak, t]);

  // 🔊 VOICE: speak when dashboard focus changes
  useEffect(() => {
    if (!focused) return;
    stop(); // stop previous speech before new focus speech
    switch (focused) {
      case FocusRegion.LOGO:
        speak(t("speech.Seoul National University Library"));
        break;
      case FocusRegion.MAIN_SECTION:
        // speak(t("speech.Floor Selection Section"));
        break;

      case FocusRegion.NOTICE_BANNER:
        speak(t("speech.Notice information"));
        break;

      case FocusRegion.FOOTER:
        // speak(t("speech.Footer controls"));
        break;

      default:
        break;
    }
  }, [focused, stop, t]);

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img
        src={BgMainImage}
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover "
      />
      {/* ✅ Pass focus states to MainSection */}
      <MainSection
        openKeyboard={openKeyboard}
        userInfo={userInfo}
        isAuthenticated={isAuthenticated}
        focusedRegion={focused}
        FocusRegion={FocusRegion}
      />

      <NoticeBanner
        isFocused={focused === FocusRegion.NOTICE_BANNER}
        FocusRegion={FocusRegion}
        lang={lang}
      />


      {/* ✅ Footer Controls with focus border */}
      <div
        className={
          focused === FocusRegion.FOOTER
            ? "border-[6px] border-[#dc2f02]"
            : "border-[6px] border-transparent"
        }
      >
        {/* Footer Controls */}
        <FooterControls
          userInfo={userInfo}
          openKeyboard={(shouldAutoFocus) => openKeyboard(null, shouldAutoFocus)}
          logout={handleLogout}
          isFocused={focused === FocusRegion.FOOTER}
        />
      </div>


      {/* Keyboard Modal */}
      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={closeKeyboard}
        onSubmit={handleKeyboardSubmit}
        autoCloseTime={30000}
        isFocused={focused === FocusRegionforKeyboardModal.KEYBOARD}
        setFocused={setFocused}
      />
      {/* 🔴 Login Error Modal - Updated with focus styling */}
      <Modal
        isOpen={loginErrorModal.isOpen}
        onClose={closeLoginErrorModal}
        title={loginErrorModal.title}
        size="medium"
        className={isLoginErrorFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-12 h-12 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <div
            className="text-gray-700 text-xl leading-relaxed font-medium"
            dangerouslySetInnerHTML={{ __html: loginErrorModal.message }}
          />
          <button
            onClick={closeLoginErrorModal}
            className={`mt-4 px-10 py-3 rounded-full bg-red-600 text-white text-lg font-semibold
         hover:bg-red-700 focus:outline-none transition-all
         ${loginErrorButtonFocused
                ? 'ring-[6px] ring-red-300 scale-105'
                : 'ring-0'
              }`}
          >
            {t("translations.OK")}
          </button>
        </div>
      </Modal>

      {/* User Info Modal */}
      <UserInfoModal
        isOpen={isUserInfoModalOpen}
        onClose={handleUserInfoModalClose}
        userInfo={userInfo}
        onAction={handleUserAction}
      />

      {/* Extension Modal */}
      <SeatActionModal
        mode="extension"
        assignNo={selectedAssignNo}
        isOpen={modalStates[MODAL_TYPES.EXTENSION]}
        onClose={() => toggleModal(MODAL_TYPES.EXTENSION, false)}
        onBackToUserInfo={handleBackToUserInfo}
      />

      {/* Return Modal */}
      <SeatActionModal
        mode="return"
        assignNo={selectedAssignNo}
        isOpen={modalStates[MODAL_TYPES.RETURN]}
        onClose={() => toggleModal(MODAL_TYPES.RETURN, false)}
        onBackToUserInfo={handleBackToUserInfo}
      />

      {/* Assign Check Modal */}
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