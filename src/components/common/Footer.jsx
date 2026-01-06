import { useEffect, useState } from "react";
import {
  Volume2,
  VolumeX,
  ZoomIn,
  Contrast,
  Clock,
  InfoIcon,
  User,
  LogOut,
  Volume1,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleMagnifier } from "../../redux/slice/accessibilitySlice";


const applyContrastMode = (mode) => {
  document.documentElement.setAttribute("data-contrast", mode);
  localStorage.setItem("contrastMode", mode);
};


const FooterControls = ({
  userInfo,
  openKeyboard,
  logout,
  onVolumeUp,
  onVolumeDown,
  onZoom,
  onContrast,

}) => {
  const [time, setTime] = useState("");
  const [language, setLanguage] = useState("KR");
  const [contrastEnabled, setContrastEnabled] = useState(
    localStorage.getItem("contrastMode") === "high"
  );

  const dispatch = useDispatch();
  const magnifierEnabled = useSelector(
    (state) => state.accessibility.magnifierEnabled
  );


  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  const saved = localStorage.getItem("contrastMode") || "normal";
  document.documentElement.setAttribute("data-contrast", saved);
  setContrastEnabled(saved === "high");
}, []);


  const toggleContrast = () => {
    const nextMode = contrastEnabled ? "normal" : "high";
    setContrastEnabled(!contrastEnabled);
    applyContrastMode(nextMode);
  };


  const handleLanguageChange = (uiLang) => {
    // Update UI button highlight
    setLanguage(uiLang);

    // Map UI → backend
    const backendLang = uiLang === "KR" ? "ko" : "en";

    // 🔑 Same behavior as LanguageDropdown
    localStorage.setItem("lang", backendLang);

    // 🔥 FORCE backend to respond with new language
    // because axios headers apply only on new requests
    window.location.reload();
  };

  return (
    <div
      className="
        absolute bottom-0 left-0 right-0 z-30
        flex items-center justify-between
        px-6 py-3 bg-black/40 backdrop-blur-md
      "
    >
      {/* 👤 RIGHT : Login / Logout */}
      <div className="flex items-center gap-4">
        {userInfo ? (
          <>
            <button
              onClick={logout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-5 py-2 rounded-full text-white text-[26px]"
            >
              <LogOut className="w-7 h-7" />
              로그아웃
            </button>
            <div className="flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-[26px]">
              <User className="w-7 h-7" />
              {userInfo.SCHOOLNO}
            </div>

          </>
        ) : (
          <button
            onClick={openKeyboard}
            className="px-7 py-2.5 rounded-full bg-[#D7D8D2] hover:bg-[#FFCA08] text-white text-[28px]"
          >
            로그인
          </button>
        )}
      </div>

      {/* 🎛 CENTER : Controls */}
      <div className="flex items-center gap-2">
        <FooterButton
          icon={<Volume1 size={28} />}
          label="Volume -"
          onClick={onVolumeUp}
        />
        <FooterButton label="100%" onClick={onVolumeDown} />
        <FooterButton
          icon={<Volume2 size={28} />}
          label="Volume +"
          onClick={onVolumeDown}
        />
        <FooterButton
          icon={<InfoIcon size={28} />}
          label="Info"
          onClick={onZoom}
        />
        <FooterButton
          icon={<ZoomIn size={28} />}
          label={magnifierEnabled ? "Zoom Off" : "Zoom On"}
          active={magnifierEnabled}
          onClick={() => dispatch(toggleMagnifier())}
        />


        <FooterButton
          icon={<Contrast size={28} />}
          label={contrastEnabled ? "High Contrast" : "Normal Contrast"}
          onClick={toggleContrast}
          active={contrastEnabled}
        />

      </div>

      {/* ⏰ LEFT : Time + Language */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          <Clock className="w-8 h-8" />
          <span className="text-[32px] font-semibold">{time}</span>
        </div>

        {/* 🌐 Language Switch */}
        <div className="flex rounded-xl overflow-hidden border-2 border-white">
          {["KR", "EN"].map((lang) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}

              className={`
                min-w-20 h-14 text-[28px] font-bold
                ${language === lang
                  ? "bg-[#FFCA08] text-white"
                  : "bg-white text-black"
                }
              `}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

const FooterButton = ({ icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={`
      h-16 px-4 flex items-center gap-3
      rounded-xl
      ${active ? "bg-[#e2ac37] text-white" : "bg-[#FFCA08] text-[#9A7D4C]"}
      shadow-lg hover:bg-[#FFD640]
      active:scale-95 transition-all
    `}
  >
    {icon}
    <span className="text-[30px] font-semibold whitespace-nowrap">
      {label}
    </span>
  </button>
);


export default FooterControls;
