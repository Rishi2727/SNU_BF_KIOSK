
import { useNavigate } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import LibraryCard from "./LibraryCard";
import { getSectorList } from "../../../services/api";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFloorList } from "../../../redux/slice/floorSlice";

const MainSection = ({
  openKeyboard,
  isAuthenticated,
  focusedRegion,
  FocusRegion
}) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  /* ===============================
     ✅ REDUX STATE
  ================================ */
  const { floors, loading, error } = useSelector((state) => state.floor);

  /* ===============================
     ✅ LOCAL STATE
  ================================ */
  const [cursor, setCursor] = useState(null);
  const TOTAL_ITEMS = floors.length + 1;

  /* ===============================
     ✅ FETCH FLOORS FROM REDUX
  ================================ */
  useEffect(() => {
    dispatch(fetchFloorList(1)); // libno = 1
  }, [dispatch]);

  /* ===============================
     ✅ CARD CLICK
  ================================ */
  const handleCardClick = async (fl) => {
    if (!isAuthenticated) {
      openKeyboard(fl.title);
      return;
    }

    try {
      const sectorList = await getSectorList({
        floor: fl.floor,
        floorno: fl.floorno,
      });

      navigate(`/floor/${fl.title}`, {
        state: {
          sectorList,
          floorInfo: fl,
        },
      });
    } catch (error) {
      console.error("❌ Sector API failed", error);
    }
  };

  /* ===============================
     ✅ RESET CURSOR ON BLUR
  ================================ */
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAIN_SECTION) {
      setCursor(null);
    }
  }, [focusedRegion, FocusRegion.MAIN_SECTION]);

  /* ===============================
     ✅ KEYBOARD NAVIGATION
  ================================ */
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAIN_SECTION) return;
    if (!floors.length) return;

    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setCursor((c) =>
          c === null ? 0 : (c + 1) % TOTAL_ITEMS
        );
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCursor((c) =>
          c === null ? TOTAL_ITEMS - 1 : (c - 1 + TOTAL_ITEMS) % TOTAL_ITEMS
        );
      }

      if (e.key === "Enter") {
        if (cursor === 0 || !floors[cursor - 1]) return;
        handleCardClick(floors[cursor - 1]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedRegion, cursor, floors, TOTAL_ITEMS]);

  /* ===============================
     ✅ LOADING / ERROR UI
  ================================ */
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full text-white text-2xl">
        Loading floors...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full text-red-500 text-xl">
        {error}
      </div>
    );
  }

  /* ===============================
     ✅ UI
  ================================ */
  return (
    <div className="relative z-10 flex justify-end items-center h-full mr-7 -mt-25">
      <div className="w-[55%] flex flex-col items-center">

        {/* ✅ Logo */}
        <div
          className={`mb-12 ml-[15%] ${
            focusedRegion === FocusRegion?.LOGO
              ? "outline-[6px] outline-[#dc2f02] rounded-2xl"
              : ""
          }`}
        >
          <img src={logo} alt="logo" className="w-[500px]" />
        </div>

        {/* ✅ Main Section */}
        <div
          className={`w-full p-12 rounded-3xl bg-[#9A7D4C] border border-white/30 backdrop-blur-xl ${
            focusedRegion === FocusRegion?.MAIN_SECTION
              ? "outline-[6px] outline-[#dc2f02]"
              : ""
          }`}
        >
          <h2
            className={`text-[32px] font-semibold mb-10
              ${
                focusedRegion === FocusRegion.MAIN_SECTION && cursor === 0
                  ? "outline-[6px] outline-[#dc2f02] rounded-lg px-2 py-2"
                  : ""
              }`}
          >
            원하는 라이브러리를 선택하십시오
          </h2>

          <div className="flex justify-between">
            {floors.map((fl, index) => (
              <LibraryCard
                key={fl.id}
                {...fl}
                availableCount={fl.occupied}
                totalCount={fl.total}
                onClick={() => handleCardClick(fl)}
                isFocused={
                  focusedRegion === FocusRegion.MAIN_SECTION &&
                  cursor === index + 1
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
