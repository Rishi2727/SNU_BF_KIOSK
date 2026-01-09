import { useEffect, useState } from "react";
import {
  Volume2,
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
  toggleMagnifier,
  increaseVolume,
  decreaseVolume,
} from "../../redux/slice/accessibilitySlice";
import { useTranslation } from "react-i18next";
import i18n from "../../translation/language/i18n";

const applyContrastMode = (mode) => {
  document.documentElement.setAttribute("data-contrast", mode);
  localStorage.setItem("contrastMode", mode);
};

const FooterControls = ({
  userInfo,
  openKeyboard,
  logout,
  onZoom,
  isFocused,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const magnifierEnabled = useSelector(
    (state) => state.accessibility.magnifierEnabled
  );
  const volume = useSelector((state) => state.accessibility.volume);

  const [time, setTime] = useState("");
  const [language, setLanguage] = useState("KR");
  const [contrastEnabled, setContrastEnabled] = useState(
    localStorage.getItem("contrastMode") === "high"
  );
  const [cursor, setCursor] = useState(null);

  const FOOTER_BUTTON_COUNT = userInfo ? 10 : 9;

  // ✅ Load saved language
  useEffect(() => {
    const saved = localStorage.getItem("lang") || "ko";
    setLanguage(saved === "ko" ? "KR" : "EN");
  }, []);

  // ✅ Keyboard navigation
  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setCursor((prev) =>
            prev === null ? 0 : (prev + 1) % FOOTER_BUTTON_COUNT
          );
          break;

        case "ArrowLeft":
          e.preventDefault();
          setCursor((prev) =>
            prev === null
              ? FOOTER_BUTTON_COUNT - 1
              : (prev - 1 + FOOTER_BUTTON_COUNT) % FOOTER_BUTTON_COUNT
          );
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
  }, [isFocused, cursor, FOOTER_BUTTON_COUNT]);

  // ✅ Footer Enter handler
  const handleFooterEnter = (index) => {
    if (userInfo) {
      switch (index) {
        case 0:
          logout();
          return;
        case 1:
          openKeyboard();
          return;
        case 2:
          dispatch(decreaseVolume());
          return;
        case 4:
          dispatch(increaseVolume());
          return;
        case 5:
          onZoom();
          return;
        case 6:
          dispatch(toggleMagnifier());
          return;
        case 7:
          toggleContrast();
          return;
        case 8:
          handleLanguageChange("KR");
          return;
        case 9:
          handleLanguageChange("EN");
          return;
        default:
          return;
      }
    } else {
      switch (index) {
        case 0:
          openKeyboard();
          return;
        case 1:
          dispatch(decreaseVolume());
          return;
        case 3:
          dispatch(increaseVolume());
          return;
        case 4:
          onZoom();
          return;
        case 5:
          dispatch(toggleMagnifier());
          return;
        case 6:
          toggleContrast();
          return;
        case 7:
          handleLanguageChange("KR");
          return;
        case 8:
          handleLanguageChange("EN");
          return;
        default:
          return;
      }
    }
  };

  // ✅ Clock
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

  // ✅ Contrast init
  useEffect(() => {
    const saved = localStorage.getItem("contrastMode") || "normal";
    document.documentElement.setAttribute("data-contrast", saved);
    setContrastEnabled(saved === "high");
  }, []);

  // ✅ Language switch
  const handleLanguageChange = (uiLang) => {
    const backendLang = uiLang === "KR" ? "ko" : "en";
    setLanguage(uiLang);
    localStorage.setItem("lang", backendLang);
    i18n.changeLanguage(backendLang);
  };

  const toggleContrast = () => {
    const nextMode = contrastEnabled ? "normal" : "high";
    setContrastEnabled(!contrastEnabled);
    applyContrastMode(nextMode);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md">
      {/* ✅ Footer Focus Border */}
      {isFocused && (
        <div className="pointer-events-none absolute inset-0 border-[6px] border-[#dc2f02]" />
      )}

      {/* 👤 LEFT */}
      <div className="flex items-center gap-4">
        {userInfo ? (
          <>
            <button
              onClick={logout}
              className={`flex items-center gap-2 bg-red-500 px-5 py-2 rounded-full text-white text-[26px]
              ${cursor === 0 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
            >
              <LogOut className="w-7 h-7" />
              로그아웃
            </button>

            <div
              className={`flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-[26px]
              ${cursor === 1 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
            >
              <User className="w-7 h-7" />
              {userInfo.SCHOOLNO}
            </div>
          </>
        ) : (
          <button
            onClick={openKeyboard}
            className={`px-7 py-2.5 rounded-full bg-[#D7D8D2] text-white text-[28px]
            ${cursor === 0 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
          >
            로그인
          </button>
        )}
      </div>

      {/* 🎛 CENTER */}
      <div className="flex items-center gap-2">
        <FooterButton
          icon={<Volume1 size={28} />}
          label={t("Volume Down")}
          onClick={() => dispatch(decreaseVolume())}
          isSelected={cursor === (userInfo ? 2 : 1)}
          isFocused={isFocused}
        />

        <FooterButton
          label={`${Math.round(volume * 100)}%`}
          onClick={() => {}}
          isSelected={cursor === (userInfo ? 3 : 2)}
          isFocused={isFocused}
        />

        <FooterButton
          icon={<Volume2 size={28} />}
          label={t("Volume Up")}
          onClick={() => dispatch(increaseVolume())}
          isSelected={cursor === (userInfo ? 4 : 3)}
          isFocused={isFocused}
        />

        <FooterButton
          icon={<InfoIcon size={28} />}
          label={t("Info")}
          onClick={onZoom}
          isSelected={cursor === (userInfo ? 5 : 4)}
          isFocused={isFocused}
        />

        <FooterButton
          icon={<ZoomIn size={28} />}
          label={t("Zoom")}
          active={magnifierEnabled}
          onClick={() => dispatch(toggleMagnifier())}
          isSelected={cursor === (userInfo ? 6 : 5)}
          isFocused={isFocused}
        />

        <FooterButton
          icon={<Contrast size={28} />}
          label={t("Contrast")}
          onClick={toggleContrast}
          active={contrastEnabled}
          isSelected={cursor === (userInfo ? 7 : 6)}
          isFocused={isFocused}
        />
      </div>

      {/* ⏰ RIGHT */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          <Clock className="w-8 h-8" />
          <span className="text-[32px] font-semibold">{time}</span>
        </div>

        <div className="flex rounded-xl border-2 border-white">
          {["KR", "EN"].map((lang, i) => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              className={`min-w-20 h-14 text-[28px] font-bold
              ${
                language === lang
                  ? "bg-[#FFCA08] rounded-lg text-white"
                  : "bg-white text-black"
              }
              ${
                cursor === (userInfo ? 8 + i : 7 + i) && isFocused
                  ? "outline-[6px] outline-[#dc2f02]"
                  : ""
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const FooterButton = ({
  icon,
  label,
  onClick,
  active,
  isSelected,
  isFocused,
}) => (
  <button
    onClick={onClick}
    className={`h-16 px-4 flex items-center gap-3 rounded-xl
    ${active ? "bg-[#e2ac37] text-white" : "bg-[#FFCA08] text-[#9A7D4C]"}
    shadow-lg hover:bg-[#FFD640] active:scale-95 transition-all
    ${isFocused && isSelected ? "outline-[6px] outline-[#dc2f02]" : ""}`}
  >
    {icon}
    <span className="text-[30px] font-semibold whitespace-nowrap">
      {label}
    </span>
  </button>
);

export default FooterControls;
