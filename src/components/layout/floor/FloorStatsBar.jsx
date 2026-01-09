import { use, useEffect, useState } from "react";

const FloorStatsBar = ({ floors, currentFloor, onFloorClick, loading, isFocused }) => {
  const calculatePercentage = (occupied, total) => {
    return (occupied / total) * 100;
  };
  const [floorCursor, setFloorCursor] = useState(null);
  const SECTION_COUNT = floors.length;

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
    if (!isFocused) return;

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




  return (
    <div
      className={`
    w-[80%]
    absolute bottom-0 right-0 z-30
    flex items-center justify-between gap-4
    px-6 py-2
    bg-white/90 backdrop-blur-md
    rounded-tl-2xl shadow-xl
    ${isFocused ? "outline-[6px] outline-[#dc2f02]" : ""}
  `}
    >
      {floors.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onFloorClick(item)}
          disabled={loading}
          className={`w-[35%] flex items-center rounded-xl overflow-hidden
            transition-all duration-200 cursor-pointer
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
              className={`text-[36px] font-bold tracking-wide ${currentFloor?.id === item.id
                ? "text-white"
                : "text-[#9A7D4C]"
                }`}
            >
              {item.title}
            </span>
          </div>

          {/* Stats */}
          <div className="flex-1 px-4 py-2 relative">
            {/* Percentage badge */}
            <div className="absolute top-7 left-4 bg-[#9A7D4C] text-white font-bold px-3 py-0 rounded-md text-[30px] shadow-md">
              {item.occupied}
            </div>

            {/* Progress bar */}
            <div className="mt-2 mb-3">
              <div className="h-2 bg-[#D7D8D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9A7D4C] rounded-full transition-all duration-300"
                  style={{
                    width: `${calculatePercentage(
                      item.occupied,
                      item.total
                    )}%`,
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
