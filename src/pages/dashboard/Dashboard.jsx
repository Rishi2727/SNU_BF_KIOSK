import { useEffect, useState } from "react";
import BgMainImage from "../../assets/images/BgMain.jpg";
import Header from "../../components/layout/header/Header";
import MainSection from "../../components/layout/dashboard/MainSection";
import KeyboardModal from "../../components/layout/keyBoardModal/KeyboardModal";
import { AlertCircle } from "lucide-react";
import { getKioskUserInfo, loginBySchoolNo } from "../../services/api";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState(null); // ⭐

  const navigate = useNavigate();

  // LOAD USER ON REFRESH
  useEffect(() => {
    const isAuth = localStorage.getItem("authenticated");

    if (isAuth === "true") {
      getKioskUserInfo().then((info) => {
        if (info?.successYN === "Y") {
          setUserInfo(info.bookingInfo);
        }
      });
    }
  }, []);

  // OPEN KEYBOARD
  const openKeyboard = (floor = null) => {
    setSelectedFloor(floor);  // ⭐ store clicked floor
    setIsKeyboardOpen(true);
  };

  const closeKeyboard = () => setIsKeyboardOpen(false);

  // LOGIN HANDLER
  const handleKeyboardSubmit = async (value) => {
    try {
      const response = await loginBySchoolNo(value);
      const url = response;

      const params = new URLSearchParams(url.split("?")[1]);
      const errorYN = params.get("ERROR_YN");
      const decodedError = decodeURIComponent(params.get("ERROR_TEXT") || "");

      if (errorYN === "Y") {
        console.error("LOGIN FAILED:", decodedError);
        return;
      }

      const info = await getKioskUserInfo();

      if (info?.successYN === "Y") {
        setUserInfo(info.bookingInfo);
        localStorage.setItem("authenticated", "true");

        // ⭐ Navigate ONLY if user clicked a floor card
        if (selectedFloor) {
          navigate(`/floor/${selectedFloor}`);
        }
      }

    } catch (error) {
      console.error("Login flow failed:", error);
    } finally {
      setIsKeyboardOpen(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    setUserInfo(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" />

      <Header userInfo={userInfo} openKeyboard={() => openKeyboard(null)} logout={handleLogout} />

      <MainSection openKeyboard={openKeyboard} userInfo={userInfo} />
 {/* Notice */}
      <div className="absolute bottom-4 right-0 w-[70%] px-6">
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
