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
import { FloorImageUrl, getKioskUserInfo, getSeatList, ImageBaseUrl } from "../../services/api";
import { MINI_MAP_LAYOUT, MINIMAP_CONFIG } from "../../utils/constant";
import SeatActionModal from "../../components/common/SeatActionModal";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";


const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId, sectorNo, move } = useParams();
  const [mapCursor, setMapCursor] = useState(null);
  const [miniMapCursor, setMiniMapCursor] = useState(-1);
  const { userInfo } = useSelector((state) => state.userInfo);
  // For speak and translations 
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
  const FocusRegion = Object.freeze({
    FLOOR_STATS: "floor_stats",
    LEGEND: "legend",
    MINI_MAP: "mini_map",
    ROOM: "room",
    FOOTER: "footer",
  });


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


  useEffect(() => {
    setMiniMapCursor(-1);
  }, [selectedSector]);


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
      speak(t("speech.This screen is the floor or reading room selection screen."));
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
  const sectorListData = sectorList;

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
        FocusRegion.LEGEND,
        FocusRegion.MINI_MAP,
        FocusRegion.ROOM,
        FocusRegion.FOOTER,
      ];
    }
    return [
      FocusRegion.FLOOR_STATS,
      FocusRegion.LEGEND,
      FocusRegion.ROOM,
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

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MINI_MAP) return;
    if (!showRoomView) return;
    if (!layout?.sectors?.length) return;

    const TOTAL = layout.sectors.length;

    const onKeyDown = (e) => {
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106) return;

      // 👉 ONLY MOVE RED BORDER (NO ZOOM, NO CLICK)
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMiniMapCursor((prev) =>
          prev === -1 ? 0 : (prev + 1) % TOTAL
        );
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMiniMapCursor((prev) =>
          prev === -1 ? TOTAL - 1 : (prev - 1 + TOTAL) % TOTAL
        );
      }

      // ✅ ENTER = ACTUAL SELECTION
      if (e.key === "Enter" && miniMapCursor !== -1) {
        e.preventDefault();

        const sector = layout.sectors[miniMapCursor];
        if (!sector) return;

        setSelectedMiniSector(sector);
        setImageTransform(sector.transform);
        setIsZoomed(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);

  }, [focusedRegion, showRoomView, layout, miniMapCursor]);


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
    if (currentFloor?.id === floor.id) return;

    // change floor (this will trigger redux sector fetch in useFloorData)
    setCurrentFloor(floor);

    // reset UI states
    setSelectedSector(null);
    setShowRoomView(false);

    // navigate (no waiting for API)
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
        (s) => String(s.SECTORNO) === String(sectorNo)
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

    if (prevSectorNoRef.current === selectedSector.SECTORNO) return;
    prevSectorNoRef.current = selectedSector.SECTORNO;

    setSelectedMiniSector(null);
    setImageTransform({ x: 0, y: 0, scale: 1 });
    setIsZoomed(false);
    setMiniMapError(false);
    setSelectedSeat(null);
    setShowSeatModal(false);
  }, [selectedSector]);

  /* =====================================================
     AUTO SELECT DEFAULT MINI MAP SECTOR (DISABLED)
  ===================================================== */
  // useEffect(() => {
  //   if (!layout || !showRoomView) return;
  //   // Don't auto-select, start at actual size
  //   setSelectedMiniSector(null);
  //   setImageTransform({ x: 0, y: 0, scale: 1 });
  //   setIsZoomed(false);
  // }, [layout, showRoomView]);

  /* =====================================================
     TRACK IMAGE DIMENSIONS
  ===================================================== */
  // useEffect(() => {
  //   const updateDimensions = () => {
  //     if (mainImageRef.current && containerRef.current) {
  //       const img = mainImageRef.current;
  //       const container = containerRef.current;
  //       const containerRect = container.getBoundingClientRect();
  //       const imgRect = img.getBoundingClientRect();

  //       setImageDimensions({
  //         width: imgRect.width,
  //         height: imgRect.height,
  //         naturalWidth: img.naturalWidth,
  //         naturalHeight: img.naturalHeight,
  //         offsetX: imgRect.left - containerRect.left,
  //         offsetY: imgRect.top - containerRect.top,
  //       });
  //     }
  //   };

  //   if (showRoomView) {
  //     updateDimensions();
  //     window.addEventListener("resize", updateDimensions);

  //     const timer = setTimeout(updateDimensions, 550);

  //     return () => {
  //       window.removeEventListener("resize", updateDimensions);
  //       clearTimeout(timer);
  //     };
  //   }
  // }, [imageTransform, selectedSector, showRoomView]);

  /* =====================================================
     MINI MAP CLICK
  ===================================================== */
const handleMiniSectorClick = (sector) => {
  setImageTransform(prev => ({
    ...prev,
    x: -sector.x1,
    y: -sector.y1
  }));
};
  /* =====================================================
     IMAGE LOAD HANDLER
  ===================================================== */
  const handleImageLoad = (e) => {
    const img = e.target;

    // ✅ hard visual reset
    setImageTransform({ x: 0, y: 0, scale: 1 });
    setIsZoomed(false);
    setSelectedMiniSector(null);
    setHasPanned(false);
    setIsPanning(false);

    // ✅ store REAL rendered size
    requestAnimationFrame(() => {
      setImageDimensions({
        width: img.clientWidth,
        height: img.clientHeight,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        offsetX: 0,
        offsetY: 0,
      });
    });
  };

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

  /* =====================================================
     MAP LABEL HANDLING
  ===================================================== */
  const getSectorLabel = (sector, index = 0) => {
    if (!sector?.MAPLABEL) return "";
    const labels = sector.ROOM_NAME.split("$").map((l) => l.trim());
    return labels[index] || labels[0];
  };

  const displayableSectors = filterDisplayableSectors(sectorList);

  // ==============Map of Image ==================

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP) {
      setMapCursor(null);
    }
  }, [focusedRegion]);

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP) return;
    if (isAnyModalOpen) return;
    if (!displayableSectors?.length) return;

    const SECTION_COUNT = displayableSectors.length;

    const onKeyDown = (e) => {
      // 🚫 never consume focus toggle key
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106) {
        if (!isAsterisk) return;
        if (showSeatModal || isAnyModalOpen) return;

      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMapCursor((c) => (c == null ? 0 : (c + 1) % SECTION_COUNT));
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMapCursor((c) =>
          c == null
            ? SECTION_COUNT - 1
            : (c - 1 + SECTION_COUNT) % SECTION_COUNT
        );
      }

      if (e.key === "Enter" && mapCursor != null) {
        e.preventDefault();
        handleSectorClick(displayableSectors[mapCursor]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedRegion, mapCursor, displayableSectors]);

  useEffect(() => {
    if (isAnyModalOpen) {
      stop();          // 🔇 stop header/footer speech
      setFocusedRegion(null); // ❌ clear background focus
    }
  }, [isAnyModalOpen, stop]);


  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP) return;
    if (mapCursor === null) return;
    if (!displayableSectors?.length) return;

    const sector = displayableSectors[mapCursor];
    if (!sector) return;

    stop();

    const label = getSectorLabel(sector);

    // Basic speech (safe)
    speak(
      t("speech.MAP_SECTOR_INFO", {
        sector: label,
      })
    );

  }, [
    focusedRegion,
    mapCursor,
    displayableSectors,
    speak,
    stop,
    t,

  ]);

  useEffect(() => {
    setMiniMapCursor(-1);
  }, [selectedSector]);


  // 2. REPLACE the "RESET ON SECTOR CHANGE" useEffect with this:
  useEffect(() => {
    if (!selectedSector) return;
    if (prevSectorNoRef.current === selectedSector.SECTORNO) return;
    prevSectorNoRef.current = selectedSector.SECTORNO;

    // Only reset these specific states
    setMiniMapError(false);
    setSelectedSeat(null);
    setShowSeatModal(false);

    // Don't reset: miniMapCursor, selectedMiniSector, imageTransform, isZoomed
  }, [selectedSector]);

  // 3. REPLACE the "AUTO SELECT DEFAULT MINI MAP SECTOR" useEffect with this:
  // useEffect(() => {
  //   if (!layout?.sectors?.length || !showRoomView) return;

  //   // Small delay to ensure layout is ready
  //   const timer = setTimeout(() => {
  //     const firstSector = layout.sectors[0];
  //     if (firstSector) {
  //       console.log('Auto-selecting first sector:', firstSector.id);
  //       setMiniMapCursor(0);
  //       setSelectedMiniSector(firstSector);
  //       setImageTransform(firstSector.transform);
  //       setIsZoomed(true);
  //     }
  //   }, 100);

  //   return () => clearTimeout(timer);
  // }, [layout, showRoomView, selectedSector?.SECTORNO]);
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
      {/* ================= LEGEND + FOOTER ================= */}
      <FloorLegendBar
        buildingName="Central Library, Gwanjeong Building"
        floorName={currentFloor?.title}
        roomName={selectedSector?.MAPLABEL}
        showBack={showRoomView}
        onBack={backToFloorMap}
        isFocused={focusedRegion === FocusRegion.LEGEND}
        isAnyModalOpen={isAnyModalOpen}

      />


      {/* ================= MAIN CONTENT ================= */}
      <div className="absolute inset-0 flex items-center justify-center z-0 -top-27 mx-[11px]">
        {currentFloor && (
          <div className={`relative h-[830px] bg-white/10 backdrop-blur-sm rounded-lg  shadow-2xl ${focusedRegion === FocusRegion.ROOM
            ? "border-[5px] border-[#dc2f02] box-border"
            : "border-[5px] border-transparent box-border"
            }`}>
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
                onImageLoad={handleImageLoad}
                onMiniMapError={() => setMiniMapError(true)}
                miniMapCursor={miniMapCursor}
                focusedRegion={focusedRegion}

              />
            ) : (
              <div className="relative w-full h-full p-5 ">
                <div
                  className={`relative w-full h-full`}
                >
                  <FloorMapImage
                    floorImageUrl={floorImageUrl}
                    currentFloor={currentFloor}
                    onImageError={handleImageError}
                    imageError={imageError}

                  />

                  {!imageError &&
                    displayableSectors.map((sector, sectorIndex) => {
                      const mapStylesList = parseMapPoint(sector.MAPPOINT);


                      return mapStylesList.map((mapStyles, idx) => (
                        <button
                          key={`${sector.SECTORNO}-${idx}`}
                          onClick={() => handleSectorClick(sector)}
                          className="group absolute transition-all z-20"
                          aria-selected={
                            focusedRegion === FocusRegion.MAP &&
                            mapCursor === sectorIndex
                          }
                          style={{
                            top: mapStyles.top,
                            left: mapStyles.left,
                            right: mapStyles.right,
                            width: mapStyles.width,
                            height: mapStyles.height,
                            minHeight: "60px",
                          }}
                        >
                          {/* ✅ FOCUS VISUAL (padding + min height effect) */}
                          {focusedRegion === FocusRegion.MAP && mapCursor === sectorIndex && (
                            <div className="pointer-events-none absolute -inset-3 top-[-55px] rounded border-[6px] border-[#dc2f02]" />
                          )}

                          <div
                            className="pointer-events-none absolute -top-4 left-[-15px] right-3 bottom-6 bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded
                           opacity-0 group-hover:opacity-100 transition-all duration-200" />
                          <div className="absolute -top-15 left-1/2 -translate-x-1/2 pointer-events-none">
                            <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg whitespace-nowrap">
                              {t(`${getSectorLabel(sector, idx)}`)}
                            </span>
                          </div>
                        </button>

                      ));
                    })}
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
        />
      </div>
      <div

      >
        <FooterControls
          userInfo={userInfo}
          logout={handleLogout}
          isFocused={focusedRegion === FocusRegion.FOOTER}
          isAnyModalOpen={isAnyModalOpen}
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
