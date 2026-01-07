import { useNavigate } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import LibraryCard from "./LibraryCard";
import { getSectorList } from "../../../services/api";
import { useEffect, useState } from "react";


const floors = [
  { id: 16, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
  { id: 17, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
  { id: 18, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
];

const MainSection = ({
  openKeyboard,
  isAuthenticated,
  focusedRegion,
  FocusRegion
}) => {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(null);


  const handleCardClick = async (fl) => {
    // 🔹 Check authentication first
    if (!isAuthenticated) {
      // Store the floor info to use after login
      openKeyboard(fl.title);
      return; // Stop here, don't call API yet
    }

    // 🔹 User is authenticated, proceed with API call
    try {
      const sectorList = await getSectorList({
        floor: fl.floor,
        floorno: fl.floorno,
      });

      console.log("Sector List:", sectorList);

      // 🔹 Navigate after success
      navigate(`/floor/${fl.title}`, {
        state: {
          sectorList,
          floorInfo: fl,
        },
      });
    } catch (error) {
      console.error("Sector API failed", error);
    }
  };
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAIN_SECTION) {
      setCursor(null);
    }
  }, [focusedRegion, FocusRegion.MAIN_SECTION]);

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAIN_SECTION) return;

    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        setCursor((c) => (c === null ? 0 : (c + 1) % floors.length));
      }

      if (e.key === "ArrowLeft") {
        setCursor((c) =>
          c === null ? floors.length - 1 : (c - 1 + floors.length) % floors.length
        );
      }

      if (e.key === "Enter" && cursor !== null) {
        handleCardClick(floors[cursor]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedRegion, cursor, floors]);


  return (
    <div className="relative z-10 flex justify-end items-center h-full mr-7 -mt-25">
      <div className="w-[55%] flex flex-col items-center">

        {/* ✅ Logo with focus border */}
        <div
          className={`mb-12 ml-[15%] ${focusedRegion === FocusRegion?.LOGO
              ? "outline outline-[6px] outline-[#dc2f02] rounded-2xl"
              : ""
            }`}
        >
          <img src={logo} alt="logo" className="w-[500px]" />
        </div>

        {/* ✅ Main Section (cards container) with focus border */}
        <div
          className={`w-full p-12 rounded-3xl bg-[#9A7D4C] border border-white/30 backdrop-blur-xl ${focusedRegion === FocusRegion?.MAIN_SECTION
              ? "outline outline-[6px] outline-[#dc2f02]"
              : ""
            }`}
        >
          <h2 className="text-[32px] font-semibold mb-10">
            원하는 라이브러리를 선택하십시오
          </h2>

          <div className="flex justify-between">
            {floors.map((fl,index) => (
              <LibraryCard
                key={fl.id}
                {...fl}
                availableCount={fl.occupied}
                totalCount={fl.total}
                onClick={() => handleCardClick(fl)}
                isFocused={
      focusedRegion === FocusRegion.MAIN_SECTION && cursor === index
    }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainSection;