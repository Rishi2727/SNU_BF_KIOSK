import { useEffect, useMemo } from "react";
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
  isAnyModalOpen,
  cursor, // ✅ Now controlled from parent
  SECTION_COUNT = 4, // ✅ Passed from parent
}) => {

  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const lang = i18n.language;


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
            room: formattedRoomName,
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
        speak(t("speech.Fixed seats"));
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
  // FORMAT ROOM NAME (Translate specific English terms like QUIET ZONE)
  // --------------------------
  const formattedRoomName = useMemo(() => {
    if (!roomName) return "";
    return roomName.replace(/\(QUIET ZONE\)/gi, `(${t("translations.Quiet Zone")})`);
  }, [roomName, t]);


  // --------------------------
  // FOCUS RING HELPER
  // --------------------------
  const focusRing = "outline outline-[6px] outline-[#dc2f02]";

  const isFocusedAt = (index) =>
    isFocused && cursor === index;

  return (
    <div className={`
        absolute  left-0 -top-2! right-0 w-full
        bg-[#b8975e81]  h-[180px]
        flex items-center justify-between
        text-white shadow-lg z-20 
       
      `}>



      {/* LEFT */}
      <div className="flex items-center gap-2">

        <img
          src={logo}
          alt="logo"
          className=" w-[38%] "
        />
        <div className={`flex items-center -ml-10 gap-2 ${isFocusedAt(0)
          ? focusRing : ""}`}
          aria-selected={isFocusedAt(0)}>

          <Home className="w-8 h-8 " />
          <span className="text-[28px] font-semibold text-nowrap">
            {buildingName && `${t(`translations.${buildingName}`)} `}
            {floorName && `( ${t(`translations.${floorName}`)} `}
            {formattedRoomName && `: ${formattedRoomName} `}
            {(floorName || formattedRoomName) && ')'}
          </span>

        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6 mr-3">
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
          <span className="text-[28px]">{t("translations.Fixed")}</span>
        </div>
      </div>
    </div>
  );
};

export default FloorLegendBar;
