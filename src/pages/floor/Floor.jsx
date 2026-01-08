import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import BgMainImage from "../../assets/images/BgMain.jpg";
import logo from "../../assets/images/logo.png";

import { clearUserInfo } from "../../redux/slice/userInfo";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { filterDisplayableSectors, parseMapPoint } from "../../utils/mapPointParser";
import { useFloorData } from "../../hooks/useFloorData";

import RoomView from "../../components/layout/floor/RoomView";
import FloorMapImage from "../../components/layout/floor/FloorMapImage";
import FloorStatsBar from "../../components/layout/floor/FloorStatsBar";
import FloorLegendBar from "../../components/layout/floor/FloorLegendBar";
import FooterControls from "../../components/common/Footer";

import { MAP_BASE_URL, getSeatList, ImageBaseUrl } from "../../services/api";
import { MINI_MAP_LAYOUT, MINIMAP_CONFIG } from "../../utils/constant";
import SeatActionModal from "../../components/common/SeatActionModal";

const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId, sectorNo, move } = useParams();

  const { userInfo } = useSelector((state) => state.userInfo);

  const isMoveMode = move === 'move' || location.state?.mode === 'move';

  const {
    sectorList: initialSectorList,
    floorInfo: initialFloorInfo,
    selectedSector: stateSector
  } = location.state || {};

  /* =====================================================
     FLOOR / SECTOR STATE
  ===================================================== */
  const [selectedSector, setSelectedSector] = useState(null);
  const [showRoomView, setShowRoomView] = useState(false);

  /* =====================================================
     ROOM VIEW STATE - UPDATED FOR PAN/ZOOM
  ===================================================== */
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedMiniSector, setSelectedMiniSector] = useState(null);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isZoomed, setIsZoomed] = useState(false); // Track zoom state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [hasPanned, setHasPanned] = useState(false);
  const mainImageRef = useRef(null);
  const containerRef = useRef(null);
  const prevSectorNoRef = useRef(null);
  const [focusedRegion, setFocusedRegion] = useState(null);



  //Focus Region 

  const FocusRegion = Object.freeze({
    FLOOR_STATS: "floor_stats",
    LEGEND: "legend",
    MAP: "map",
    FOOTER: "footer",
  });



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
    fetchSectorList,
  } = useFloorData(floorId, initialFloorInfo, initialSectorList);

  /* =====================================================
     COMPUTED VALUES FOR ROOM VIEW
  ===================================================== */
  const layout = selectedSector ? MINI_MAP_LAYOUT[selectedSector.SECTORNO] : null;
  const miniMapFile = selectedSector ? MINIMAP_CONFIG[selectedSector.SECTORNO] : null;
  const miniMapUrl = miniMapFile ? `${ImageBaseUrl}/${miniMapFile}` : null;
  const seatFontScale = layout?.seatFontScale ?? 1; // Keep font size constant
  const sectorListData = sectorList?.SectorList;

  /* =====================================================
     BUILD URL PATH WITH MOVE MODE
  ===================================================== */
  const buildFloorPath = (floorTitle, sectorNo = null) => {
    let path = `/floor/${floorTitle}`;
    if (sectorNo) {
      path += `/${sectorNo}`;
    }
    if (isMoveMode) {
      path += '/move';
    }
    return path;
  };

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
  const handleFloorClick = async (floor) => {
    if (currentFloor?.id === floor.id) return;

    setCurrentFloor(floor);
    setSelectedSector(null);
    setShowRoomView(false);

    const newSectorList = await fetchSectorList(floor);

    if (newSectorList) {
      navigate(buildFloorPath(floor.title), {
        replace: true,
        state: {
          sectorList: newSectorList,
          floorInfo: floor,
          mode: isMoveMode ? 'move' : undefined
        },
      });
    }
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
    if (sectorNo && sectorListData?.length) {
      const sector = sectorListData.find(
        s => String(s.SECTORNO) === String(sectorNo)
      );

      if (sector) {
        setSelectedSector(sector);
        setShowRoomView(true);
        fetchSeats(sector);
      }
    }
  }, [sectorListData, sectorNo]);

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
        mode: isMoveMode ? 'move' : undefined
      }
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
        mode: isMoveMode ? 'move' : undefined
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
  useEffect(() => {
    if (!layout || !showRoomView) return;
    // Don't auto-select, start at actual size
    setSelectedMiniSector(null);
    setImageTransform({ x: 0, y: 0, scale: 1 });
    setIsZoomed(false);
  }, [layout, showRoomView]);

  /* =====================================================
     TRACK IMAGE DIMENSIONS
  ===================================================== */
  useEffect(() => {
    const updateDimensions = () => {
      if (mainImageRef.current && containerRef.current) {
        const img = mainImageRef.current;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        setImageDimensions({
          width: imgRect.width,
          height: imgRect.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          offsetX: imgRect.left - containerRect.left,
          offsetY: imgRect.top - containerRect.top,
        });
      }
    };

    if (showRoomView) {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);

      const timer = setTimeout(updateDimensions, 550);

      return () => {
        window.removeEventListener('resize', updateDimensions);
        clearTimeout(timer);
      };
    }
  }, [imageTransform, selectedSector, showRoomView]);



  // --------------------- FOCUS TOGGLE WITH '*' ---------------------
  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk =
        e.key === "*" ||
        e.code === "NumpadMultiply" ||
        e.keyCode === 106;

      if (!isAsterisk) return;
      if (showSeatModal) return;

      e.preventDefault();
      e.stopPropagation();

      setFocusedRegion((prev) => {
        if (prev === null) return FocusRegion.FLOOR_STATS;
        if (prev === FocusRegion.FLOOR_STATS) return FocusRegion.LEGEND;
        if (prev === FocusRegion.FLOOR_STATS) return FocusRegion.MAP;
        if (prev === FocusRegion.LEGEND) return FocusRegion.FOOTER;
        if (prev === FocusRegion.FOOTER) return FocusRegion.FLOOR_STATS;

        return FocusRegion.FLOOR_STATS;
      });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSeatModal]);


  /* =====================================================
     MINI MAP CLICK
  ===================================================== */
  const handleMiniSectorClick = (sector) => {
    if (selectedMiniSector?.id === sector.id) {
      setSelectedMiniSector(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
      setIsZoomed(false);
      return;
    }
    setSelectedMiniSector(sector);
    setImageTransform(sector.transform);
    setIsZoomed(true);
  };

  /* =====================================================
     MAIN IMAGE CLICK - ZOOM TO CLICKED POINT
  ===================================================== */
  const handleMainImageClick = (e) => {
    if (!mainImageRef.current) return;

    // Don't trigger zoom if user was panning/dragging
    if (hasPanned) {
      return;
    }

    // If already zoomed, zoom out
    if (isZoomed) {
      setSelectedMiniSector(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
      setIsZoomed(false);
      return;
    }

    // Calculate click position relative to image
    const rect = mainImageRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    // Calculate translation to center clicked point
    const xPercent = (0.5 - clickX) * 100;
    const yPercent = (0.5 - clickY) * 100;
    const clickScale = layout?.defaultScale ?? 3;
    // Zoom to 4x scale at clicked point
    setImageTransform({
      x: xPercent,
      y: yPercent,
      scale: clickScale
    });
    setIsZoomed(true);

    // If layout exists, try to match closest sector
    if (layout) {
      let closestSector = null;
      let minDistance = Infinity;

      layout.sectors.forEach((sec) => {
        const dx = xPercent - sec.transform.x;
        const dy = yPercent - sec.transform.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDistance) {
          minDistance = dist;
          closestSector = sec;
        }
      });

      if (closestSector) {
        setSelectedMiniSector(closestSector);
      }
    }
  };

  /* =====================================================
     PAN HANDLERS - Mouse & Touch
  ===================================================== */
  const handlePanStart = (clientX, clientY) => {
    if (!isZoomed) return;
    setIsPanning(true);
    setHasPanned(false); // Reset the pan tracking
    // Store the starting mouse position and current transform
    setPanStart({
      mouseX: clientX,
      mouseY: clientY,
      transformX: imageTransform.x,
      transformY: imageTransform.y
    });
  };
  const handlePanMove = (clientX, clientY) => {
    if (!isPanning || !isZoomed || !containerRef.current || !imageDimensions.width) return;

    // Calculate the distance moved in pixels
    const deltaX = clientX - panStart.mouseX;
    const deltaY = clientY - panStart.mouseY;

    // Mark that user has actually moved (threshold of 5px to distinguish from accidental movement)
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasPanned(true);
    }

    // Convert pixel movement to percentage based on container size
    const containerWidth = containerRef.current.offsetWidth;
    const containerHeight = containerRef.current.offsetHeight;

    const percentX = (deltaX / containerWidth) * 100 * 0.5; // 0.5 = sensitivity factor
    const percentY = (deltaY / containerHeight) * 100 * 0.5;

    const newX = panStart.transformX + percentX;
    const newY = panStart.transformY + percentY;

    // Calculate dynamic limits based on zoom scale and image dimensions
    const scale = imageTransform.scale;

    const imageWidthScaled = imageDimensions.width * scale;
    const imageHeightScaled = imageDimensions.height * scale;

    const maxPanX = ((imageWidthScaled - containerWidth) / containerWidth) * 50 / scale;
    const maxPanY = ((imageHeightScaled - containerHeight) / containerHeight) * 50 / scale;

    // Ensure we don't pan beyond the image edges
    const limitedX = Math.max(-Math.abs(maxPanX), Math.min(Math.abs(maxPanX), newX));
    const limitedY = Math.max(-Math.abs(maxPanY), Math.min(Math.abs(maxPanY), newY));

    setImageTransform(prev => ({
      ...prev,
      x: limitedX,
      y: limitedY
    }));
  };


  // ========================================
  // CHANGED: handlePanEnd
  // ========================================
  const handlePanEnd = () => {
    const wasPanning = isPanning && hasPanned;
    setIsPanning(false);
    // Reset hasPanned after a short delay to allow click event to check it
    if (!wasPanning) {
      // If it was just a click (no actual panning), reset immediately
      setHasPanned(false);
    } else {
      // If we were actually panning, delay the reset
      setTimeout(() => setHasPanned(false), 150);
    }
  };


  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault(); // Prevent default behavior
    handlePanStart(e.clientX, e.clientY);
  };


  const handleMouseMove = (e) => {
    if (isPanning) {
      e.preventDefault(); // Prevent selection while dragging
    }
    handlePanMove(e.clientX, e.clientY);
  };

  const handleMouseUp = (e) => {
    if (isPanning && hasPanned) {
      e.preventDefault(); // Prevent click event if we were panning
      e.stopPropagation(); // Stop event from bubbling to click handler
    }
    handlePanEnd();
  };
  // Touch events
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      handlePanStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault(); // Prevent scrolling
      handlePanMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    handlePanEnd();
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
        offsetY: 0
      });
    });
  };



  /* =====================================================
     SEAT CLICK HANDLER
  ===================================================== */
  const handleSeatClick = (seat) => {
    const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
    if (!isAvailable) return;

    setSelectedSeat(seat);
    setShowSeatModal(true);
  };

  /* =====================================================
     SEAT BOOKING HANDLERS
  ===================================================== */
  const handleCloseModal = () => {
    setShowSeatModal(false);
    setSelectedSeat(null);
  };

  /* =====================================================
     MAP LABEL HANDLING
  ===================================================== */
  const getSectorLabel = (sector, index = 0) => {
    if (!sector?.MAPLABEL) return "";
    const labels = sector.MAPLABEL.split("$").map((l) => l.trim());
    return labels[index] || labels[0];
  };

  const displayableSectors = filterDisplayableSectors(sectorList);

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" alt="background" />

      <img src={logo} alt="logo" className="absolute top-4 left-0 w-[21%] ml-6 z-10" />

      {/* ================= FLOOR STATS ================= */}
      <div className="absolute top-[110px] left-0 right-0 z-20 px-4">
        <FloorStatsBar
          floors={floors}
          currentFloor={currentFloor}
          onFloorClick={handleFloorClick}
          loading={loading}
          isFocused={focusedRegion === FocusRegion.FLOOR_STATS}


        />
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="absolute inset-0 flex items-center justify-center z-0 mb-[-78px] mx-[11px]">
        {currentFloor && (
          <div className="relative h-[820px] bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">

            {loading ? (
              <LoadingSpinner />
            ) : showRoomView && selectedSector ? (
              <RoomView
                key={selectedSector?.SECTOR_IMAGE}
                selectedSector={selectedSector}
                baseUrl={MAP_BASE_URL}
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
                onMainImageClick={handleMainImageClick}
                onSeatClick={handleSeatClick}
                onImageLoad={handleImageLoad}
                onMiniMapError={() => setMiniMapError(true)}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            ) : (
              <div className="relative w-full h-full">
                <FloorMapImage
                  floorImageUrl={floorImageUrl}
                  currentFloor={currentFloor}
                  onImageError={handleImageError}
                  imageError={imageError}
                  isFocused={focusedRegion === FocusRegion.MAP

                  }
                />

                {!imageError &&
                  displayableSectors.map((sector) => {
                    const mapStylesList = parseMapPoint(sector.MAPPOINT);

                    return mapStylesList.map((mapStyles, idx) => (
                      <button
                        key={`${sector.SECTORNO}-${idx}`}
                        onClick={() => handleSectorClick(sector)}
                        className="absolute group cursor-pointer hover:z-20 transition-all"
                        style={{
                          top: mapStyles.top,
                          left: mapStyles.left,
                          right: mapStyles.right,
                          width: mapStyles.width,
                          height: mapStyles.height,
                        }}
                        title={getSectorLabel(sector, idx)}
                      >
                        <div className="absolute inset-0 bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none">
                          <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg whitespace-nowrap">
                            {getSectorLabel(sector, idx)}
                          </span>
                        </div>
                      </button>
                    ));
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= LEGEND + FOOTER ================= */}
      <FloorLegendBar
        buildingName="Central Library, Gwanjeong Building"
        floorName={currentFloor?.title}
        roomName={selectedSector?.MAPLABEL}
        showBack={showRoomView}
        onBack={backToFloorMap}
        isFocused={focusedRegion === FocusRegion.LEGEND}

      />

      <FooterControls
        userInfo={userInfo}
        openKeyboard={() => { }}
        logout={handleLogout}
        onVolumeUp={() => { }}
        onVolumeDown={() => { }}
        onZoom={() => { }}
        onContrast={() => { }}
      />

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