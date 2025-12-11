import { useEffect, useState } from 'react';
import KeyboardModal from '../keyBoardModal/KeyboardModal';
import { getKioskUserInfo, loginBySchoolNo } from '../../../services/api';
import { LogOut, User } from 'lucide-react';

const Header = () => {
  const [time, setTime] = useState('');
  const [language, setLanguage] = useState('KR');
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // ✅ Store logged user info
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginClick = () => {
    setIsKeyboardOpen(true);
  };

  const handleKeyboardClose = () => {
    setIsKeyboardOpen(false);
  };

  const handleKeyboardSubmit = async (value) => {
    console.log("Entered value:", value);

    try {
      // --------------------------------------------------
      // ✅ Step 1: LOGIN
      // --------------------------------------------------
      const response = await loginBySchoolNo(value);
      console.log("Login API Response:", response);
      // --------------------------------------------------
      // ✅ Step 2: FETCH USER INFO ONLY IF LOGIN SUCCESS
      // --------------------------------------------------
      const info = await getKioskUserInfo();
      console.log("User Info After Login:", info);

      if (info.successYN === "Y") {
        setUserInfo(info.bookingInfo); // Store user object
      }

    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setIsKeyboardOpen(false);
    }
  };

  // --------------------------------------------------
  // ✅ Logout handler
  // --------------------------------------------------
  const handleLogout = () => {
    setUserInfo(null); // Clear user info
  };

  return (
    <>
      <div
        className="
          absolute top-6 right-6 z-20 flex items-center gap-4
          bg-[#C4B483] backdrop-blur-lg
          px-6 py-3 min-w-[28%] max-w-[44%] rounded-2xl
          border border-white/30 shadow
        "
      >

        {/* Language Switch */}
        <div className="flex items-center gap-4">
          <div
            role="group"
            aria-label="Select Language"
            className="flex rounded-xl overflow-hidden border-2 border-white"
          >
            {['KR', 'EN'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`
                  min-w-[80px] h-[56px]
                  text-[30px] font-bold
                  transition-all duration-200
                  ${language === lang
                    ? 'bg-[#FFCA08] text-white'
                    : 'bg-white text-black hover:bg-blue-100'}
                `}
              >
                {lang === 'KR' ? 'Ko' : 'En'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-white/40" />

        {/* Time */}
        <div className="flex flex-col items-center text-white">
          <span className="text-[30px] font-semibold tracking-wider">
            {time}
          </span>
        </div>

        <div className="h-6 w-px bg-white/40" />

        {/* --------------------------------------------------
            LOGIN / LOGOUT BUTTON
           -------------------------------------------------- */}
        {userInfo ? (
          <>
            <div className="
                    flex items-center gap-2 px-6 py-2.5 rounded-lg
                    bg-white text-blue-600 font-semibold
                    transition-all duration-200 transform hover:scale-105
                    shadow-md hover:shadow-lg hover:bg-blue-50 text-[30px]
                  ">
                <User className="w-8 h-8 text-[30px]" />
               {userInfo.SCHOOLNO}
            </div>
          <button
            onClick={handleLogout}
            className="
                    flex items-center gap-2 px-6 py-2.5 rounded-full 
                    bg-red-500 hover:bg-red-600 text-white font-medium
                    transition-all duration-200 transform hover:scale-105
                    shadow-md hover:shadow-lg text-[30px]
                  "
          >
            <LogOut className="w-8 h-8" />
            로그아웃 
          </button>
          </>
        ) : (
          <button
            onClick={handleLoginClick}
            className="
              px-7 py-2.5 rounded-full font-bold text-white
              bg-[#D7D8D2] hover:bg-[#FFCA08]
              active:scale-95 transition-all shadow-lg text-[30px]
            "
          >
            로그인
          </button>
        )}
      </div>

      {/* Keyboard Modal */}
      <KeyboardModal
        isOpen={isKeyboardOpen}
        onClose={handleKeyboardClose}
        onSubmit={handleKeyboardSubmit}
        autoCloseTime={30000}
      />
    </>
  );
};

export default Header;
