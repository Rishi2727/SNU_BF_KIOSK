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
import { useVoice } from "../../context/voiceContext";
import { setLanguage as setLanguageAction } from "../../redux/slice/langSlice";
import i18n from "../../translation/language/i18n";
import InfoModal from "./infoModal";
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
  isAnyModalOpen
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation()

  const [isInfoOpen, setIsInfoOpen] = useState(false);

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
  const { speak, stop } = useVoice();


  const FOOTER_BUTTON_COUNT = userInfo ? 11 : 10;

  // ✅ Load saved language
  useEffect(() => {
    const saved = localStorage.getItem("lang") || "ko";
    setLanguage(saved === "ko" ? "KR" : "EN");
  }, []);

  // ✅ Keyboard navigation
  useEffect(() => {
    if (!isFocused || isAnyModalOpen) return;

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
        return;
      case 1:
        // Logout
        logout();
        return;
      case 2:
        // User ID → no action
        return;
      case 3:
        // KR
        handleLanguageChange("KR");
        return;
      case 4:
        // EN
        handleLanguageChange("EN");
        return;
      case 5:
        // Volume Down
        dispatch(decreaseVolume());
        return;
      case 6:
        // Volume % → no action
        return;
      case 7:
        // Volume Up
        dispatch(increaseVolume());
        return;
      case 8:
        // Info
        setIsInfoOpen(true);
        return;
      case 9:
        // Zoom
        dispatch(toggleMagnifier());
        return;
      case 10:
        // Contrast
        toggleContrast();
        return;
      default:
        return;
    }
  }

  // ------------------ NOT LOGGED IN ------------------
  switch (index) {
    case 0:
      return;
    case 1:
      // Login
      openKeyboard();
      return;
    case 2:
      // KR
      handleLanguageChange("KR");
      return;
    case 3:
      // EN
      handleLanguageChange("EN");
      return;
    case 4:
      // Volume Down
      dispatch(decreaseVolume());
      return;
    case 5:
      // Volume %
      return;
    case 6:
      // Volume Up
      dispatch(increaseVolume());
      return;
    case 7:
      // Info
      setIsInfoOpen(true);
      return;
    case 8:
      // Zoom
      dispatch(toggleMagnifier());
      return;
    case 9:
      // Contrast
      toggleContrast();
      return;
    default:
      return;
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

  const handleLanguageChange = async (uiLang) => {
    const backendLang = uiLang === "KR" ? "ko" : "en";

    // UI + local
    setLanguage(uiLang);
    localStorage.setItem("lang", backendLang);
    i18n.changeLanguage(backendLang);

    // // ✅ backend session locale (MOST IMPORTANT)
    // try {
    //   await setChangeLocale(backendLang);
    // } catch (e) {
    //   console.error("Locale sync failed", e);
    // }

    // redux (to refetch floors/sectors via hooks)
    dispatch(setLanguageAction(backendLang));
  };


  const toggleContrast = () => {
    setContrastEnabled((prev) => {
      const nextMode = prev ? "normal" : "high";
      applyContrastMode(nextMode);
      return !prev;
    });
  };


  // 🔊 VOICE: speak footer item on focus change (ALIGNED WITH UI)
  useEffect(() => {
    if (!isFocused) return;
    if (cursor === null) return;
 

    stop();

    let speakText = "";

    if (userInfo) {
      switch (cursor) {
        case 0:
           speakText = `${t("speech.Current Time")} ${new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
             hour12: true,
          })}`;
          break;
        case 1:
          speakText = t("speech.Logout");
          break;
        case 2:
          speakText = t("speech.UserID");
          break;
        case 3:
          speakText = t("speech.Language") + " Korean";
          break;
        case 4:
          speakText = t("speech.Language") + " English";
          break;
        case 5:
          speakText = t("speech.Volume Down");
          break;
        case 6:
          speakText = `${Math.round(volume * 100)} percent`;
          break;
        case 7:
          speakText = t("speech.Volume Up");
          break;
        case 8:
          speakText = t("speech.Info");
          break;
        case 9:
          speakText = t("speech.Zoom");
          break;
        case 10:
          speakText = t("speech.Contrast");
          break;
        default:
          break;
      }
    } else {
      switch (cursor) {
      case 0:
           speakText = `${t("speech.Current Time")} ${new Date().toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
             hour12: true,
          })}`;
          break;
        case 1:
          speakText = t("speech.Login");
          break;
        case 2:
          speakText = t("speech.Language") + " Korean";
          break;
        case 3:
          speakText = t("speech.Language") + " English";
          break;
        case 4:
          speakText = t("speech.Volume Down");
          break;
        case 5:
          speakText = `${Math.round(volume * 100)} percent`;
          break;
        case 6:
          speakText = t("speech.Volume Up");
          break;
        case 7:
          speakText = t("speech.Info");
          break;
        case 8:
          speakText = t("speech.Zoom");
          break;
        case 9:
          speakText = t("speech.Contrast");
          break;
        default:
          break;
      }
    }

    if (speakText) {
      speak(speakText);
    }
  }, [cursor, isFocused, userInfo, volume, speak, stop, t]);




  return (
    <>
      <div className="absolute bottom-px left-0 right-0 z-30 flex items-center justify-between px-7 py-2.5 bg-black/40 backdrop-blur-md">
        {/* ✅ Footer Focus Border */}
        {isFocused && (
          <div className="pointer-events-none absolute inset-0 border-[6px] border-[#dc2f02]" />
        )}



        <div className="flex items-center gap-5">
          {/* ⏰ TIME */}
          <div
            className={`flex items-center gap-3 text-white px-3 py-2 rounded-lg
  ${cursor === 0 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
          >
            <Clock className="w-8 h-8" />
            <span className="text-[32px] font-semibold">{time}</span>
          </div>

          {/* 👤 LOGIN / LOGOUT / USER INFO */}
          <div className="flex items-center gap-4">
            {userInfo ? (
              <>
                <button
                  onClick={logout}
                  className={`flex items-center gap-2 bg-red-500 px-5 py-2 rounded-full text-white text-[26px]
          ${cursor === 1 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
                >
                  <LogOut className="w-7 h-7" />
                  {t("translations.Logout")}
                </button>

                <div
                  className={`flex items-center gap-2 bg-white text-black px-5 py-2 rounded-lg text-[26px]
          ${cursor === 2 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
                >
                  <User className="w-7 h-7" />
                  {userInfo.SCHOOLNO}
                </div>
              </>
            ) : (
              <button
                onClick={openKeyboard}
                className={`px-6 py-2 rounded-full bg-[#D7D8D2] text-white text-[28px]
        ${cursor === 1 && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
              >
                {t("translations.Login")}
              </button>
            )}
          </div>

          {/* 🌐 LANGUAGE */}
          <div className="flex rounded-xl border-2 border-white">
            {["KR", "EN"].map((lang, i) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`min-w-20 h-14 text-[28px] font-bold
        ${language === lang ? "bg-[#FFCA08] rounded-lg text-white" : "bg-white text-black"}
        ${cursor === (userInfo ? 3 + i : 2 + i) && isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* 🎛 REST OF BUTTONS */}
        <div className="flex items-center gap-2">
          <FooterButton
            icon={<Volume1 size={28} />}
            label={t("translations.Volume Down")}
            onClick={() => dispatch(decreaseVolume())}
            isSelected={cursor === (userInfo ? 5 : 4)}
            isFocused={isFocused}
          />

          <FooterButton
            label={`${Math.round(volume * 100)}%`}
            onClick={() => { }}
            isSelected={cursor === (userInfo ? 6 : 5)}
            isFocused={isFocused}
          />

          <FooterButton
            icon={<Volume2 size={28} />}
            label={t("translations.Volume Up")}
            onClick={() => dispatch(increaseVolume())}
            isSelected={cursor === (userInfo ? 7 : 6)}
            isFocused={isFocused}
          />

          <FooterButton
            icon={<InfoIcon size={28} />}
            label={t("translations.Info")}
            onClick={() => setIsInfoOpen(true)}
            isSelected={cursor === (userInfo ? 8 : 7)}
            isFocused={isFocused}
          />

          <FooterButton
            icon={<ZoomIn size={28} />}
            label={t("translations.Zoom")}
            active={magnifierEnabled}
            onClick={() => dispatch(toggleMagnifier())}
            isSelected={cursor === (userInfo ? 9 : 8)}
            isFocused={isFocused}
          />

          <FooterButton
            icon={<Contrast size={28} />}
            label={t("translations.Contrast")}
            onClick={toggleContrast}
            active={contrastEnabled}
            isSelected={cursor === (userInfo ? 10 : 9)}
            isFocused={isFocused}
          />
        </div>
      </div>

      {/* ✅ Info Modal (PLACE IT HERE) */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </>
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
    className={`h-14 px-4 flex items-center gap-3 rounded-xl
    ${active ? "bg-[#e2ac37] text-white" : "bg-[#FFCA08] text-[#9A7D4C]"}
    shadow-lg hover:bg-[#FFD640] active:scale-95 transition-all
    ${isFocused && isSelected ? "outline-[6px] outline-[#dc2f02]" : ""}`}
  >
    {icon}
    <span className="text-[30px] font-semibold whitespace-nowrap">{label}</span>
  </button>
);

export default FooterControls;
