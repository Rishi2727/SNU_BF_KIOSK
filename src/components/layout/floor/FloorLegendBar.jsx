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
  isFocused,
  isAnyModalOpen
}) => {

  const SECTION_COUNT = 4;
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
    if (!isFocused || isAnyModalOpen) return;

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

      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocused, cursor, SECTION_COUNT]);


  // 🔊 VOICE: speak legend item when cursor changes
  useEffect(() => {
    if (!isFocused || cursor === null) return;

    stop();

    switch (cursor) {
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
    buildingName,
    floorName,
    roomName,
    speak,
    stop,
    t,
    lang,
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
        bg-[#b8975e]  h-[180px] top-0.5
        flex items-center justify-between
        text-white shadow-lg z-20 
        ${isFocused ? focusRing : ""}
      `}>



      {/* LEFT */}
      <div className="flex items-center gap-5">


        <div className={`flex items-center gap-2 ${isFocusedAt(0)
          ? focusRing : ""}`}
          aria-selected={isFocusedAt(0)}>
          <img
            src={logo}
            alt="logo"
            className=" w-[38%] -ml-2!"
          />
          <Home className="w-8 h-8 -ml-16!" />
          <span className="text-[28px] font-semibold text-nowrap">
            {buildingName && `${t(`translations.${buildingName}`)} `}
            {floorName && `( ${t(`translations.${floorName}`)} `}
            {roomName && `: ${roomName} `}
            {(floorName || roomName) && ')'}
          </span>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        <div className={`flex items-center gap-2 ${isFocusedAt(1) ? focusRing : ""}`}
          aria-selected={isFocusedAt(1)}>
          <div className="w-8 h-8 bg-[#FFCA08] rounded"></div>
          <span className="text-[30px]">{t("translations.Available")}</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(2) ? focusRing : ""}`}
          aria-selected={isFocusedAt(2)}>
          <Users className="w-8 h-8 text-blue-400" />
          <span className="text-[28px]">{t("translations.Booked")}</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(3) ? focusRing : ""}`}
          aria-selected={isFocusedAt(3)}>
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
