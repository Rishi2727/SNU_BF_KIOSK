import { useEffect, useState } from "react";
import { Home, Users, Armchair, ArrowLeft } from 'lucide-react';
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import i18n from "../../../translation/language/i18n";
import { formatFloorForSpeech } from "../../../utils/speechFormatter";
import logo from "../../../assets/images/logo.png";
const FloorLegendBar = ({
  buildingName,
  floorName,
  roomName,
  showBack,
  onBack,
  isFocused
}) => {

  const BASE_OFFSET = showBack ? 0 : -1;
  const SECTION_COUNT = showBack ? 5 : 4;
  const [cursor, setCursor] = useState(null);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const lang = i18n.language;
  /* --------------------------
   RESET CURSOR ON DEFOCUS
---------------------------*/
  useEffect(() => {
    if (!isFocused) {
      setCursor(null);
    }
  }, [isFocused]);


  // --------------------------
  // KEYBOARD NAVIGATION
  // --------------------------
  useEffect(() => {
    if (!isFocused) return;

    const onKeyDown = (e) => {
      // Never consume focus toggle key
      if (
        e.key === "*" ||
        e.code === "NumpadMultiply" ||
        e.keyCode === 106
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCursor((c) =>
          c == null ? 0 : (c + 1) % SECTION_COUNT
        );
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCursor((c) =>
          c == null ? SECTION_COUNT - 1 : (c - 1 + SECTION_COUNT) % SECTION_COUNT
        );
      }

      if (e.key === "Enter") {
        e.preventDefault();

        // Enter only works on Back
        if (showBack && cursor === 0) {
          onBack();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocused, cursor, SECTION_COUNT, showBack, onBack]);


  // 🔊 VOICE: speak legend item when cursor changes
  useEffect(() => {
    if (!isFocused) return;
    if (cursor === null) return;

    stop();

    // BACK BUTTON
    if (showBack && cursor === 0) {
      speak(t("speech.Back to floor map"));
      return;
    }

    const index = showBack ? cursor - 1 : cursor;

    switch (index) {
      case 0:
        speak(
          t("speech.Floor legend location", {
            building: t(`translations.${buildingName}`),
            floor: formatFloorForSpeech(floorName, lang),
            room: roomName,
          })
        );
        break;

      case 1:
        speak(t("speech.Available seats"));
        break;

      case 2:
        speak(t("speech.Booked seats"));
        break;

      case 3:
        speak(t("speech.Disabled seats"));
        break;

      default:
        break;
    }
  }, [
    cursor,
    isFocused,
    showBack,
    buildingName,
    floorName,
    roomName,
    speak,
    stop,
    t,
  ]);


  // --------------------------
  // FOCUS RING HELPER
  // --------------------------
  const focusRing = "outline outline-[6px] outline-[#dc2f02]";

  const isFocusedAt = (index) =>
    isFocused && cursor === index;

  return (
    <div className={`
        absolute  left-0 right-0 w-full
        bg-[#b8975e] py-1 px-4 top-0.5
        flex items-center justify-between
        text-white shadow-lg z-20
        ${isFocused ? focusRing : ""}
      `}>

    

      {/* LEFT */}
      <div className="flex items-center gap-4">
        {/* {showBack && (
          <button
            onClick={onBack}
            className={`
              flex items-center gap-2
              bg-[#FFCA08] text-[#9A7D4C]
              px-4 py-1 rounded-lg
              text-[26px] font-bold
              ${isFocusedAt(0) ? focusRing : ""}
            `}
            aria-selected={isFocusedAt(0)}
          >
            <ArrowLeft className="w-6 h-6" />
            {t("common.Back")}
          </button>
        )} */}

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 1 : 0) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 1 : 0)}>
              <img
        src={logo}
        alt="logo"
        className=" w-[38%]"
      />
          <Home className="w-8 h-8 -ml-18!" />
          <span className="text-[28px] font-semibold text-nowrap">
            {buildingName && `${t(`translations.${buildingName}`)} `}
            {floorName && `( ${t(`common.${floorName}`)} `}
            {roomName && `: ${roomName} `}
            {(floorName || roomName) && ')'}
          </span>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 2 : 1) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 2 : 1)}>
          <div className="w-8 h-8 bg-[#FFCA08] rounded"></div>
          <span className="text-[30px]">{t("translations.Available")}</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 3 : 2) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 3 : 2)}>
          <Users className="w-8 h-8 text-blue-400" />
          <span className="text-[28px]">{t("translations.Booked")}</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 4 : 3) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 4 : 3)}>
          <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
            <Armchair className="w-8 h-8 text-gray-300" />
          </div>
          <span className="text-[28px]">{t("translations.Disabled")}</span>
        </div>
      </div>
    </div>
  );
};

export default FloorLegendBar;
