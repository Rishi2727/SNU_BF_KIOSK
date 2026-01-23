import { useEffect, useState, useRef, useMemo } from "react";
import { ImageBaseUrl } from "../../../services/api";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { getRoomConfig } from "../../../utils/config";
import SectorZoomMiniMap from "./SectorZoomMiniMap.jsx";

/* ================= SEAT IMAGE ================= */
const getRSeatImage = (seat) => {
  if (seat.ICONTYPE < 2 || seat.ICONTYPE > 7) return null;
  const rNo = seat.ICONTYPE - 1;
  const isDisabled =
    seat.USECNT !== 0 || (seat.STATUS !== 1 && seat.STATUS !== 2);
  return `${ImageBaseUrl}/SeatBtnR${rNo}${isDisabled ? "_Dis" : ""}.png`;
};

/* ================================================= */
const RoomView = ({
  selectedSector,
  baseUrl,
  seats,
  loadingSeats,
  isPanning,
  onSeatClick,
  focusedRegion,
  isMinimapFocused,
  minimapFocusIndex,
  onMiniSectorClick,
  focusedSeatIndex, 
  visibleSeatsFromParent, 
  onSectorsCalculated,
}) => {
  const { speak, stop } = useVoice();
  const { t } = useTranslation();

  const miniMapRef = useRef(null);
  const mainImageRef = useRef(null);
  const containerRef = useRef(null);
  const seatRefs = useRef({});
  const [seatBounds, setSeatBounds] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [allSectors, setAllSectors] = useState([]);
  const [selectedMiniSectorLocal, setSelectedMiniSectorLocal] = useState(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imagePanOffset, setImagePanOffset] = useState({ x: 0, y: 0 });
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [refsReady, setRefsReady] = useState(false);

  /* ================= ROOM CONFIG ================= */
  const roomConfig = useMemo(() => {
    const config = getRoomConfig(selectedSector?.SECTORNO);
    // Default overlap threshold is 0.1 (meaning 90% visibility required)
    return {
      ...config
    };
  }, [selectedSector?.SECTORNO]);

  console.log("new", selectedSector);

  /* ================= RESET ON SECTOR CHANGE ================= */
  useEffect(() => {
    // Reset all state when sector changes
    setSelectedMiniSectorLocal(null);
    setImagePanOffset({ x: 0, y: 0 });
    setSectors([]);
    setAllSectors([]);
    setSeatBounds(null);
    setIsImageLoaded(false);
    setNaturalDimensions({ width: 0, height: 0 });
    setDisplayDimensions({ width: 0, height: 0 });
    setRefsReady(false);
  }, [selectedSector?.SECTORNO]);

  /* ================= PARSE SEAT POSITION ================= */
  const parseSeatPosition = (seat) => {
    if (
      !seat?.POSX ||
      !seat?.POSY ||
      !seat?.POSW ||
      !seat?.POSH ||
      !mainImageRef?.current ||
      !naturalDimensions.width
    ) return null;

    const referenceDimensions = roomConfig.USE_LEGACY_SYSTEM_MAPPING
      ? {
        width: roomConfig.USE_LEGACY_SYSTEM_MAPPING_WIDTH,
        height: roomConfig.USE_LEGACY_SYSTEM_MAPPING_HEIGHT
      }
      : naturalDimensions;

    const scaleX = displayDimensions.width / referenceDimensions.width;
    const scaleY = displayDimensions.height / referenceDimensions.height;

    return {
      left: `${seat.POSX * scaleX}`,
      top: `${seat.POSY * scaleY}`,
      width: `${seat.POSW * scaleX}`,
      height: `${seat.POSH * scaleY}`,
    };
  };

  /* ================= UPDATE CONTAINER SIZE ================= */
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  /* ================= CALCULATE SEAT BOUNDS ================= */
  useEffect(() => {
    if (!roomConfig.USE_SEAT_BOUNDS || !seats.length || !naturalDimensions.width || !displayDimensions.width) {
      if (!roomConfig.USE_SEAT_BOUNDS && displayDimensions.width && displayDimensions.height) {
        setSeatBounds({
          minX: 0,
          minY: 0,
          maxX: displayDimensions.width,
          maxY: displayDimensions.height,
          width: displayDimensions.width,
          height: displayDimensions.height
        });
      } else {
        setSeatBounds(null);
      }
      return;
    }

    const referenceDimensions = roomConfig.USE_LEGACY_SYSTEM_MAPPING
      ? {
        width: roomConfig.USE_LEGACY_SYSTEM_MAPPING_WIDTH,
        height: roomConfig.USE_LEGACY_SYSTEM_MAPPING_HEIGHT
      }
      : naturalDimensions;

    const scaleX = displayDimensions.width / referenceDimensions.width;
    const scaleY = displayDimensions.height / referenceDimensions.height;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    seats.forEach(seat => {
      const x1 = seat.POSX * scaleX;
      const y1 = seat.POSY * scaleY;
      const x2 = (seat.POSX + seat.POSW) * scaleX;
      const y2 = (seat.POSY + seat.POSH) * scaleY;

      minX = Math.min(minX, x1);
      minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2);
      maxY = Math.max(maxY, y2);
    });

    minX = Math.max(0, minX - roomConfig.SEAT_BOUNDS_MARGIN);
    minY = Math.max(0, minY - roomConfig.SEAT_BOUNDS_MARGIN);
    maxX = Math.min(displayDimensions.width, maxX + roomConfig.SEAT_BOUNDS_MARGIN);
    maxY = Math.min(displayDimensions.height, maxY + roomConfig.SEAT_BOUNDS_MARGIN);

    setSeatBounds({
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    });
  }, [seats, naturalDimensions, displayDimensions, roomConfig]);

  /* ================= CALCULATE SECTORS ================= */
  useEffect(() => {
    let isCancelled = false;
    let timeoutId = null;

    if (!isImageLoaded || !seatBounds || !containerSize.width || !containerSize.height) {
      console.log('❌ Sector calc skipped:', { isImageLoaded, seatBounds, containerSize });
      setSectors([]);
      setAllSectors([]);
      return;
    }

    if (!seats.length || !naturalDimensions.width || !displayDimensions.width) {
      console.log('❌ Sector calc skipped - missing data:', {
        seatsCount: seats.length,
        naturalDimensions,
        displayDimensions
      });
      return;
    }

    const calculateSectors = () => {
      if (isCancelled) return;

      const { minX, minY, width: boundsWidth, height: boundsHeight } = seatBounds;
      const { width: containerWidth, height: containerHeight } = containerSize;

      const referenceDimensions = roomConfig.USE_LEGACY_SYSTEM_MAPPING
        ? {
          width: roomConfig.USE_LEGACY_SYSTEM_MAPPING_WIDTH,
          height: roomConfig.USE_LEGACY_SYSTEM_MAPPING_HEIGHT
        }
        : naturalDimensions;

      const scaleX = displayDimensions.width / referenceDimensions.width;
      const scaleY = displayDimensions.height / referenceDimensions.height;

      const numHorizontalSectors = Math.ceil(boundsWidth / containerWidth);
      const numVerticalSectors = Math.ceil(boundsHeight / containerHeight);

      const horizontalStep = numHorizontalSectors > 1
        ? (boundsWidth - containerWidth) / (numHorizontalSectors - 1)
        : 0;
      const verticalStep = numVerticalSectors > 1
        ? (boundsHeight - containerHeight) / (numVerticalSectors - 1)
        : 0;

      const calculatedSectors = [];
      const allSectors = [];
      let sectorId = 1;

      for (let row = 0; row < numVerticalSectors; row++) {
        for (let col = 0; col < numHorizontalSectors; col++) {
          const x1 = minX + (col * horizontalStep);
          const y1 = minY + (row * verticalStep);
          const x2 = x1 + containerWidth;
          const y2 = y1 + containerHeight;

          let uniqueX1 = x1;
          let uniqueX2 = x2;
          let uniqueY1 = y1;
          let uniqueY2 = y2;

          if (col > 0) {
            const leftSectorX1 = minX + ((col - 1) * horizontalStep);
            uniqueX1 = (leftSectorX1 + x1) / 2 + containerWidth / 2;
          }
          if (col < numHorizontalSectors - 1) {
            const rightSectorX1 = minX + ((col + 1) * horizontalStep);
            uniqueX2 = (x1 + rightSectorX1) / 2 + containerWidth / 2;
          }

          if (row > 0) {
            const topSectorY1 = minY + ((row - 1) * verticalStep);
            uniqueY1 = (topSectorY1 + y1) / 2 + containerHeight / 2;
          }
          if (row < numVerticalSectors - 1) {
            const bottomSectorY1 = minY + ((row + 1) * verticalStep);
            uniqueY2 = (y1 + bottomSectorY1) / 2 + containerHeight / 2;
          }

          const centerX = (uniqueX1 + uniqueX2) / 2;
          const centerY = (uniqueY1 + uniqueY2) / 2;

          const hasCompleteSeat = seats.some(seat => {
            const sx1 = seat.POSX * scaleX;
            const sy1 = seat.POSY * scaleY;
            const sx2 = (seat.POSX + seat.POSW) * scaleX;
            const sy2 = (seat.POSY + seat.POSH) * scaleY;

            return sx1 >= x1 && sx2 <= x2 && sy1 >= y1 && sy2 <= y2;
          });

          const sectorData = {
            id: sectorId,
            x1: Math.round(x1),
            y1: Math.round(y1),
            x2: Math.round(x2),
            y2: Math.round(y2),
            uniqueX1: Math.round(uniqueX1),
            uniqueY1: Math.round(uniqueY1),
            uniqueX2: Math.round(uniqueX2),
            uniqueY2: Math.round(uniqueY2),
            centerX: Math.round(centerX),
            centerY: Math.round(centerY),
            enabled: hasCompleteSeat,
            row,
            col
          };

          allSectors.push(sectorData);

          if (hasCompleteSeat) {
            calculatedSectors.push(sectorData);
          }

          sectorId++;
        }
      }

      if (isCancelled) return;

      setSectors(calculatedSectors);
      setAllSectors(allSectors);

      if (calculatedSectors.length > 0 && !selectedMiniSectorLocal && !isCancelled) {
        const firstSector = calculatedSectors[0];
        timeoutId = setTimeout(() => {
          if (!isCancelled) {
            setSelectedMiniSectorLocal(firstSector);
            setImagePanOffset({ x: -firstSector.x1, y: -firstSector.y1 });
          }
        }, 100);
      }
    };

    calculateSectors();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [seatBounds, containerSize, seats, naturalDimensions, displayDimensions, isImageLoaded, roomConfig, selectedMiniSectorLocal]);

  /* ================= IMAGE LOAD HANDLER ================= */
  const handleImageLoad = (e) => {
    const img = e.target;

    console.log('🖼️ Image loaded:', {
      natural: { width: img.naturalWidth, height: img.naturalHeight },
      client: { width: img.clientWidth, height: img.clientHeight }
    });

    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });

    const containerElement = containerRef.current;
    const containerWidth = containerElement?.clientWidth || window.innerWidth * 0.67;
    const containerHeight = containerElement?.clientHeight || 870;

    console.log('📦 Container size:', { containerWidth, containerHeight });

    let scale = 1;
    const widthRatio = containerWidth / img.naturalWidth;
    const heightRatio = containerHeight / img.naturalHeight;

    if (img.naturalWidth < containerWidth && img.naturalHeight < containerHeight) {
      scale = roomConfig.MINIMUM_SCALE_MULTIPLIER;
    } else if (img.naturalWidth < containerWidth || img.naturalHeight < containerHeight) {
      scale = Math.max(widthRatio, heightRatio);
    } else {
      scale = 1;
    }

    const finalScale = scale * roomConfig.ZOOM_AFTER_SCALE;
    const displayWidth = Math.floor(img.naturalWidth * finalScale);
    const displayHeight = Math.floor(img.naturalHeight * finalScale);

    console.log('🔍 Scale calculation:', {
      scale,
      finalScale,
      display: { width: displayWidth, height: displayHeight }
    });

    setDisplayDimensions({ width: displayWidth, height: displayHeight });
    setIsImageLoaded(true);
  };

  /* ================= CHECK SEAT VISIBILITY BY OVERLAP ================= */
  const isSeatVisibleByOverlap = (seat) => {
    if (!selectedMiniSectorLocal || !sectors.length) return true;

    const sector = sectors.find(s => s.id === selectedMiniSectorLocal.id);
    if (!sector) return true;

    const threshold = roomConfig.SEAT_OVERLAP_THRESHOLD || 0.1;

    const position = parseSeatPosition(seat);
    if (!position) return false;

    const seatLeft = parseFloat(position.left);
    const seatTop = parseFloat(position.top);
    const seatWidth = parseFloat(position.width);
    const seatHeight = parseFloat(position.height);
    const seatRight = seatLeft + seatWidth;
    const seatBottom = seatTop + seatHeight;
    const seatArea = seatWidth * seatHeight;

    const overlapLeft = Math.max(seatLeft, sector.x1);
    const overlapTop = Math.max(seatTop, sector.y1);
    const overlapRight = Math.min(seatRight, sector.x2);
    const overlapBottom = Math.min(seatBottom, sector.y2);

    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
      const overlapPercentage = overlapArea / seatArea;

      // Show seat only if overlap is >= 90% (1 - 0.1 threshold)
      return overlapPercentage >= (1 - threshold);
    }

    return false;
  };

  /* ================= MINIMAP HIDE CHECK ================= */
  const isSeatHiddenByMinimap = (seatDiv) => {
    if (!miniMapRef.current || !seatDiv) return false;

    const s = seatDiv.getBoundingClientRect();
    const m = miniMapRef.current.getBoundingClientRect();

    return !(
      s.right < m.left ||
      s.left > m.right ||
      s.bottom < m.top ||
      s.top > m.bottom
    );
  };

  /* ================= HANDLE SECTOR SELECTION ================= */
  const handleSectorSelect = (sectorId) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (sector) {
      setSelectedMiniSectorLocal(sector);
      setImagePanOffset({ x: -sector.x1, y: -sector.y1 });
      if (onMiniSectorClick) {
        onMiniSectorClick(sector);
      }
    }
  };

  /* ================= CHECK IF SEAT IS IN CURRENT VIEWPORT ================= */
  const isSeatInViewport = (seat) => {
    if (!selectedMiniSectorLocal || !isImageLoaded) return false;

    const position = parseSeatPosition(seat);
    if (!position) return false;

    const seatLeft = parseFloat(position.left);
    const seatTop = parseFloat(position.top);
    const seatRight = seatLeft + parseFloat(position.width);
    const seatBottom = seatTop + parseFloat(position.height);

    // Account for image pan offset
    const viewportLeft = -imagePanOffset.x;
    const viewportTop = -imagePanOffset.y;
    const viewportRight = viewportLeft + containerSize.width;
    const viewportBottom = viewportTop + containerSize.height;

    // Check if seat is within viewport
    return (
      seatRight > viewportLeft &&
      seatLeft < viewportRight &&
      seatBottom > viewportTop &&
      seatTop < viewportBottom
    );
  };

  /* ================= VISIBLE SEATS MEMO ================= */
  const visibleSeats = useMemo(() => {
    if (!seats?.length || !selectedMiniSectorLocal || !isImageLoaded) return [];

    const visible = seats.filter(seat => {
      // Check if seat is in viewport
      if (!isSeatInViewport(seat)) return false;

      // ✅ NEW: Check if seat has sufficient overlap with current sector
      if (!isSeatVisibleByOverlap(seat)) return false;

      // Check if hidden by minimap
      const seatDiv = seatRefs.current[seat.SEATNO];
      if (!seatDiv) return true;

      return !isSeatHiddenByMinimap(seatDiv);
    });

    // ✅ force stable order (left → right, top → bottom)
 // ✅ stable + counting-wise order
return visible.sort((a1, b1) => {
  const a = a1.VNAME
  const b = b1.VNAME

  const re = /^([A-Za-z]*)(\d*)$/;

  const [, aPrefix, aNum] = a.match(re);
  const [, bPrefix, bNum] = b.match(re);

  // 1️⃣ Compare prefix (letters)
  if (aPrefix !== bPrefix) {
    return aPrefix.localeCompare(bPrefix);
  }

  // 2️⃣ Compare numeric part
  return (parseInt(aNum || 0) - parseInt(bNum || 0));
});

  }, [seats, selectedMiniSectorLocal, imagePanOffset, isImageLoaded, containerSize]);

  /* ================= MARK REFS AS READY ================= */
  useEffect(() => {
    if (!seats?.length || !isImageLoaded) return;

    // Give time for refs to be set
    const timer = setTimeout(() => {
      setRefsReady(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [seats, isImageLoaded]);

  /* ====================HANDLED MINI MAP AUTO FOCUS ===================== */ 
  useEffect(() => {
    if (
      !isMinimapFocused ||
      minimapFocusIndex === -1 ||
      !sectors?.length
    ) {
      return;
    }
    const clampedIndex = Math.min(minimapFocusIndex, sectors.length - 1);
    const sector = sectors[clampedIndex];
    
    if (!sector) {
      console.warn('⚠️ Sector not found at index:', minimapFocusIndex, 'max:', sectors.length - 1);
      return;
    }
    setSelectedMiniSectorLocal(sector);
    setImagePanOffset({ x: -sector.x1, y: -sector.y1 });
    if (onMiniSectorClick) {
      onMiniSectorClick(sector);
    }
  }, [minimapFocusIndex, isMinimapFocused, sectors, onMiniSectorClick]);

  // Used for keyboard cursor bounds and minimap navigation
  useEffect(() => {
    if (sectors?.length > 0 && onSectorsCalculated) {
      onSectorsCalculated(sectors.length);
    }
  }, [sectors, onSectorsCalculated]);

  // Used for keyboard navigation, focus handling, and speech
  useEffect(() => {
    if (typeof visibleSeatsFromParent === "function") {
      visibleSeatsFromParent(visibleSeats);
    }
  }, [visibleSeats, visibleSeatsFromParent]);

  /* ================= RENDER ================= */
  return (
    <>
      <div
        ref={containerRef}
        className="flex flex-col w-full h-full relative"
      >
        {loadingSeats && <LoadingSpinner />}
        {/* MINIMAP - Now positioned on top of the image */}
        {!loadingSeats && selectedSector?.SECTOR_IMAGE && (
          <div
            ref={miniMapRef}
            className="absolute z-100 bg-white/10"
            style={{
              top: `${roomConfig.MINIMAP_POSITION_TOP}px`,
              left: `${roomConfig.MINIMAP_POSITION_LEFT}px`,
              
            }}
          >
            {sectors.length === 0 && (
              <div className="text-xs text-red-500 bg-white p-2 rounded">
                No sectors calculated yet
              </div>
            )}
            <SectorZoomMiniMap
              roomImage={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
              mode="room"
              onSectorSelect={handleSectorSelect}
              focusedSector={null}
              selectedSector={selectedMiniSectorLocal?.id}
              sectors={sectors}
              allSectors={allSectors}
              seatBounds={seatBounds}
              displayDimensions={displayDimensions}
              minimapScaleFactor={roomConfig.MINIMAP_SCALE_FACTOR}
              isFocused={focusedRegion === "mini_map"}
              focusStage="sector"
              isMinimapFocused={isMinimapFocused}
              minimapFocusIndex={minimapFocusIndex}
            />
          </div>
        )}
        <div className="flex-1 relative bg-gray-100">
          {selectedSector?.SECTOR_IMAGE ? (
            <div className="w-full h-full relative overflow-hidden">
              <div
                className={`absolute transition-transform duration-500 ease-in-out`}
                style={{
                  width: displayDimensions.width ? `${displayDimensions.width}px` : 'auto',
                  height: displayDimensions.height ? `${displayDimensions.height}px` : 'auto',
                  transform: `translate(${imagePanOffset.x}px, ${imagePanOffset.y}px)`
                }}
              >
                <img
                  ref={mainImageRef}
                  src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
                  alt="Room"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'fill'
                  }}
                  onLoad={handleImageLoad}
                  draggable={false}
                />

                {/* SEATS */}
                {seats.map((seat) => {
                  const position = parseSeatPosition(seat);
                  if (!position) return null;

                  // ✅ Check visibility by overlap
                  const isVisibleByOverlap = isSeatVisibleByOverlap(seat);
                  if (!isVisibleByOverlap) return null;

                  const visibleIndex = visibleSeats.findIndex(s => s.SEATNO === seat.SEATNO);
                  const isFocused = visibleIndex === focusedSeatIndex && focusedRegion === "room";

                  const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
                  const isHandicap = seat.STATUS === 9;

                  if (seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7) {
                    const src = getRSeatImage(seat);
                    const fontSize = 30;
                    return (
                      <div
                        ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                        key={seat.SEATNO}
                        className={`absolute pointer-events-auto cursor-pointer transition-all hover:opacity-80 ${isFocused ? 'ring-[6px] ring-[#dc2f02] ring-offset-2 z-50' : ''
                          }`}
                        style={{
                          left: `${position.left}px`,
                          top: `${position.top}px`,
                          width: `${position.width}px`,
                          height: `${position.height}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPanning) onSeatClick(seat);
                        }}
                      >
                        <img src={src} className="w-full h-full" alt="" />
                        <span
                          className="absolute inset-0 flex items-center justify-center font-normal text-black drop-shadow pointer-events-none"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {seat.VNAME}
                        </span>
                      </div>
                    );
                  }

                  if (seat.ICONTYPE === 1 || seat.ICONTYPE === 8) {
                    const fontSize = 30;
                    return (
                      <div
                        ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                        key={seat.SEATNO}
                        className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isFocused ? 'ring-[6px] ring-[#dc2f02] ring-offset-2 z-50' : ''
                          } ${isHandicap
                            ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                            : isAvailable
                              ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f]"
                              : "bg-[#e5e1c4]"
                          }`}
                        style={{
                          left: `${position.left}px`,
                          top: `${position.top}px`,
                          width: `${position.width * roomConfig.ZOOM_SEATS_SCALE}px`,
                          height: `${position.height}px`,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isPanning) onSeatClick(seat);
                        }}
                      >
                        <span
                          className="font-normal text-gray-800"
                          style={{ fontSize: `${fontSize}px` }}
                        >
                          {seat.VNAME}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 text-xl">No image available</div>
          )}
        </div>
      </div>
    </>
  );
};

export default RoomView;