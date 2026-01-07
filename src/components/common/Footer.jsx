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
import {
  toggleMagnifier, increaseVolume,
  decreaseVolume,
} from "../../redux/slice/accessibilitySlice";


const applyContrastMode = (mode) => {
  document.documentElement.setAttribute("data-contrast", mode);
  localStorage.setItem("contrastMode", mode);
};


const FooterControls = ({
  userInfo,
  openKeyboard,
  logout,
  onZoom,
  onContrast,
  isFocused
}) => {
  const [time, setTime] = useState("");
  const [language, setLanguage] = useState("KR");
  const [contrastEnabled, setContrastEnabled] = useState(
    localStorage.getItem("contrastMode") === "high"
  );
  const [cursor, setCursor] = useState(0); // Index of focused button
  const FOOTER_BUTTON_COUNT = 9; // Total buttons in your footer (Login/Logout + Volume- + Volume% + Volume+ + Info + Zoom + Contrast + KR + EN)


  const dispatch = useDispatch();
  const magnifierEnabled = useSelector(
    (state) => state.accessibility.magnifierEnabled
  );
  const volume = useSelector(
    (state) => state.accessibility.volume
  );


  useEffect(() => {
    if (!isFocused) return; // Only listen when footer is focused

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setCursor((prev) => (prev + 1) % FOOTER_BUTTON_COUNT);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCursor((prev) => (prev - 1 + FOOTER_BUTTON_COUNT) % FOOTER_BUTTON_COUNT);
          break;
        case "Enter":
          e.preventDefault();
          handleFooterEnter(cursor);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, cursor]);


  const handleFooterEnter = (index) => {
    switch (index) {
      case 0: // Login / Logout
        userInfo ? logout() : openKeyboard();
        break;
      case 1: // Volume -
        dispatch(decreaseVolume());
        break;
      case 2: // Volume %
        break; // Do nothing
      case 3: // Volume +
        dispatch(increaseVolume());
        break;
      case 4: // Info
        onZoom();
        break;
      case 5: // Zoom / Magnifier
        dispatch(toggleMagnifier());
        break;
      case 6: // Contrast
        toggleContrast();
        break;
      case 7: // KR
        handleLanguageChange("KR");
        break;
      case 8: // EN
        handleLanguageChange("EN");
        break;
      default:
        break;
    }
  };


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



  const handleLanguageChange = (uiLang) => {
    setLanguage(uiLang);
    const backendLang = uiLang === "KR" ? "ko" : "en";
    localStorage.setItem("lang", backendLang);
    window.location.reload();
  };
  const toggleContrast = () => {
    const nextMode = contrastEnabled ? "normal" : "high";
    setContrastEnabled(!contrastEnabled);
    applyContrastMode(nextMode);
  };

  return (
    <div
      className={`
        absolute bottom-0 left-0 right-0 z-30
        flex items-center justify-between
        px-6 py-3 bg-black/40 backdrop-blur-md
        ${isFocused ? "border-t-[6px] border-[#dc2f02]" : "border-t-[6px] border-transparent"}
      `}
    >
      {/* 👤 LEFT : Login / Logout */}
      <div className="flex items-center gap-4">
        {userInfo ? (
          <>
            <button
              onClick={logout}
              className={`
  flex items-center gap-2 bg-red-500 hover:bg-red-600 px-5 py-2 rounded-full text-white text-[26px]
  ${cursor === 0 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
`}

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
            className={`
  px-7 py-2.5 rounded-full bg-[#D7D8D2] hover:bg-[#FFCA08] text-white text-[28px]
  ${cursor === 0 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
`}

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
          onClick={() => dispatch(decreaseVolume())}
          isSelected={cursor === 1}
        />

        <FooterButton
          label={`${Math.round(volume * 100)}%`}
          onClick={() => { }}
          isSelected={cursor === 2}
        />

        <FooterButton
          icon={<Volume2 size={28} />}
          label="Volume +"
          onClick={() => dispatch(increaseVolume())}
          isSelected={cursor === 3}
        />

        <FooterButton
          icon={<InfoIcon size={28} />}
          label="Info"
          onClick={onZoom}
          isSelected={cursor === 4}

        />
        <FooterButton
          icon={<ZoomIn size={28} />}
          label={magnifierEnabled ? "Zoom Off" : "Zoom On"}
          active={magnifierEnabled}
          onClick={() => dispatch(toggleMagnifier())}
          isSelected={cursor === 5}
        />


        <FooterButton
          icon={<Contrast size={28} />}
          label={contrastEnabled ? "Contrast" : "Contrast"}
          onClick={toggleContrast}
          active={contrastEnabled}
          isSelected={cursor === 6}
        />

      </div>

      {/* ⏰ RIGHT : Time + Language */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          <Clock className="w-8 h-8" />
          <span className="text-[32px] font-semibold">{time}</span>
        </div>

        {/* 🌐 Language Switch */}
        <div className="flex rounded-xl  border-2 border-white">
          {["KR", "EN"].map((lang, i) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`
      min-w-20 h-14 text-[28px] font-bold
      ${language === lang ? "bg-[#FFCA08] rounded-lg text-white" : "bg-white text-black"}
      ${cursor === 7 + i ? "outline-[6px] outline-[#dc2f02]" : ""}
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

const FooterButton = ({ icon, label, onClick, active, isSelected }) => (
  <button
    onClick={onClick}
    className={`
      h-16 px-4 flex items-center gap-3
      rounded-xl
      ${active ? "bg-[#e2ac37] text-white" : "bg-[#FFCA08] text-[#9A7D4C]"}
      shadow-lg hover:bg-[#FFD640]
      active:scale-95 transition-all
      ${isSelected ? "outline-[6px] outline-[#dc2f02]" : ""}
    `}
  >
    {icon}
    <span className="text-[30px] font-semibold whitespace-nowrap">
      {label}
    </span>
  </button>
);


export default FooterControls;