import { useEffect, useState } from "react";
import { Home, Users, Armchair, ArrowLeft } from 'lucide-react';

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

  // --------------------------
  // FOCUS RING HELPER
  // --------------------------
  const focusRing = "outline outline-[6px] outline-[#dc2f02]";

  const isFocusedAt = (index) =>
    isFocused && cursor === index;

  return (
    <div className={`
        absolute top-[10%] left-0 right-0 w-full
        bg-[#9A7D4C] py-1 px-4
        flex items-center justify-between
        text-white shadow-lg z-20
        ${isFocused ? focusRing : ""}
      `}>

      {/* LEFT */}
      <div className="flex items-center gap-4">
        {showBack && (
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
            Back
          </button>
        )}

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 1 : 0) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 1 : 0)}>
          <Home className="w-8 h-8" />
          <span className="text-[30px] font-semibold">
            {buildingName && `${buildingName} `}
            {floorName && `( ${floorName} `}
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
          <span className="text-[30px]">Available seats</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 3 : 2) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 3 : 2)}>
          <Users className="w-8 h-8 text-blue-400" />
          <span className="text-[30px]">Booked</span>
        </div>

        <div className={`flex items-center gap-2 ${isFocusedAt(showBack ? 4 : 3) ? focusRing : ""}`}
          aria-selected={isFocusedAt(showBack ? 4 : 3)}>
          <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
            <Armchair className="w-8 h-8 text-gray-300" />
          </div>
          <span className="text-[30px]">Disabled</span>
        </div>
      </div>
    </div>
  );
};

export default FloorLegendBar;
