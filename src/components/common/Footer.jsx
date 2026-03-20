import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Volume2, ZoomIn, Contrast, Clock, InfoIcon,
  User, LogOut, Volume1, ArrowLeft,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleMagnifier, increaseVolume, decreaseVolume,
} from "../../redux/slice/accessibilitySlice";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";
import { setLanguage as setLanguageAction } from "../../redux/slice/langSlice";
import i18n from "../../translation/language/i18n";
import InfoModal from "./infoModal";
import { fetchUserInfo } from "../../redux/slice/getUserDataSlice";
import { setApiLang } from "../../services/api";
import { BiLogIn } from "react-icons/bi";
import { logEvent } from "../../logger";

const applyContrastMode = (mode) => {
  document.documentElement.setAttribute("data-contrast", mode);
  localStorage.setItem("contrastMode", mode);
};

// ─── Sub-component ────────────────────────────────────────────────────────────

const FooterButton = ({ icon, label, onClick, active, isSelected, isFocused }) => (
  <button
    onClick={onClick}
    className={`h-13 px-4 flex items-center gap-3 rounded-xl shadow-lg
hover:bg-[#FFD640] active:scale-95 transition-all
${active ? "bg-[#e2ac37] text-white" : "bg-[#FFCA08] text-[#9A7D4C]"}
${isSelected ? "footer-selected" : ""}
${isFocused && isSelected ? "outline-[5px] outline-[#dc2f02]" : ""}`}
  >
    {icon}
    <span className="text-[30px] font-semibold whitespace-nowrap">{label}</span>
  </button>
);

// ─── Main component ───────────────────────────────────────────────────────────

const FooterControls = ({
  userInfo, openKeyboard, logout, onZoom,
  isFocused, isAnyModalOpen, showBack, onBack, timer,
}) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { speak, stop } = useVoice();

  const magnifierEnabled = useSelector((s) => s.accessibility.magnifierEnabled);
  const volume = useSelector((s) => s.accessibility.volume);
  const { userInfo: userData, loading } = useSelector((state) => state.user);

  const [time, setTime] = useState("");
  const [language, setLanguage] = useState("KR");
  const [contrastEnabled, setContrastEnabled] = useState(
    localStorage.getItem("contrastMode") === "high"
  );
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [cursor, setCursor] = useState(null);

  const prevVolumeRef = useRef(volume);
  const BACK_OFFSET = showBack ? 1 : 0;
  const lang = useSelector((state) => state.lang.current);

  useEffect(() => {
    setApiLang(lang);
  }, [lang]);

  // Total focusable buttons: back(opt) + (login|logout+user) + KR + EN + vol- + vol% + vol+ + info + zoom + contrast
  const FOOTER_BUTTON_COUNT = useMemo(
    () => (showBack ? 1 : 0) + (userInfo ? 11 : 10),
    [showBack, userInfo]
  );

  useEffect(() => {
    const updateLang = async () => {
      await setApiLang(lang);
      if (userInfo?.SCHOOLNO) {
        dispatch(fetchUserInfo({ schoolno: userInfo.SCHOOLNO }));
      }
    };
    updateLang();
  }, [lang, userInfo?.SCHOOLNO]);

  // ─── Index helpers ────────────────────────────────────────────────────────

  const idx = useCallback(
    (loggedInIdx, guestIdx) =>
      userInfo ? loggedInIdx + BACK_OFFSET : guestIdx,
    [userInfo, BACK_OFFSET]
  );

  // ─── Clock ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // ─── Init saved settings ──────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem("lang") || "ko";
    setLanguage(saved === "ko" ? "KR" : "EN");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("contrastMode") || "normal";
    document.documentElement.setAttribute("data-contrast", saved);
    setContrastEnabled(saved === "high");
  }, []);

  // ─── Reset cursor on login state change or focus loss ────────────────────

  useEffect(() => { setCursor(null); }, [userInfo]);
  useEffect(() => { if (!isFocused) setCursor(null); }, [isFocused]);

  // ─── Info modal global flag ───────────────────────────────────────────────

  useEffect(() => {
    window.__INFO_MODAL_OPEN__ = isInfoOpen;
    if (isInfoOpen) stop();
    return () => { window.__INFO_MODAL_OPEN__ = false; };
  }, [isInfoOpen, stop]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLanguageChange = useCallback((uiLang) => {
    const backendLang = uiLang === "KR" ? "ko" : "en";
    logEvent("info", `Language changed: ${language} → ${uiLang} (backendLang=${backendLang})`);
    setLanguage(uiLang);
    localStorage.setItem("lang", backendLang);
    i18n.changeLanguage(backendLang);
    dispatch(setLanguageAction(backendLang));
  }, [dispatch, language]);

  const toggleContrast = useCallback(() => {
    setContrastEnabled((prev) => {
      const next = prev ? "normal" : "high";
      logEvent("info", `Contrast mode toggled: ${prev ? "high → normal" : "normal → high"}`);
      applyContrastMode(next);
      return !prev;
    });
  }, []);

  // Unified action map — index → action
  const footerActions = useMemo(() => ({
    0: null, // clock — no action
    [idx(1, 1)]: userInfo ? logout : () => openKeyboard(true),
    ...(userInfo ? { [idx(2, -1)]: null } : {}), // user ID display — no action
    [idx(3, 2)]: () => handleLanguageChange("KR"),
    [idx(4, 3)]: () => handleLanguageChange("EN"),
    [idx(5, 4)]: () => dispatch(decreaseVolume()),
    [idx(6, 5)]: null, // volume % display — no action
    [idx(7, 6)]: () => dispatch(increaseVolume()),
    [idx(8, 7)]: () => setIsInfoOpen(true),
    [idx(9, 8)]: () => dispatch(toggleMagnifier()),
    [idx(10, 9)]: toggleContrast,
    ...(showBack ? { 1: onBack } : {}),
  }), [idx, userInfo, logout, openKeyboard, handleLanguageChange, dispatch, toggleContrast, showBack, onBack]);

  const handleFooterEnter = useCallback((index) => {
    if (index === null) return;

    // Map index → label for logging
    const labelMap = {
      0: "clock",
      [idx(1, 1)]: userInfo ? "logout" : "login",
      ...(userInfo ? { [idx(2, -1)]: "user-id-display" } : {}),
      [idx(3, 2)]: "language-KR",
      [idx(4, 3)]: "language-EN",
      [idx(5, 4)]: "volume-down",
      [idx(6, 5)]: "volume-display",
      [idx(7, 6)]: "volume-up",
      [idx(8, 7)]: "info",
      [idx(9, 8)]: "magnifier",
      [idx(10, 9)]: "contrast",
      ...(showBack ? { 1: "back" } : {}),
    };

    const label = labelMap[index] ?? `index-${index}`;
    logEvent("info", `Footer keyboard Enter on: ${label}`);
    footerActions[index]?.();
  }, [footerActions, idx, userInfo, showBack]);

  // ─── Keyboard navigation ──────────────────────────────────────────────────

  useEffect(() => {
    if (!isFocused || isAnyModalOpen) return;
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setCursor((prev) => {
            const next = prev === null ? 0 : (prev + 1) % FOOTER_BUTTON_COUNT;
            logEvent("info", `Footer ArrowRight — cursor: ${prev} → ${next}`);
            return next;
          });
          break;
        case "ArrowLeft":
          e.preventDefault();
          setCursor((prev) => {
            const next = prev === null ? FOOTER_BUTTON_COUNT - 1 : (prev - 1 + FOOTER_BUTTON_COUNT) % FOOTER_BUTTON_COUNT;
            logEvent("info", `Footer ArrowLeft — cursor: ${prev} → ${next}`);
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          handleFooterEnter(cursor);
          break;
        default: break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, isAnyModalOpen, cursor, FOOTER_BUTTON_COUNT, handleFooterEnter]);

  // ─── Speech map ───────────────────────────────────────────────────────────

  const speechMap = useMemo(() => {
    const currentTime = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    console.log("usedata", userData);
    return {
      0: `${t("speech.Current Time")} ${currentTime}`,
      [idx(1, 1)]: userInfo ? t("speech.Logout") : t("speech.Login"),
      ...(userData?.NAME
        ? { [idx(2, -1)]: t("speech.UserIDMessage", { id: userData.NAME }) }
        : { [idx(2, -1)]: t("speech.UserID") }
      ),
      [idx(3, 2)]: t("speech.Language") + t("speech.Korean"),
      [idx(4, 3)]: t("speech.Language") + t("speech.English"),
      [idx(5, 4)]: t("speech.Volume Down"),
      [idx(6, 5)]: t("speech.Current Volume With Percent", { percent: Math.round(volume * 100) }),
      [idx(7, 6)]: t("speech.Volume Up"),
      [idx(8, 7)]: t("speech.Info"),
      [idx(9, 8)]: t("translations.Magnifier"),
      [idx(10, 9)]: t("speech.Contrast"),
      ...(showBack ? { 1: t("speech.Back") } : {}),
    };
  }, [idx, userInfo, volume, t, showBack]);

  // Speak on cursor change
  useEffect(() => {
    if (!isFocused || cursor === null || isAnyModalOpen) return;
    stop();
    const text = speechMap[cursor];
    if (text) speak(text);
  }, [cursor, isFocused, isAnyModalOpen, speechMap, speak, stop]);

  // Speak on magnifier toggle
  useEffect(() => {
    if (isAnyModalOpen) return;
    logEvent("info", `Magnifier toggled: ${magnifierEnabled ? "enabled" : "disabled"}`);
    stop();
    speak(magnifierEnabled ? t("speech.Magnifier enabled") : t("speech.Magnifier disabled"));
  }, [magnifierEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speak on contrast toggle
  useEffect(() => {
    if (!isFocused || isAnyModalOpen) return;
    stop();
    speak(contrastEnabled ? t("speech.Contrast enabled") : t("speech.Contrast disabled"));
  }, [contrastEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Speak on volume change
  useEffect(() => {
    if (!isFocused || isAnyModalOpen) {
      prevVolumeRef.current = volume;
      return;
    }
    if (prevVolumeRef.current === volume) return;
    const percent = Math.round(volume * 100);
    const direction = volume > prevVolumeRef.current ? "up" : "down";
    logEvent("info", `Volume changed ${direction}: ${Math.round(prevVolumeRef.current * 100)}% → ${percent}%`);
    speak(t(
      volume > prevVolumeRef.current ? "speech.Volume Up With Percent" : "speech.Volume Down With Percent",
      { percent }
    ));
    prevVolumeRef.current = volume;
  }, [volume]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Shared focus class helper ────────────────────────────────────────────

  const fc = (i) => cursor === i && isFocused ? "outline-[5px] outline-[#dc2f02] z-100" : "";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div className="footer absolute bottom-px left-0 right-0 z-30 flex items-center justify-between px-7 py-[11px] bg-black/40 backdrop-blur-md">
        {isFocused && (
          <div className="pointer-events-none absolute inset-0 border-[6px] border-[#dc2f02]" />
        )}

        <div className="flex items-center gap-3">

          {/* ⏰ Clock */}
          <div className={`flex items-center gap-2 text-white rounded-lg ${fc(0)}`}>
            <Clock className="w-8 h-8" />
            <span className="text-[30px] font-semibold">{time}</span>
          </div>

          {/* ⬅ Back */}
          {showBack && (
            <button
              onClick={() => {
                logEvent("info", "Footer Back button clicked");
                onBack();
              }}
              className={`floor-legend-bar flex items-center gap-2 bg-[#FFCA08] text-[#9A7D4C]
                px-3 py-1 rounded-lg text-[26px] font-bold ${fc(1)}`}
            >
              <ArrowLeft className="w-6 h-6" />
              {t("translations.Back")}
            </button>
          )}

          {/* 👤 Login / Logout + User */}
          <div className="flex items-center gap-4">
            {userInfo ? (
              <>
                <button
                  onClick={() => {
                    logEvent("info", `Logout button clicked — schoolno=${userInfo?.SCHOOLNO}`);
                    logout();
                  }}
                  className={`flex items-center gap-2 bg-red-500 px-5 py-1.5 rounded-full text-white text-[26px]
                    ${fc(1 + BACK_OFFSET)}`}
                >
                  <LogOut className="w-7 h-7" />
                  {t("translations.Logout")}
                  {timer > 0 && (
                    <span className="ml-2 font-mono rounded-md px-2 bg-[#ffffffa1]">{timer}</span>
                  )}
                </button>
                <div className={`flex items-center gap-2 bg-white text-black px-5 py-1.5 rounded-lg text-[26px]
                    ${fc(2 + BACK_OFFSET)}`}>
                  <User className="w-7 h-7" />
                  {userData?.NAME}
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  logEvent("info", "Login button clicked — opening keyboard");
                  openKeyboard(false);
                }}
                className={`login-btn px-4 py-1.5 rounded-full bg-[#D7D8D2] text-[#000] text-[28px] flex items-center gap-2 ${fc(1)}`}
              >
                <BiLogIn size={30} />
                {t("translations.Login")}
              </button>
            )}
          </div>

          {/* 🌐 Language */}
          <div className="flex rounded-xl border-2 border-white">
            {["KR", "EN"].map((lang, i) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`min-w-17 h-13 text-[28px] p-0.5 font-bold
                  ${language === lang ? "bg-[#FFCA08] rounded-lg text-white" : "bg-white text-black"}
                  ${fc(idx(3 + i, 2 + i))}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* 🎛 Controls */}
        <div className="flex items-center gap-2 ml-2">
          <FooterButton icon={<Volume1 size={28} />} label={t("translations.Volume Down")}
            onClick={() => dispatch(decreaseVolume())}
            isSelected={cursor === idx(5, 4)} isFocused={isFocused} />

          <FooterButton label={`${Math.round(volume * 100)}%`} onClick={() => { }}
            isSelected={cursor === idx(6, 5)} isFocused={isFocused} />

          <FooterButton icon={<Volume2 size={28} />} label={t("translations.Volume Up")}
            onClick={() => dispatch(increaseVolume())}
            isSelected={cursor === idx(7, 6)} isFocused={isFocused} />

          <FooterButton icon={<InfoIcon size={28} />} label={t("translations.Info")}
            onClick={() => {
              logEvent("info", "Info modal opened from footer");
              setIsInfoOpen(true);
            }}
            isSelected={cursor === idx(8, 7)} isFocused={isFocused} />

          <FooterButton icon={<ZoomIn size={28} />} label={t("translations.Magnifier")}
            active={magnifierEnabled}
            onClick={() => dispatch(toggleMagnifier())}
            isSelected={cursor === idx(9, 8)} isFocused={isFocused} />

          <FooterButton icon={<Contrast size={28} />} label={t("translations.Contrast")}
            onClick={toggleContrast} active={contrastEnabled}
            isSelected={cursor === idx(10, 9)} isFocused={isFocused} />
        </div>
      </div>

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => {
          logEvent("info", "Info modal closed");
          setIsInfoOpen(false);
          window.__ON_MODAL_CLOSE__?.();
        }}
      />
    </>
  );
};

export default FooterControls;