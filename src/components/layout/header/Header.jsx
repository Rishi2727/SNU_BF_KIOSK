import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import i18n from "../../../translation/language/i18n";
import { setLanguage as setLanguageAction } from "../../../redux/slice/langSlice";

const Header = ({ userInfo, openKeyboard, logout }) => {
  const [time, setTime] = useState("");
  const dispatch = useDispatch();
  const currentLang = useSelector((state) => state.lang.current);
  const uiLanguage = currentLang === "ko" ? "KR" : "EN";

  useEffect(() => {
    const updateTime = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="
        absolute top-1 right-6 z-20 flex items-center gap-4
        bg-[#C4B483] px-6 py-3 rounded-2xl
        border border-white/30 backdrop-blur-lg shadow
      "
    >
      {/* Language Switch */}
      <div className="flex rounded-xl overflow-hidden border-2 border-white">
        {['KR', 'EN'].map((uiLangBtn) => (
          <button
            key={uiLangBtn}
            onClick={() => {
              const backend = uiLangBtn === 'KR' ? 'ko' : 'en';
              dispatch(setLanguageAction(backend));
              i18n.changeLanguage(backend);
            }}
            className={`
              min-w-[80px] h-[56px] text-[28px] font-bold
              ${uiLanguage === uiLangBtn ? "bg-[#FFCA08] text-white" : "bg-white text-black"}
            `}
          >
            {uiLangBtn}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-white/40" />

      {/* Time */}
      <span className="text-[30px] font-semibold text-white">{time}</span>

      <div className="h-6 w-px bg-white/40" />

      {/* Login or Logout */}
      {userInfo ? (
        <>
          <div className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-[28px]">
            <User className="w-8 h-8" />
            {userInfo.SCHOOLNO}
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-5 py-2 rounded-full text-white text-[28px]"
          >
            <LogOut className="w-8 h-8" />
            로그아웃
          </button>
        </>
      ) : (
        <button
          onClick={openKeyboard}
          className="px-7 py-2.5 rounded-full bg-[#D7D8D2] hover:bg-[#FFCA08] text-white text-[30px]"
        >
          로그인
        </button>
      )}
    </div>
  );
};

export default Header;
