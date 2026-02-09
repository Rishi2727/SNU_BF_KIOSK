import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BgMainImage from "../../assets/images/BgMain.jpg";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import {
  filterDisplayableSectors,
  parseMapPoint,
} from "../../utils/mapPointParser";
import { useFloorData } from "../../hooks/useFloorData";
import RoomView from "../../components/layout/floor/RoomView";
import FloorMapImage from "../../components/layout/floor/FloorMapImage";
import FloorStatsBar from "../../components/layout/floor/FloorStatsBar";
import FloorLegendBar from "../../components/layout/floor/FloorLegendBar";
import FooterControls from "../../components/common/Footer";
import {
  FloorImageUrl,
  getKioskUserInfo,
  getSeatList,
  ImageBaseUrl,
} from "../../services/api";
import { MINI_MAP_LAYOUT, MINIMAP_CONFIG } from "../../utils/constant";
import SeatActionModal from "../../components/common/SeatActionModal";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";
import { formatFloorForSpeech } from "../../utils/speechFormatter";
import { getRoomConfig, isMinimapAtBottom } from "../../utils/config";

const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId, sectorNo, move } = useParams();
  const [miniMapCursor, setMiniMapCursor] = useState(-1);
  const { userInfo } = useSelector((state) => state.userInfo);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const isMoveMode = move === "move" || location.state?.mode === "move";
  const { floorInfo: initialFloorInfo } = location.state || {};
  const [selectedSector, setSelectedSector] = useState(null);
  const [showRoomView, setShowRoomView] = useState(false);
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedMiniSector, setSelectedMiniSector] = useState(null);
  const [imageTransform, setImageTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [isZoomed, setIsZoomed] = useState(false); // Track zoom state
  const [isPanning, setIsPanning] = useState(false);
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [hasPanned, setHasPanned] = useState(false);
  const mainImageRef = useRef(null);
  const containerRef = useRef(null);
  const prevSectorNoRef = useRef(null);
  const [focusedRegion, setFocusedRegion] = useState(null);
  const lang = useSelector((state) => state.lang.current);
  const [visibleSeats, setVisibleSeats] = useState([]);
  const [minimapSectorCount, setMinimapSectorCount] = useState(0);
  // ✅ CENTRALIZED MAIN CONTENT NAVIGATION
  const [mainContentCursor, setMainContentCursor] = useState(null);

  const FocusRegion = Object.freeze({
    FLOOR_STATS: "floor_stats",
    MINI_MAP: "mini_map",
    MAP: "map",
    ROOM: "room",
    FOOTER: "footer",
  });
  // Determine if minimap is at bottom (near FloorStatsBar)
  const isMinimapNearFloorStats = showRoomView && selectedSector
    ? isMinimapAtBottom(selectedSector.SECTORNO)
    : false

  /**
   * Initialize authenticated user on mount
   */
  useEffect(() => {
    const initializeUser = async () => {
      const isAuth = localStorage.getItem("authenticated");
      if (isAuth !== "true") return;

      try {
        const info = await getKioskUserInfo();
        if (info?.successYN === "Y") {
          dispatch(setUserInfo(info.bookingInfo));
        }
      } catch (error) {
        console.error("Failed to fetch kiosk user info:", error);
      }
    };

    initializeUser();
  }, [dispatch]);

  /* =====================================================
     FLOOR DATA HOOK
  ===================================================== */

  const {
    floors,
    currentFloor,
    setCurrentFloor,
    sectorList,
    floorImageUrl,
    imageError,
    setImageError,
    loading,
  } = useFloorData(floorId, initialFloorInfo);
  //Speak on screen
  useEffect(() => {
    const onKeyDown = (e) => {
      const isHash =
        e.key === "#" ||
        e.code === "NumpadHash" ||
        (e.keyCode === 51 && e.shiftKey);

      if (!isHash) return;
      if (e.repeat) return;

      stop();
      speak(
        t("speech.This screen is the floor or reading room selection screen."),
      );
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [speak, stop, t]);

  /* =====================================================
     COMPUTED VALUES FOR ROOM VIEW
  ===================================================== */
  const layout = selectedSector
    ? MINI_MAP_LAYOUT[selectedSector.SECTORNO]
    : null;
  const miniMapFile = selectedSector
    ? MINIMAP_CONFIG[selectedSector.SECTORNO]
    : null;
  const miniMapUrl = miniMapFile ? `${ImageBaseUrl}/${miniMapFile}` : null;
  const seatFontScale = layout?.seatFontScale ?? 1; // Keep font size constant

  /* =====================================================
     BUILD URL PATH WITH MOVE MODE
  ===================================================== */
  const buildFloorPath = (floorTitle, sectorNo = null) => {
    let path = `/floor/${floorTitle}`;
    if (sectorNo) {
      path += `/${sectorNo}`;
    }
    if (isMoveMode) {
      path += "/move";
    }
    return path;
  };

  const getFocusOrder = () => {
    if (showRoomView) {
      return [
        FocusRegion.FLOOR_STATS,
        FocusRegion.MINI_MAP,
        FocusRegion.ROOM,
        FocusRegion.FOOTER,
      ];
    }

    return [
      FocusRegion.FLOOR_STATS,
      FocusRegion.MAP, // ✅ NOW VALID
      FocusRegion.FOOTER,
    ];
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk =
        e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106;

      if (!isAsterisk || e.repeat) return;
      if (showSeatModal || isAnyModalOpen) return;

      e.preventDefault();
      e.stopPropagation();

      const ORDER = getFocusOrder();

      setFocusedRegion((prev) => {
        if (!prev) return ORDER[0];

        const currentIndex = ORDER.indexOf(prev);
        const nextIndex = (currentIndex + 1) % ORDER.length;
        return ORDER[nextIndex];
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSeatModal, isAnyModalOpen, showRoomView]);

  /* =====================================================
     CENTRALIZED MAIN CONTENT NAVIGATION (MAP/ROOM)
  ===================================================== */
  /* =====================================================
     MAP LABEL HANDLING
  ===================================================== */
  const getSectorLabel = (sector, index = 0) => {
    if (!sector?.MAPLABEL) return "";
    const labels = sector.ROOM_NAME.split("$").map((l) => l.trim());
    return labels[index] || labels[0];
  };

  const displayableSectors = filterDisplayableSectors(sectorList);
  // Reset cursor when focus region changes
  useEffect(() => {
    if (showRoomView && focusedRegion === FocusRegion.MAP) {
      setFocusedRegion(FocusRegion.ROOM);
    } else if (!showRoomView && focusedRegion === FocusRegion.ROOM) {
      setFocusedRegion(FocusRegion.MAP);
    }
  }, [showRoomView, focusedRegion]);

  // Reset cursor when focus region changes OR when view changes
  useEffect(() => {
    setMainContentCursor(null);
    stop();
  }, [focusedRegion, showRoomView, stop]);

  // Get total items for main content navigation
  const getMainContentItemCount = () => {
    const LEGEND_BAR_COUNT = 4;

    if (focusedRegion === FocusRegion.ROOM) {
      return LEGEND_BAR_COUNT + visibleSeats.length; // ✅ use visibleSeats
    }

    if (focusedRegion === FocusRegion.MAP) {
      return LEGEND_BAR_COUNT + (displayableSectors?.length || 0);
    }

    return LEGEND_BAR_COUNT;
  };


  // Main content keyboard navigation
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP && focusedRegion !== FocusRegion.ROOM)
      return;
    if (isAnyModalOpen) return;

    const LEGEND_BAR_COUNT = 4;
    const TOTAL_ITEMS = getMainContentItemCount();

    const onKeyDown = (e) => {
      // Don't consume focus toggle key
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106)
        return;

      if (e.key === "ArrowRight") {
        e.preventDefault();

        setMainContentCursor((prev) => {
          // first time → start from legend 0
          if (prev === null) return 0;

          // move right, if end reached → back to legend 0
          if (prev + 1 >= TOTAL_ITEMS) return 0;

          return prev + 1;
        });
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();

        setMainContentCursor((prev) => {
          // first time → go to last item
          if (prev === null) return TOTAL_ITEMS - 1;

          // move left, if before 0 → go to last
          if (prev - 1 < 0) return TOTAL_ITEMS - 1;

          return prev - 1;
        });
      }


      if (e.key === "Enter" && mainContentCursor !== null) {
        e.preventDefault();

        // If cursor is in legend bar range (0-3), do nothing (just for navigation)
        if (mainContentCursor < LEGEND_BAR_COUNT) {
          return;
        }

        // If cursor is in map/room content range
        const contentIndex = mainContentCursor - LEGEND_BAR_COUNT;

        if (focusedRegion === FocusRegion.MAP && displayableSectors?.length) {
          handleSectorClick(displayableSectors[contentIndex]);
        }

        if (focusedRegion === FocusRegion.ROOM) {
          // Handle seat click - will be implemented with visible seats
          const visibleSeats = seats; // This will be refined
          if (visibleSeats[contentIndex]) {
            handleSeatClick(visibleSeats[contentIndex]);
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    focusedRegion,
    mainContentCursor,
    displayableSectors,
    seats,
    isAnyModalOpen,
  ]);

  // Mini map keyboard navigation:
  // ✅ Mini map keyboard navigation (WITH LOOP)
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MINI_MAP) return;
    if (!showRoomView) return;
    if (!selectedSector) return;
    if (!minimapSectorCount) return; // 🔥 total enabled sectors from RoomView

    const onKeyDown = (e) => {
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106)
        return;

      // ▶ RIGHT ARROW → NEXT (loop)
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMiniMapCursor((prev) => {
          if (prev === -1) return 0;
          return (prev + 1) % minimapSectorCount; // 🔁 loop
        });
      }

      // ◀ LEFT ARROW → PREVIOUS (loop)
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMiniMapCursor((prev) => {
          if (prev === -1) return minimapSectorCount - 1;
          return (prev - 1 + minimapSectorCount) % minimapSectorCount; // 🔁 loop
        });
      }

      // ⏎ ENTER → handled in RoomView
      if (e.key === "Enter") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);

  }, [
    focusedRegion,
    showRoomView,
    selectedSector,
    minimapSectorCount
  ]);


  /* =====================================================
     LOGOUT
  ===================================================== */
  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
    navigate("/");
  };
  /* =====================================================
     FLOOR IMAGE ERROR
  ===================================================== */
  const handleImageError = () => {
    console.error("Failed to load floor image:", floorImageUrl);
    setImageError(true);
  };

  /* =====================================================
     FLOOR CHANGE - PRESERVE MOVE MODE
  ===================================================== */
  const handleFloorClick = (floor) => {
    // 🟡 SAME FLOOR CLICKED → GO BACK TO FLOOR MAP
    if (currentFloor?.id === floor.id) {
      // If we are inside room/sector view
      if (showRoomView) {
        backToFloorMap();
      }
      return;
    }
    setCurrentFloor(floor);
    setSelectedSector(null);
    setShowRoomView(false);

    navigate(buildFloorPath(floor.title), {
      replace: true,
      state: {
        floorInfo: floor,
        mode: isMoveMode ? "move" : undefined,
      },
    });
  };

  /* =====================================================
     FETCH SEATS
  ===================================================== */
  const fetchSeats = async (sector) => {
    if (!sector) return;

    setLoadingSeats(true);
    try {
      const res = await getSeatList({
        sectorno: sector.SECTORNO,
        floor: sector.FLOOR,
        floorno: sector.FLOORNO,
        roomno: sector.ROOMNO,
        type: "S",
      });

      setSeats(Array.isArray(res?.seatList) ? res.seatList : []);
    } catch {
      setSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  };

  /* =====================================================
     LOAD SECTOR FROM ROUTE OR AUTO OPEN
  ===================================================== */
  useEffect(() => {
    if (sectorNo && sectorList?.length) {
      const sector = sectorList.find(
        (s) => String(s.SECTORNO) === String(sectorNo),
      );

      if (sector) {
        setSelectedSector(sector);
        setShowRoomView(true);
        fetchSeats(sector);
      }
    }
  }, [sectorList, sectorNo]);
  /* =====================================================
     SECTOR CLICK - PRESERVE MOVE MODE
  ===================================================== */
  const handleSectorClick = async (sector) => {
    setSelectedSector(sector);
    setShowRoomView(true);

    console.log("first--------------------", sector)
    navigate(buildFloorPath(sector.FLOOR, sector.SECTORNO), {
      replace: false,
      state: {
        selectedSector: sector,
        sectorList: sectorList,
        floorInfo: currentFloor,
        mode: isMoveMode ? "move" : undefined,
      },
    });

    await fetchSeats(sector);
  };

  /* =====================================================
     BACK TO FLOOR MAP - PRESERVE MOVE MODE
  ===================================================== */
  const backToFloorMap = () => {
    navigate(buildFloorPath(currentFloor?.title), {
      replace: true,
      state: {
        sectorList: sectorList,
        floorInfo: currentFloor,
        mode: isMoveMode ? "move" : undefined,
      },
    });
    setShowRoomView(false);
    setSelectedSector(null);
    setMiniMapError(false);
    setIsZoomed(false);
  };

  /* =====================================================
     RESET ON SECTOR CHANGE
  ===================================================== */
  useEffect(() => {
    if (!selectedSector) return;

    console.log("🧹 Floor: reset minimap navigation");

    setMiniMapCursor(-1);
    setFocusedRegion(FocusRegion.ROOM); // force focus away from minimap

  }, [selectedSector]);

  /* =====================================================
     MINI MAP CLICK
  ===================================================== */
  const handleMiniSectorClick = (sector) => {
    if (!sector) return;   // ✅ protect against null

    setImageTransform((prev) => ({
      ...prev,
      x: -sector.x1,
      y: -sector.y1,
    }));
  };

  /* =====================================================
     IMAGE LOAD HANDLER
  ===================================================== */

  /* =====================================================
     SEAT CLICK HANDLER
  ===================================================== */
  const handleSeatClick = (seat) => {
    const isAvailable =
      seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
    if (!isAvailable) return;

    setSelectedSeat(seat);
    setShowSeatModal(true);
    setIsAnyModalOpen(true);
  };

  /* =====================================================
     SEAT BOOKING HANDLERS
  ===================================================== */
  const handleCloseModal = () => {
    setShowSeatModal(false);
    setSelectedSeat(null);
    setIsAnyModalOpen(false);
  };

  // ==============Map of Image ==================
  useEffect(() => {
    if (isAnyModalOpen) {
      stop(); // 🔇 stop header/footer speech
      setFocusedRegion(null); // ❌ clear background focus
    }
  }, [isAnyModalOpen, stop]);

  // 🔊 SPEECH: Main content (legend bar + map/room)
  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP && focusedRegion !== FocusRegion.ROOM)
      return;
    if (mainContentCursor === null) return;

    stop();

    const LEGEND_BAR_COUNT = 4;

    // If cursor is in legend bar range (0-3)
    if (mainContentCursor < LEGEND_BAR_COUNT) {
      switch (mainContentCursor) {
        case 0:
          speak(
            t("speech.Floor legend location", {
              building: t(
                `translations.${"Central Library, Gwanjeong Building"}`,
              ),
              floor: formatFloorForSpeech(currentFloor?.title, lang),
              room: selectedSector?.MAPLABEL || "",
            }),
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
      }
      return;
    }

    // If cursor is in content range (map sectors or room seats)
    const contentIndex = mainContentCursor - LEGEND_BAR_COUNT;
    if (focusedRegion === FocusRegion.MAP && displayableSectors?.length) {
      const sector = displayableSectors[contentIndex];
      if (sector) {
        const label = getSectorLabel(sector);
        speak(
          t("speech.MAP_SECTOR_INFO", {
            sector: label,
          }),
        );
      }
    }
    if (focusedRegion === FocusRegion.ROOM && visibleSeats?.length) {
      const seat = visibleSeats[contentIndex];
      if (seat) {
        speak(`Seat ${seat.VNAME}`);
      }
    }
  }, [
    focusedRegion,
    mainContentCursor,
    displayableSectors,
    seats,
    currentFloor,
    selectedSector,
    speak,
    stop,
    t,
    lang,
  ]);
  // ✅ RESET MINIMAP CURSOR WHEN ENTERING MINIMAP FOCUS
  useEffect(() => {
    if (focusedRegion === FocusRegion.MINI_MAP) {
      console.log("♻️ Entered MINI_MAP → resetting cursor");
      setMiniMapCursor(-1); // important: forces fresh start
    }
  }, [focusedRegion]);


  // /* =====================================================
  //  RENDER
  // ===================================================== */
  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img
        src={BgMainImage}
        className="absolute inset-0 h-full w-full object-cover"
        alt="background"
      />
      {/* ================= MAIN CONTENT ================= */}
      <div
        className={`relative inset-0 h-[900px] flex items-center  justify-center z-0  ${focusedRegion === FocusRegion.ROOM ||
          focusedRegion === FocusRegion.MAP
          ? "border-[5px] border-[#dc2f02] box-border"
          : "border-[5px] border-transparent box-border"
          }`}
      >
        <FloorLegendBar
          buildingName="Central Library, Gwanjeong Building"
          floorName={currentFloor?.title}
          roomName={selectedSector?.MAPLABEL}
          isFocused={
            focusedRegion === FocusRegion.ROOM ||
            focusedRegion === FocusRegion.MAP
          }
          isAnyModalOpen={isAnyModalOpen}
          cursor={mainContentCursor}
          SECTION_COUNT={4}
        />

        {currentFloor && (
          <div
            className={`relative w-full h-[720px] bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl top-[80px]`}
          >

            {loading ? (
              <LoadingSpinner />
            ) : showRoomView && selectedSector ? (
              <RoomView
                key={selectedSector?.SECTOR_IMAGE}
                selectedSector={selectedSector}
                baseUrl={FloorImageUrl}
                seats={seats}
                loadingSeats={loadingSeats}
                selectedMiniSector={selectedMiniSector}
                imageTransform={imageTransform}
                miniMapUrl={miniMapUrl}
                miniMapError={miniMapError}
                layout={layout}
                seatFontScale={seatFontScale}
                imageDimensions={imageDimensions}
                mainImageRef={mainImageRef}
                containerRef={containerRef}
                isZoomed={isZoomed}
                isPanning={isPanning}
                onMiniSectorClick={handleMiniSectorClick}
                onSeatClick={handleSeatClick}
                onMiniMapError={() => setMiniMapError(true)}
                isMinimapFocused={focusedRegion === FocusRegion.MINI_MAP}
                minimapFocusIndex={miniMapCursor}
                focusedRegion={focusedRegion}
                focusedSeatIndex={
                  mainContentCursor !== null && mainContentCursor >= 4
                    ? mainContentCursor - 4
                    : -1
                }
                visibleSeatsFromParent={setVisibleSeats}
                onSectorsCalculated={setMinimapSectorCount}
              />
            ) : (
            <div className="relative w-full h-full">
  <div className={`relative w-full h-full`}>
    <FloorMapImage
      floorImageUrl={floorImageUrl}
      currentFloor={currentFloor}
      onImageError={handleImageError}
      imageError={imageError}
    />

    {!imageError &&
      displayableSectors.map((sector, sectorIndex) => {
        const mapStylesList = parseMapPoint(sector.MAPPOINT);

        const LEGEND_BAR_COUNT = 4;
        const isSectorFocused =
          focusedRegion === FocusRegion.MAP &&
          mainContentCursor === sectorIndex + LEGEND_BAR_COUNT;
        return mapStylesList.map((mapStyles, idx) => (
          <button
            key={`${sector.SECTORNO}-${idx}`}
            onClick={() => handleSectorClick(sector)}
            className="group absolute transition-all z-20"
            aria-selected={isSectorFocused}
            style={{
              top: `calc(${mapStyles.top} - 45px)`,
              left: mapStyles.left,
              right: mapStyles.right,
              width: mapStyles.width,
              height: mapStyles.height,
            }}
          >
            {isSectorFocused && (
              <div className="pointer-events-none w-full h-full rounded border-[6px] border-[#dc2f02]" />
            )}

            <div className="pointer-events-none w-full h-full bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded opacity-0 group-hover:opacity-100 transition-all duration-200" />

            <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg whitespace-nowrap">
                {t(getSectorLabel(sector, idx))}
              </span>
            </div>
          </button>
        ));
      })
    }
  </div>
</div>
            )}
          </div>
        )}
      </div>

      {/* ================= FLOOR STATS ================= */}
      <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
        <FloorStatsBar
          floors={floors}
          currentFloor={currentFloor}
          onFloorClick={handleFloorClick}
          loading={loading}
          isFocused={focusedRegion === FocusRegion.FLOOR_STATS}
          isAnyModalOpen={isAnyModalOpen}
          isMinimapNearFloorStats={isMinimapNearFloorStats}
        />
      </div>
      <div>
        <FooterControls
          userInfo={userInfo}
          logout={handleLogout}
          isFocused={focusedRegion === FocusRegion.FOOTER}
          isAnyModalOpen={isAnyModalOpen}
          showBack={showRoomView}
          onBack={backToFloorMap}
        />
      </div>

      {/* ================= SEAT BOOKING MODAL ================= */}
      <SeatActionModal
        mode={isMoveMode ? "move" : "booking"}
        seat={selectedSeat}
        isOpen={showSeatModal}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Floor;
