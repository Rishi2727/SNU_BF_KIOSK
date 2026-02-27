import { useEffect, useState } from "react";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { formatFloorForSpeech } from "../../../utils/speechFormatter";
import { useDispatch, useSelector } from "react-redux";

const FloorStatsBar = ({ floors, currentFloor, onFloorClick, loading, isFocused, isAnyModalOpen, isMinimapNearFloorStats }) => {
  const calculatePercentage = (occupied, total) => {
    if (!total) return 0;
    return Math.min((occupied / total) * 100, 100);
  };
  const [floorCursor, setFloorCursor] = useState(null);
  const SECTION_COUNT = floors.length;
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const lang = useSelector((state) => state.lang.current);

  const dispatch = useDispatch();
  /* --------------------------
   RESET CURSOR ON DEFOCUS
---------------------------*/
  useEffect(() => {
    if (!isFocused) {
      setFloorCursor(null);
    }
  }, [isFocused]);

  /* --------------------------
     KEYBOARD NAVIGATION
  ---------------------------*/
  useEffect(() => {
    if (!isFocused || isAnyModalOpen) return;

    const onKeyDown = (e) => {
      // 🚫 never handle focus-switch key here
      if (
        e.key === "*" ||
        e.code === "NumpadMultiply" ||
        e.keyCode === 106
      ) {
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFloorCursor((c) => {
          if (c == null) return 0;
          return (c + 1) % SECTION_COUNT;
        });
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFloorCursor((c) => {
          if (c == null) return SECTION_COUNT - 1;
          return (c - 1 + SECTION_COUNT) % SECTION_COUNT;
        });
      }

      if (e.key === "Enter" && floorCursor !== null) {
        e.preventDefault();
        const selectedFloor = floors[floorCursor];
        if (selectedFloor && !loading) {
          onFloorClick(selectedFloor);
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isFocused, floorCursor, floors, loading, SECTION_COUNT]);

  // 🔊 VOICE: speak floor stats on focus change
  useEffect(() => {
    if (!isFocused) return;
    if (floorCursor === null) return;

    const floor = floors[floorCursor];
    if (!floor) return;

    stop();

    speak(
      t("speech.MAIN_FLOOR_INFO", {
        floor: formatFloorForSpeech(floor.title, lang),
        total: floor.total,
        occupied: floor.occupied,
      })
    );
  }, [isFocused, floorCursor, floors, speak, stop, t, lang]);


  return (
    <div
      className={`
        floor-stats-bar
      ${isMinimapNearFloorStats ? 'w-[78%]' : 'w-full'}
    absolute bottom-1  z-30
    flex items-center   gap-5
    px-5   py-2
    bg-white/90 backdrop-blur-md
   rounded-md shadow-xl
    ${isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
  `}
    >
      {floors.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onFloorClick(item)}
          disabled={loading}
          className={`w-[35%]  flex items-center  rounded-xl overflow-hidden 
            transition-all duration-200  cursor-pointer
            hover:scale-[1.02] hover:shadow-lg 
            disabled:opacity-50 disabled:cursor-not-allowed
            ${currentFloor?.id === item.id
              ? "bg-[#FFCA08] shadow-md"
              : "bg-[#C4B483] hover:bg-[#D4C493]"
            }
            
               ${isFocused && floorCursor === index
              ? "outline-[6px] outline-[#dc2f02]"
              : ""}`


          }
        >
          {/* Floor Label */}
          <div
            className={`px-6 py-4 flex items-center justify-center shrink-0 ${currentFloor?.id === item.id
              ? "bg-[#9A7D4C]"
              : "bg-[#FFCA08]"
              }`}
          >
            <span
              className={`text-[30px] font-bold tracking-wide ${currentFloor?.id === item.id
                ? "text-white"
                : "text-[#9A7D4C]"
                }`}
            >
              {item.name}
            </span>
          </div>

          {/* Stats */}
          <div className="flex-1 px-4 py-2 relative">
            {/* Percentage badge */}
            <div className="absolute top-7 left-4 bg-[#9A7D4C] text-white font-bold px-3 py-0 rounded-md text-[30px] shadow-md" style={{ left: `${calculatePercentage(item.occupied, item.total)}%` }}>
              {item.occupied}
            </div>

            {/* Progress bar */}
            <div className="mt-2 mb-3">
              <div className="h-2 bg-[#D7D8D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9A7D4C] rounded-full transition-all duration-300"
                  style={{
                    width: `${calculatePercentage(item.occupied, item.total)}%`,
                  }}
                />
              </div>
            </div>

            {/* Total */}
            <div className="text-right text-gray-500 leading-none">
              <span className="text-[30px]">{item.total}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FloorStatsBar;
