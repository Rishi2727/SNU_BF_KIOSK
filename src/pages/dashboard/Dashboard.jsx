import { useEffect, useState } from "react";
import BgMainImage from "../../assets/images/BgMain.jpg";
import Header from "../../components/layout/header/Header";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import { AlertCircle } from "lucide-react";
import { getKioskUserInfo, getSectorList, loginBySchoolNo } from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { clearUserInfo, setUserInfo } from "../../redux/userInfo";
import FooterControls from "../../components/common/Footer";

const Dashboard = () => {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null);

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

        // 🔹 If there's a selected floor, fetch sector list and navigate
        if (selectedFloor) {
          try {
            // Find the floor object
            const floors = [
              { id: 1, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
              { id: 2, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
              { id: 3, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
            ];

            const floorObj = floors.find(f => f.title === selectedFloor);

            if (floorObj) {
              const sectorList = await getSectorList({
                floor: floorObj.floor,
                floorno: floorObj.floorno,
              });

              navigate(`/floor/${selectedFloor}`, {
                state: {
                  sectorList,
                  floorInfo: floorObj,
                },
              });
            }
          } catch (error) {
            console.error("Sector API failed after login", error);
          }
        }
      }
    } finally {
      setIsKeyboardOpen(false);
      setSelectedFloor(null); // Reset selected floor
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
  };


  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" />
{/* 
      <Header
        userInfo={userInfo}
        logout={handleLogout}
        openKeyboard={() => openKeyboard(null)}
      /> */}
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
    </div>
  );
};

export default Dashboard;
