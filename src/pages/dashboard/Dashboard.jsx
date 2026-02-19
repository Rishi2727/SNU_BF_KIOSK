import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BgMainImage from "../../assets/images/BgMain.jpg";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import FooterControls from "../../components/common/Footer";
import UserInfoModal from "../../components/layout/dashboard/useInfoModal";
import SeatActionModal from "../../components/common/SeatActionModal";
import { getKioskUserInfo, HUMAN_SENSOR_DETECTION } from "../../services/api";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import { login, logout } from "../../redux/slice/authSlice";
import { fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
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
    [MODAL_TYPES.ASSIGN_CHECK]: false,
  });
  const [selectedAssignNo, setSelectedAssignNo] = useState(null);
  // Add this state near your other modal states
  const [loginErrorButtonFocused, setLoginErrorButtonFocused] = useState(false);

  //state for modal focus
  const [isLoginErrorFocused, setIsLoginErrorFocused] = useState(false);
  const hasSpokenLoginErrorRef = useRef(false);

  // ✅ NEW: Floor Selection Modal State
  const [isFloorSelectionModalOpen, setIsFloorSelectionModalOpen] =
    useState(false);
  const [floorSelectionFocusedIndex, setFloorSelectionFocusedIndex] =
    useState(0);
  const [isFloorSelectionFocused, setIsFloorSelectionFocused] = useState(false);

  // ✅ Focus state
  const [focused, setFocused] = useState(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { humanDetected } = useSerialPort();
  const { t } = useTranslation();
  const { earphoneInjected } = useSelector((state) => state.headphone);
  // 🔴 Login error modal state
  const [loginErrorModal, setLoginErrorModal] = useState({
    isOpen: false,
    title: "",
    message: "",
  });

  const [showGlobalLoading, setShowGlobalLoading] = useState(true);

  // Redux selectors
  const { userInfo, isAuthenticated } = useSelector((state) => state.userInfo);
  const { bookingSeatInfo } = useSelector((state) => state.bookingTime);
  const { floors, loading, error } = useSelector((state) => state.floor);
  const lastHumanStateRef = useRef(false);
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
  const volume = useSelector((state) => state.accessibility.volume);
  const prevVolumeRef = useRef(volume);

  // Speak on main Screen
  const speakMainScreen = useCallback(() => {
    stop();
    speak(t("speech.This screen is the main screen."));
  }, [speak, stop, t]);

  const prevModalState = useRef({
    keyboard: false,

  });


  useEffect(() => {
    // keyboard modal closed
    if (prevModalState.current.keyboard && !isKeyboardOpen) {
      speakMainScreen();
    }

    prevModalState.current = {
      keyboard: isKeyboardOpen,

    };
  }, [isKeyboardOpen, speakMainScreen]);



  useEffect(() => {

    if (location.pathname !== "/") return;

    // speak once ONLY if nothing focused
    if (focused === null) {
      speakMainScreen();
    }

    const interval = setInterval(() => {

      // ⭐ DO NOT SPEAK IF ANY FOCUS EXISTS
      if (focused !== null) return;

      // also prevent when modals open (recommended)
      if (isKeyboardOpen) return;

      speakMainScreen();

    }, 60000);

    return () => clearInterval(interval);

  }, [
    location.pathname,
    speakMainScreen,
    focused,
    isKeyboardOpen,

  ]);

  useEffect(() => {
    window.__ON_MODAL_CLOSE__ = () => {
    setTimeout(() => {
      speakMainScreen();
    }, 200);
    };

    return () => {
      window.__ON_MODAL_CLOSE__ = null;
    };
  }, [speakMainScreen]);




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

    // 🔥 stop if feature disabled from config
    if (!HUMAN_SENSOR_DETECTION) return;

    // 🔥 speak ONLY when human appears (false -> true)
    if (humanDetected && !lastHumanStateRef.current) {
      speakMainScreen();
    }

    // update last state
    lastHumanStateRef.current = humanDetected;

  }, [humanDetected, HUMAN_SENSOR_DETECTION, t]);

  useEffect(() => {
    dispatch(fetchFloorList(1)); // libno = 1
  }, [dispatch, lang]);

  //headphones func
  useEffect(() => {
    if (!earphoneInjected) return;
    dispatch(logout());
    setFocused(null);
    speakMainScreen();
    dispatch(clearHeadphoneFocus());
  }, [earphoneInjected, dispatch]);

  // ✅ Focus cycling with '*' key
  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk =
        e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106;

      if (!isAsterisk) return;

      // Don't cycle focus if any modal is open
      // ⭐ CASE 1: Keyboard is open but NOT focused → Shift + * enters keyboard focus
      if (isKeyboardOpen && focused !== FocusRegionforKeyboardModal.KEYBOARD) {
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
        modalStates[MODAL_TYPES.ASSIGN_CHECK] ||
        isFloorSelectionModalOpen
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
  }, [
    isKeyboardOpen,
    isUserInfoModalOpen,
    modalStates,
    isFloorSelectionModalOpen,
    FocusRegion,
  ]);

  useEffect(() => {
    // 🔥 Show loading when floors are fetching OR after logout refresh
    if (loading || !floors || floors.length === 0) {
      setShowGlobalLoading(true);
    } else {
      const timer = setTimeout(() => {
        setShowGlobalLoading(false);
      }, 300); // prevents blink
      return () => clearTimeout(timer);
    }
  }, [loading, floors]);


  /**
   * Check if modal should be shown based on booking info
   * Show modal UNLESS only ASSIGN_YN is 'Y' and all others are 'N'
   */
  const shouldShowModal = useCallback((bookingInfo) => {
    if (!bookingInfo || bookingInfo.ASSIGN_NO === "0") return false;

    const onlyAssignAvailable =
      bookingInfo.ASSIGN_YN === "Y" &&
      bookingInfo.EXTEND_YN === "N" &&
      bookingInfo.MOVE_YN === "N" &&
      bookingInfo.RETURN_YN === "N" &&
      bookingInfo.BOOKING_CHECK_YN === "N" &&
      bookingInfo.CANCEL_YN === "N" &&
      bookingInfo.ASSIGN_CHECK_YN === "N";

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
  const navigateToFloor = useCallback(
    (floorTitle) => {
      const floorObj = floors.find((f) => f.title === floorTitle);

      if (!floorObj) {
        console.error("Floor not found:", floorTitle);
        return;
      }

      navigate(`/floor/${floorTitle}`, {
        state: {
          floorInfo: floorObj,
        },
      });
    },
    [floors, navigate],
  );

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
    stop();
    setIsKeyboardOpen(false);
    setFocused(null);
  }, [stop]);

  const openLoginErrorModal = useCallback((title, message) => {
    setLoginErrorModal({
      isOpen: true,
      title,
      message,
    });
  }, []);

  const closeLoginErrorModal = useCallback(() => {
    setLoginErrorModal({
      isOpen: false,
      title: "",
      message: "",
    });
  }, []);

  // ✅ NEW: Open Floor Selection Modal
  const openFloorSelectionModal = useCallback(() => {
    setIsFloorSelectionModalOpen(true);
    setIsFloorSelectionFocused(true);

    // 🔥 Start focus from HEADING
    setFloorSelectionFocusedIndex(-1);

    stop();
    speak(t("speech.Please select a desired floor"));
  }, [stop, speak, t]);

  // ✅ NEW: Close Floor Selection Modal
  const closeFloorSelectionModal = useCallback(() => {
    setIsFloorSelectionModalOpen(false);
    setIsFloorSelectionFocused(false);
    setFloorSelectionFocusedIndex(0);
    stop();
  }, [stop]);

  // ✅ NEW: Handle Floor Selection
  const handleFloorSelect = useCallback(
    (floorTitle) => {
      closeFloorSelectionModal();
      navigateToFloor(floorTitle);
    },
    [closeFloorSelectionModal, navigateToFloor],
  );

  // ✅ NEW: Handle Logout from Floor Selection Modal
  const handleFloorSelectionLogout = useCallback(() => {
    closeFloorSelectionModal();
    dispatch(logout());
  }, [closeFloorSelectionModal, dispatch]);

  /**
   * Handle keyboard submission (login)
   */
  const handleKeyboardSubmit = useCallback(
    async (value) => {
      const mapBackendErrorToKey = (errorText) => {
        if (!errorText) return t("translations.Not Found");

        if (errorText.includes("사용자 정보가 없습니다")) {
          return "ERROR_USER_NOT_FOUND";
        }

        return t("translations.Not Found");
      };

      try {
        const result = await dispatch(login(value)).unwrap();

        // Successfully logged in, result contains userInfo
        const showModal = shouldShowModal(result);

        // ✅ NEW: If no booking data available AND no floor selected (login from footer)
        // show floor selection modal
        if ((!result || result.ASSIGN_NO === "0") && !selectedFloor) {
          openFloorSelectionModal();
          return;
        }

        // If a specific floor was selected (login from floor card), navigate directly
        if (selectedFloor) {
          if (showModal) {
            setIsUserInfoModalOpen(true);
          } else {
            await navigateToFloor(selectedFloor);
          }
        } else if (showModal) {
          setIsUserInfoModalOpen(true);
        }
      } catch (error) {
        // Handle login error
        const errorKey = mapBackendErrorToKey(error.errorMessage);
        const title = t("translations.Login Failed");
        const message = t(`translations.${errorKey}`);
        openLoginErrorModal(title, message);
      } finally {
        setIsKeyboardOpen(false);
      }
    },
    [
      dispatch,
      selectedFloor,
      shouldShowModal,
      navigateToFloor,
      t,
      openLoginErrorModal,
      openFloorSelectionModal,
    ],
  );

  /**
   * Toggle modal state
   */
  const toggleModal = useCallback((modalType, isOpen) => {
    setModalStates((prev) => ({ ...prev, [modalType]: isOpen }));
  }, []);

  /**
   * Handle move action
   */
  const handleMoveAction = useCallback(
    async (assignNo) => {
      if (userInfo?.MOVE_YN !== "Y") return;

      try {
        let bookingData = bookingSeatInfo;

        if (!bookingData) {
          const result = await dispatch(
            fetchBookingTime({
              assignno: assignNo,
              seatno: userInfo.SEATNO,
            }),
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
    },
    [userInfo, bookingSeatInfo, dispatch, navigate, setCurrentFloor],
  );

  /**
   * Handle actions from UserInfoModal
   */
  const handleUserAction = useCallback(
    async (actionType, assignNo) => {
      console.log(`Action selected: ${actionType}`, assignNo);
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

      const handler = actionHandlers[actionType];
      if (handler) {
        await handler();
      } else {
        console.warn("Unknown action:", actionType);
      }

      setSelectedFloor(null);
    },
    [selectedFloor, toggleModal, handleMoveAction, navigate, navigateToFloor],
  );

  /**
   * Handle UserInfoModal close
   */
  const handleUserInfoModalClose = useCallback(() => {
    setIsUserInfoModalOpen(false);
    dispatch(logout());
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
    dispatch(logout());
  }, [dispatch]);

  // handle close button in new modal
  const handleFloorSelectionClose = useCallback(() => {
    closeFloorSelectionModal();
    handleLogout();
  }, [closeFloorSelectionModal, handleLogout]);

  //For keyboard autofocus

  useEffect(() => {
    if (!isKeyboardOpen) return;

    // 🔥 ALWAYS autofocus keyboard when it opens
    const timer = setTimeout(() => {
      setFocused(FocusRegionforKeyboardModal.KEYBOARD);
    }, 100);

    return () => clearTimeout(timer);
  }, [isKeyboardOpen]);

  // Speech trigger for keyboard - triggers EVERY time keyboard opens
  useEffect(() => {
    if (!isKeyboardOpen) return;
    const timer = setTimeout(() => {
      stop();
      speak(t("speech.Virtual Keyboard"));
    }, 150);
    return () => clearTimeout(timer);
  }, [isKeyboardOpen, stop, speak, t]);

  // useEffect for login error modal focus and speech
  useEffect(() => {
    if (loginErrorModal.isOpen) {
      setIsLoginErrorFocused(true);
      setLoginErrorButtonFocused(false);
      hasSpokenLoginErrorRef.current = false;

      stop();
      // Speak the title and message
      const cleanMessage = loginErrorModal.message.replace(/<[^>]*>/g, ""); // Remove HTML tags
      speak(
        `${loginErrorModal.title} ${cleanMessage} `,
      );
    } else {
      setIsLoginErrorFocused(false);
      setLoginErrorButtonFocused(false);
      hasSpokenLoginErrorRef.current = false;
      stop();
    }
  }, [
    loginErrorModal.isOpen,
    loginErrorModal.title,
    loginErrorModal.message,
    stop,
    speak,
  ]);

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
        setLoginErrorButtonFocused((prev) => {
          const newFocus = !prev;

          // Speak when button gets focus
          if (newFocus) {

            speak(t("translations.OK"))
          } else {
            // 👉 Modal focused again
            const cleanMessage = loginErrorModal.message.replace(/<[^>]*>/g, "");
            speak(`${loginErrorModal.title} ${cleanMessage}`);
          }

          return newFocus;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    loginErrorModal.isOpen,
    isLoginErrorFocused,
    loginErrorButtonFocused,
    closeLoginErrorModal,
    stop,
    speak,
    t,
  ]);

  // ✅ NEW: Floor Selection Modal keyboard navigation
  useEffect(() => {
    if (!isFloorSelectionModalOpen || !isFloorSelectionFocused) return;

    const totalOptions = floors.length + 2;
    const handleKeyDown = (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

      e.preventDefault();

      setFloorSelectionFocusedIndex((prev) => {
        let next;

        if (e.key === "ArrowRight") {
          next = prev + 1;
          if (next > floors.length + 1) next = -1; // 🔁 loop
        } else {
          next = prev - 1;
          if (next < -1) next = floors.length + 1;
        }

        // 🔊 Speak based on focus
        stop();

        if (next === -1) {
          speak(t("speech.Please select a desired floor"));
        } else if (next < floors.length) {
          speak(
            t("speech.Floor", {
              floor: formatFloorForSpeech(floors[next].title, lang),
            })
          );

        } else if (next === floors.length) {
          speak(t("speech.Logout"));
        } else {
          speak(t("speech.Close"));
        }

        return next;
      });
    };

    const handleEnter = (e) => {
      if (e.key !== "Enter") return;

      e.preventDefault();

      if (floorSelectionFocusedIndex === -1) return;

      if (floorSelectionFocusedIndex < floors.length) {
        handleFloorSelect(floors[floorSelectionFocusedIndex].title);
      } else if (floorSelectionFocusedIndex === floors.length) {
        handleFloorSelectionLogout();
      } else {
        handleFloorSelectionClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keydown", handleEnter);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keydown", handleEnter);
    };
  }, [
    isFloorSelectionModalOpen,
    isFloorSelectionFocused,
    floorSelectionFocusedIndex,
    floors,
    handleFloorSelect,
    handleFloorSelectionLogout,
    handleFloorSelectionClose,
    stop,
    speak,
    t,
  ]);

  // 🔥 AUTO RELOAD DATA WHEN INTERNET RESTORES
useEffect(() => {
  const handleNetworkRestored = () => {
    // reload floors
    dispatch(fetchFloorList(1));

    // optional: reload user info if logged in
    const isAuth = localStorage.getItem("authenticated");
    if (isAuth === "true") {
      getKioskUserInfo()
        .then((info) => {
          if (info?.successYN === "Y") {
            dispatch(setUserInfo(info.bookingInfo));
          }
        })
        .catch(() => {});
    }
  };

  window.addEventListener("NETWORK_RESTORED", handleNetworkRestored);

  return () =>
    window.removeEventListener("NETWORK_RESTORED", handleNetworkRestored);
}, [dispatch]);




  // 🔊 VOICE: speak when dashboard focus changes
  useEffect(() => {
    if (!focused) return;
    if (focused !== FocusRegion.FOOTER) {
    }
    stop();

    switch (focused) {
      case FocusRegion.LOGO:
        speak(t("speech.Seoul National University Library"));
        break;
      case FocusRegion.MAIN_SECTION:
        speak(t("speech.Floor Selection Section"));
        break;

      case FocusRegion.NOTICE_BANNER:
        speak(t("speech.Notice information"));
        break;

      case FocusRegion.FOOTER:
        speak(t("speech.Footer controls"));
        break;

      default:
        break;
    }
  }, [focused, stop, t]);

  // 🔊 Speak when volume changes (Dashboard)
  useEffect(() => {
    if (focused !== FocusRegion.FOOTER) {
      prevVolumeRef.current = volume;
      return;
    }

    const prevVolume = prevVolumeRef.current;

    // ignore first render
    if (prevVolume === volume) return;

    const percent = Math.round(volume * 100);

    stop();

    if (volume > prevVolume) {
      speak(
        t("speech.Volume Up With Percent", { percent })
      );
    } else {
      speak(
        t("speech.Volume Down With Percent", { percent })
      );
    }

    prevVolumeRef.current = volume;
  }, [volume, focused, speak, stop]);

useEffect(() => {
  // ⭐ run ONLY once when app is opened (not on logout/navigation)
  const alreadyInitialized = sessionStorage.getItem("appInitialized");

  if (!alreadyInitialized) {
    dispatch(resetAccessibility());

    localStorage.removeItem("contrastMode");
    document.documentElement.setAttribute("data-contrast", "normal");

    sessionStorage.setItem("appInitialized", "true");
  }
}, [dispatch]);


  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      {/* 🔥 GLOBAL LOADING OVERLAY */}
      {showGlobalLoading && (
        <div className="absolute inset-0 z-9999 flex items-center justify-center bg-black/40">
          <LoadingSpinner showText={false} />
        </div>
      )}

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
          openKeyboard={(shouldAutoFocus) =>
            openKeyboard(null, shouldAutoFocus)
          }
          logout={handleLogout}
          isFocused={focused === FocusRegion.FOOTER}
        />
      </div>

      {/* Keyboard Modal */}
      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={() => {
          setIsKeyboardOpen(false);
          setFocused(null)
        }}
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
        size="large"
        className={isLoginErrorFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
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
         ${loginErrorButtonFocused
                ? "ring-[6px] ring-red-300 scale-105"
                : "ring-0"
              }`}
          >
            {t("translations.OK")}
          </button>
        </div>
      </Modal>

      {/* ✅ NEW: Floor Selection Modal */}
      <Modal
        isOpen={isFloorSelectionModalOpen}
        onClose={handleFloorSelectionClose}
        title={t("translations.Select Floor")}
        size="large"
        className={
          isFloorSelectionFocused ? "outline-[6px] outline-[#dc2f02]" : ""
        }
        closeFocused={floorSelectionFocusedIndex === floors.length + 1}
      >
        <div className="flex flex-col gap-6 p-6">
          <h2
            className={`text-[32px] font-semibold text-gray-800 text-center capitalize
    ${floorSelectionFocusedIndex === -1 ? " outline-[6px] outline-[#dc2f02]" : ""}
  `}
          >
            {t("translations.Please select a desired floor")}
          </h2>

          {/* Floor Cards Grid */}
          <div className="flex justify-center gap-4 flex-wrap">
            {floors.map((floor, index) => (
              <button
                key={floor.id}
                onClick={() => handleFloorSelect(floor.title)}
                className={`
                  flex flex-col
                  bg-[#FFCA08] hover:bg-[#D7D8D2]
                  transition rounded-2xl
                  h-[220px] w-[250px] p-6
                  ${floorSelectionFocusedIndex === index
                    ? "outline outline-[6px] outline-[#dc2f02]"
                    : ""
                  }
                `}
              >
                {/* Floor Name */}
                <div className="text-[50px] font-bold text-[#9A7D4C] leading-tight">
                  {floor.name || floor.title}
                </div>

                {/* Progress Bar */}
                <div className="mt-20 relative">
                  <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#9A7D4C] transition-all duration-300"
                      style={{
                        width: `${floor.total > 0 ? (floor.occupied / floor.total) * 100 : 0}%`,
                      }}
                    />
                  </div>

                  {/* Used count */}
                  <div
                    className="absolute -top-11 -translate-x-1/2 bg-[#9A7D4C] text-white
                               px-2 rounded-md text-[30px] font-bold shadow-md"
                    style={{
                      left: `${floor.total > 0 ? (floor.occupied / floor.total) * 100 : 0}%`,
                    }}
                  >
                    {floor.occupied || 0}
                  </div>

                  {/* Total count */}
                  <div className="absolute right-2 top-7 -translate-y-1/2 text-gray-600 text-[30px] font-medium">
                    {floor.total || 0}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Logout Button */}
          <button
            onClick={handleFloorSelectionLogout}
            className={`mt-4 w-full p-4 rounded-2xl font-semibold text-lg transition-all
              ${floorSelectionFocusedIndex === floors.length
                ? "bg-red-600 text-white ring-4 ring-red-300 scale-105"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
          >
            {t("translations.Logout")}
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
