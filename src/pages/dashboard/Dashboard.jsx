import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AlertCircle } from "lucide-react";

import BgMainImage from "../../assets/images/BgMain.jpg";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import FooterControls from "../../components/common/Footer";
import UserInfoModal from "../../components/layout/dashboard/useInfoModal";
import SeatActionModal from "../../components/common/SeatActionModal";

import { getKioskUserInfo, getSectorList, loginBySchoolNo } from "../../services/api";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import { setSectorList, setCurrentFloor, setSectorLoading, setSectorError } from "../../redux/slice/sectorSlice";
import { fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
import { FLOORS_CONFIG, MODAL_TYPES } from "../../utils/constant";


const Dashboard = () => {
  // State management
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [modalStates, setModalStates] = useState({
    [MODAL_TYPES.EXTENSION]: false,
    [MODAL_TYPES.RETURN]: false,
    [MODAL_TYPES.ASSIGN_CHECK]: false
  });
  const [selectedAssignNo, setSelectedAssignNo] = useState(null);

  // ✅ Focus state
  const [focused, setFocused] = useState(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux selectors
  const { userInfo, isAuthenticated } = useSelector((state) => state.userInfo);
  const { bookingSeatInfo } = useSelector((state) => state.bookingTime);

  // ✅ Define focus regions (Logo → MainSection → Notice → Footer)
  const FocusRegion = Object.freeze({
    LOGO: "logo",
    MAIN_SECTION: "mainSection",
    NOTICE_BANNER: "noticeBanner",
    FOOTER: "footer",
    HEADING: "heading",
  });

  // ✅ Focus cycling with '*' key
  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk =
        e.key === "*" ||
        e.code === "NumpadMultiply" ||
        e.keyCode === 106;

      if (!isAsterisk) return;

      // Don't cycle focus if any modal is open
      if (isKeyboardOpen || isUserInfoModalOpen ||
        modalStates[MODAL_TYPES.EXTENSION] ||
        modalStates[MODAL_TYPES.RETURN] ||
        modalStates[MODAL_TYPES.ASSIGN_CHECK]) {
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
  const navigateToFloor = useCallback(async (floorTitle) => {
    try {
      dispatch(setSectorLoading(true));

      const floorObj = FLOORS_CONFIG.find(f => f.title === floorTitle);
      if (!floorObj) {
        console.error("Floor not found:", floorTitle);
        return;
      }

      const sectorListData = await getSectorList({
        floor: floorObj.floor,
        floorno: floorObj.floorno,
      });

      dispatch(setSectorList(sectorListData));
      dispatch(setCurrentFloor(floorObj));

      navigate(`/floor/${floorTitle}`, {
        state: {
          sectorList: sectorListData,
          floorInfo: floorObj,
        },
      });
    } catch (error) {
      console.error("Sector API failed:", error);
      dispatch(setSectorError(error.message));
    }
  }, [dispatch, navigate]);

  /**
   * Open keyboard modal
   */
  const openKeyboard = useCallback((floor = null) => {
    setSelectedFloor(floor);
    setIsKeyboardOpen(true);
  }, []);

  /**
   * Close keyboard modal
   */
  const closeKeyboard = useCallback(() => {
    setIsKeyboardOpen(false);
  }, []);

  /**
   * Handle keyboard submission (login)
   */
  const handleKeyboardSubmit = useCallback(async (value) => {
    try {
      const response = await loginBySchoolNo(value);
      const params = new URLSearchParams(response.split("?")[1]);

      if (params.get("ERROR_YN") === "Y") return;

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
  }, [dispatch, selectedFloor, shouldShowModal, navigateToFloor]);

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
    if (userInfo?.MOVE_YN !== 'Y') return;

    try {
      let bookingData = bookingSeatInfo;

      if (!bookingData) {
        const result = await dispatch(fetchBookingTime({
          assignno: assignNo,
          seatno: userInfo.SEATNO
        })).unwrap();
        bookingData = result.bookingSeatInfo;
      }

      if (!bookingData) return;

      const { FLOOR, SECTORNO, FLOORNO } = bookingData;
      const sectorListData = await getSectorList({
        floor: FLOOR,
        floorno: FLOORNO,
      });

      dispatch(setSectorList(sectorListData));

      const matchedSector = sectorListData?.SectorList?.find(
        (item) => item.SECTORNO === SECTORNO
      );

      let floorInfo = null;
      if (matchedSector) {
        floorInfo = {
          id: matchedSector.FLOORNO,
          title: `${matchedSector.FLOOR}F`,
          floor: matchedSector.FLOOR,
          floorno: matchedSector.FLOORNO,
          total: matchedSector.SEAT_QTY ?? 0,
          occupied: matchedSector.USE_QTY ?? 0
        };
      }

      navigate(`/floor/${FLOOR}/${SECTORNO}/move`, {
        state: {
          mode: "move",
          sectorList: sectorListData || [],
          selectedSector: matchedSector,
          floorInfo: floorInfo
        }
      });
    } catch (error) {
      console.error('Error fetching booking info:', error);
    }
  }, [userInfo, bookingSeatInfo, dispatch, navigate]);

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

  /**
   * Volume control handlers (placeholders)
   */




  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img
        src={BgMainImage}
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* ✅ Pass focus states to MainSection */}
      <MainSection
        openKeyboard={openKeyboard}
        userInfo={userInfo}
        isAuthenticated={isAuthenticated}
        focusedRegion={focused}
        FocusRegion={FocusRegion}
      />

      {/* ✅ Notice Banner with focus border */}
      <div className="absolute bottom-[150px] right-0 w-[70%] px-6">
        <div
          className={`bg-yellow-500/90 backdrop-blur-sm rounded-lg p-5 shadow-lg flex gap-4 ${focused === FocusRegion.NOTICE_BANNER
              ? "outline outline-[6px] outline-[#dc2f02]"
              : ""
            }`}
        >
          <AlertCircle className="w-10 h-10 mt-2 flex-shrink-0" />
          <div>
            <h3 className="text-[32px]">Important Notice</h3>
            <div className="text-[30px] leading-9 font-medium">
              Scheduled maintenance will occur on December 15, 2025 from 2:00 AM to 4:00 AM UTC.
              Services may be temporarily unavailable.
            </div>
          </div>
        </div>
      </div>

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
          openKeyboard={() => openKeyboard(null)}
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
      />

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