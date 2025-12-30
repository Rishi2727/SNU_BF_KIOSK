import { useEffect, useState } from "react";
import BgMainImage from "../../assets/images/BgMain.jpg";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import { AlertCircle } from "lucide-react";
import { getKioskUserInfo, getSectorList, loginBySchoolNo } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import FooterControls from "../../components/common/Footer";
import UserInfoModal from "../../components/layout/dashboard/useInfoModal";
import SeatActionModal from "../../components/common/SeatActionModal";

const Dashboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isUserInfoModalOpen, setIsUserInfoModalOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [isExtensionModalOpen, setIsExtensionModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAssignNo, setSelectedAssignNo] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ✅ GET DATA FROM REDUX
  const { userInfo, isAuthenticated } = useSelector(
    (state) => state.userInfo
  );

  useEffect(() => {
    const isAuth = localStorage.getItem("authenticated");

    if (isAuth === "true") {
      getKioskUserInfo().then((info) => {
        if (info?.successYN === "Y") {
          dispatch(setUserInfo(info.bookingInfo));
        }
      });
    }
  }, [dispatch]);

  /**
   * Helper function to check if modal should be shown
   * Based on original Korean kiosk logic:
   * Show modal UNLESS only ASSIGN_YN is 'Y' and all others are 'N'
   */
  const shouldShowModal = (bookingInfo) => {
    if (!bookingInfo) return false;

    // ✅ Check if ASSIGN_NO is not "0" (no active assignment)
    if (bookingInfo.ASSIGN_NO === "0") return false;

    // ✅ Original logic: Don't show modal if ONLY ASSIGN_YN is 'Y' and all others are 'N'
    // This means user only needs to do seat assignment, so go directly to floor
    const onlyAssignAvailable =
      bookingInfo.ASSIGN_YN === 'Y' &&
      bookingInfo.EXTEND_YN === 'N' &&
      bookingInfo.MOVE_YN === 'N' &&
      bookingInfo.RETURN_YN === 'N' &&
      bookingInfo.BOOKING_CHECK_YN === 'N' &&
      bookingInfo.CANCEL_YN === 'N' &&
      bookingInfo.ASSIGN_CHECK_YN === 'N';

    // Show modal if it's NOT the "only assign" case
    return !onlyAssignAvailable;
  };

  const openKeyboard = (floor = null) => {
    setSelectedFloor(floor);
    setIsKeyboardOpen(true);
  };

  const closeKeyboard = () => setIsKeyboardOpen(false);

  const handleKeyboardSubmit = async (value) => {
    try {
      const response = await loginBySchoolNo(value);
      const params = new URLSearchParams(response.split("?")[1]);

      if (params.get("ERROR_YN") === "Y") return;

      const info = await getKioskUserInfo();

      if (info?.successYN === "Y") {
        dispatch(setUserInfo(info.bookingInfo));
        localStorage.setItem("authenticated", "true");

        // ✅ Check if modal should be shown
        const showModal = shouldShowModal(info.bookingInfo);

        // 🔹 If there's a selected floor
        if (selectedFloor) {
          // Show modal first if conditions met, otherwise go directly to floor
          if (showModal) {
            setIsUserInfoModalOpen(true);
          } else {
            await navigateToFloor(selectedFloor);
          }
        } else {
          // No floor selected, show modal if conditions met
          if (showModal) {
            setIsUserInfoModalOpen(true);
          }
        }
      }
    } finally {
      setIsKeyboardOpen(false);
    }
  };

  /**
   * Navigate to floor page with sector data
   */
  const navigateToFloor = async (floorTitle) => {
    try {
      const floors = [
        { id: 1, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
        { id: 2, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
        { id: 3, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
      ];

      const floorObj = floors.find(f => f.title === floorTitle);

      if (floorObj) {
        const sectorList = await getSectorList({
          floor: floorObj.floor,
          floorno: floorObj.floorno,
        });

        navigate(`/floor/${floorTitle}`, {
          state: {
            sectorList,
            floorInfo: floorObj,
          },
        });
      }
    } catch (error) {
      console.error("Sector API failed", error);
    }
  };

  /**
   * Handle actions from UserInfoModal
   */
  const handleUserAction = async (actionType, assignNo) => {
    console.log(`Action selected: ${actionType}`, assignNo);

    setIsUserInfoModalOpen(false);

    switch (actionType) {
      case 'extend':
        setSelectedAssignNo(assignNo);
        setIsExtensionModalOpen(true);  
        break;
      case 'move':
        // Navigate to seat move page
        navigate('/seat/move', { state: { assignNo } });
        break;

      case 'return':
        // Open return modal
        setSelectedAssignNo(assignNo);
        setIsReturnModalOpen(true);
        break;

      case 'check':
        // Navigate to booking check page
        navigate('/booking/check');
        break;

      case 'cancel':
        // Navigate to booking cancel page
        navigate('/booking/cancel');
        break;

      case 'assign':
        // If there was a selected floor, go to that floor for assignment
        if (selectedFloor) {
          await navigateToFloor(selectedFloor);
        } else {
          // Otherwise show floor selection
          navigate('/floor/select');
        }
        break;

      case 'assignCheck':
        // Navigate to assignment check page
        navigate('/seat/assignCheck', { state: { assignNo } });
        break;

      default:
        console.warn('Unknown action:', actionType);
    }

    // Reset selected floor after action
    setSelectedFloor(null);
  };

  /**
   * Handle modal close
   */
  const handleUserInfoModalClose = async () => {
    setIsUserInfoModalOpen(false);

    // Logout only when no action/floor selected
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
    navigate("/"); // optional
  };


  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" />

      <MainSection
        openKeyboard={openKeyboard}
        userInfo={userInfo}
        isAuthenticated={isAuthenticated}
      />

      <div className="absolute bottom-[150px] right-0 w-[70%] px-6">
        <div className="bg-yellow-500/90 backdrop-blur-sm rounded-lg p-5 shadow-lg flex gap-4">
          <AlertCircle className="w-10 h-10 mt-2" />
          <div>
            <h3 className="text-[32px]">Important Notice</h3>
            <div className="text-[30px] leading-9 font-medium">
              Scheduled maintenance will occur on December 15, 2025 from 2:00 AM to 4:00 AM UTC.
              Services may be temporarily unavailable.
            </div>
          </div>
        </div>
      </div>

      <FooterControls
        userInfo={userInfo}
        openKeyboard={() => openKeyboard(null)}
        logout={handleLogout}
        onVolumeUp={() => console.log("Volume Up")}
        onVolumeDown={() => console.log("Volume Down")}
        onZoom={() => console.log("Zoom")}
        onContrast={() => console.log("Contrast")}
      />

      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={closeKeyboard}
        onSubmit={handleKeyboardSubmit}
        autoCloseTime={30000}
      />

      {/* ✅ User Info Modal - Shows when user logs in and has available actions */}
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
        isOpen={isExtensionModalOpen}
        onClose={() => setIsExtensionModalOpen(false)}
      />

      {/* Return Modal */}
      <SeatActionModal
        mode="return"
        assignNo={selectedAssignNo}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
      />

    </div>
  );
};

export default Dashboard;