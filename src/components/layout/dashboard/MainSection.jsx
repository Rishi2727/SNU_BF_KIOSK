import { useNavigate } from "react-router-dom";
import logo from "../../../assets/images/logo.png";
import LibraryCard from "./LibraryCard";
import { getSectorList } from "../../../services/api";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFloorList } from "../../../redux/slice/floorSlice";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { formatFloorForSpeech } from "../../../utils/speechFormatter";
import { logEvent } from "../../../logger";

const MainSection = ({
  openKeyboard,
  isAuthenticated,
  focusedRegion,
  FocusRegion,
}) => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { speak, stop } = useVoice();

  const lang = useSelector((state) => state.lang.current);
  const { t } = useTranslation();
  const { floors, loading, error } = useSelector((state) => state.floor);

  const [cursor, setCursor] = useState(null);

  // Logo + Heading + LibraryCards
  const TOTAL_ITEMS = floors.length + 2;

  useEffect(() => {
    logEvent("info", `Fetching floor list for lang: ${lang}`);
    dispatch(fetchFloorList(1));
  }, [dispatch, lang]);

  const handleCardClick = async (fl) => {

    if (!isAuthenticated) {
      logEvent("info", `Unauthenticated user attempted to select floor: ${fl.title} — opening keyboard`);
      openKeyboard(fl.title);
      stop();
      speak(t("speech.Virtual Keyboard"));
      return;
    }

    try {
      logEvent("info", `Fetching sector list for floor: ${fl.title} (floor=${fl.floor}, floorno=${fl.floorno})`);
      const sectorList = await getSectorList({
        floor: fl.floor,
        floorno: fl.floorno,
      });

      logEvent("info", `Navigating to floor: ${fl.title} with ${sectorList.length} sectors`);
      navigate(`/floor/${fl.title}`, {
        state: { sectorList, floorInfo: fl },
      });

    } catch (error) {
      logEvent("error", `Sector API failed for floor: ${fl.title} — ${error.message}`);
      console.error("Sector API failed", error);
    }
  };

  /*
  RESET CURSOR WHEN REGION CHANGES
  */

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAIN_SECTION) {
      setCursor(null);
    }
  }, [focusedRegion, FocusRegion.MAIN_SECTION]);

  /*
  VOICE ANNOUNCEMENT
  */

  useEffect(() => {

    if (focusedRegion !== FocusRegion.MAIN_SECTION || cursor === null) return;

    stop();

    if (cursor === 0) {
      speak(t("speech.Seoul National University Library"));
      return;
    }

    if (cursor === 1) {
      speak(t("speech.Please select a desired floor"));
      return;
    }

    const floor = floors[cursor - 2];

    if (floor) {
      speak(
        t("speech.MAIN_FLOOR_INFO", {
          floor: formatFloorForSpeech(floor.title, lang),
          total: floor.total,
          occupied: floor.occupied,
        })
      );
    }

  }, [cursor, focusedRegion, floors, speak, stop, t, lang]);

  /*
  KEYBOARD NAVIGATION
  */

  useEffect(() => {

    const onKeyDown = (e) => {
      if (focusedRegion !== FocusRegion.MAIN_SECTION) return;

      if (e.key === "ArrowRight") {

        e.preventDefault();

        setCursor((c) => {
          const next = c === null ? 0 : (c + 1) % TOTAL_ITEMS;
          logEvent("info", `Keyboard ArrowRight in MainSection — cursor: ${c} → ${next}`);
          return next;
        });

      }

      if (e.key === "ArrowLeft") {

        e.preventDefault();

        setCursor((c) => {
          const next = c === null ? TOTAL_ITEMS - 1 : (c - 1 + TOTAL_ITEMS) % TOTAL_ITEMS;
          logEvent("info", `Keyboard ArrowLeft in MainSection — cursor: ${c} → ${next}`);
          return next;
        });

      }

      if (e.key === "Enter") {

        if (cursor === 0) {
          logEvent("info", "Keyboard Enter on logo — no action");
          console.log("Logo selected");
          return;
        }

        if (cursor === 1) {
          logEvent("info", "Keyboard Enter on heading — no action");
          return;
        }

        const floor = floors[cursor - 2];

        if (floor) {
          logEvent("info", `Keyboard Enter selected floor: ${floor.title}`);
          handleCardClick(floor);
        }

      }

    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);

  }, [focusedRegion, cursor, floors, TOTAL_ITEMS]);

  /*
  LOADING STATE
  */

  if (loading) {

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          color: "rgba(255,255,255,0.7)",
          fontSize: 24,
          letterSpacing: 2
        }}
      >
        {t("translations.Loading floors")}
      </div>
    );
  }

  /*
  ERROR STATE
  */

  if (error) {

    logEvent("error", `Floor list error state rendered: ${error}`);

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          color: "#ff6b6b",
          fontSize: 22
        }}
      >
        {error}
      </div>
    );
  }

  const isMainFocused = focusedRegion === FocusRegion?.MAIN_SECTION;

  return (

    <div className="relative z-10 flex justify-center mt-20">

      <div className="w-[88%] flex flex-col items-center ">

        {/* MAIN PANEL */}

        <div
          className={`card-panel w-full px-12 py-10 rounded-[28px] border backdrop-blur-[20px] backdrop-saturate-150 transition-all duration-300 relative overflow-hidden

          ${isMainFocused
              ? "outline outline-[5px] outline-[#dc2f02] shadow-[0_0_0_5px_#dc2f02,0_0_0_9px_rgba(255,202,8,0.3),0_24px_64px_rgba(0,0,0,0.45)]"
              : "shadow-[0_24px_64px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]  outline-[5px] outline-[#a86e18]"
            }

          border-[rgba(255,202,8,0.25)]`}
        >

          {/* DECORATIVE GRADIENT */}

          <div className="absolute top-0 right-0 w-[180px] h-[180px] bg-[radial-gradient(circle_at_top_right,rgba(255,202,8,0.12),transparent_70%)] pointer-events-none" />
          <div
            className={`transition-all duration-300 rounded-2xl w-full flex items-center justify-center mb-10`}
          >
            <span className={` rounded-2xl ${isMainFocused && cursor === 0
                ? "outline outline-[5px] outline-[#dc2f02] shadow-[0_0_0_5px_rgba(255,202,8,0.25)] drop-shadow-[0_0_20px_rgba(255,202,8,0.5)]"
                : "outline outline-[5px] outline-transparent"
              }`}>
            <img
              src={logo}
              alt="logo"
              className="logo-image w-[450px]"
            />
            </span>
          </div>
          <div className="flex justify-between items-center mb-5 ">

            {/* HEADING */}

            <div
              className={`heading text-[32px] font-bold text-[#3b2a00] tracking-wide px-4 py-2 rounded-[10px] inline-block transition-all capitalize uppercase 

              ${isMainFocused && cursor === 1
                  ? "bg-[rgba(255,202,8,0.18)] outline outline-[5px] outline-[#dc2f02]"
                  : ""
                }
              `}
            >
              {t("translations.Please select a desired floor")}
            </div>

            {/* LOGO */}

          </div>

          {/* FLOOR CARDS */}

          <div className="flex justify-between gap-4">

            {floors.map((fl, index) => (

              <LibraryCard
                key={fl.id}
                {...fl}
                name={fl.name}
                availableCount={fl.occupied}
                totalCount={fl.total}
                onClick={() => handleCardClick(fl)}
                isFocused={isMainFocused && cursor === index + 2}
              />

            ))}

          </div>

        </div>

      </div>

    </div>

  );
};

export default MainSection;