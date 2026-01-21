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
  onMiniSectorClick
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

  /* ================= ROOM CONFIG ================= */
  const roomConfig = useMemo(() => {
    return getRoomConfig(selectedSector?.SECTORNO);
  }, [selectedSector?.SECTORNO]);

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

  /* ================= SEAT VISIBILITY CHECK ================= */
  const isSeatVisibleByOverlap = (seat) => {
    if (!selectedMiniSectorLocal || !sectors.length) return true;

    const sector = sectors.find(s => s.id === selectedMiniSectorLocal.id);
    if (!sector) return true;

    const threshold = roomConfig.SEAT_OVERLAP_THRESHOLD;

    const referenceDimensions = roomConfig.USE_LEGACY_SYSTEM_MAPPING
      ? {
        width: roomConfig.USE_LEGACY_SYSTEM_MAPPING_WIDTH,
        height: roomConfig.USE_LEGACY_SYSTEM_MAPPING_HEIGHT
      }
      : naturalDimensions;

    const scaleX = displayDimensions.width / referenceDimensions.width;
    const scaleY = displayDimensions.height / referenceDimensions.height;

    const seatX1 = seat.POSX * scaleX;
    const seatY1 = seat.POSY * scaleY;
    const seatX2 = (seat.POSX + seat.POSW) * scaleX;
    const seatY2 = (seat.POSY + seat.POSH) * scaleY;
    const seatArea = (seatX2 - seatX1) * (seatY2 - seatY1);

    const overlapX1 = Math.max(seatX1, sector.x1);
    const overlapY1 = Math.max(seatY1, sector.y1);
    const overlapX2 = Math.min(seatX2, sector.x2);
    const overlapY2 = Math.min(seatY2, sector.y2);

    if (overlapX1 < overlapX2 && overlapY1 < overlapY2) {
      const overlapArea = (overlapX2 - overlapX1) * (overlapY2 - overlapY1);
      const overlapPercentage = overlapArea / seatArea;
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
            className="absolute z-50 bg-white/10"
            style={{
              top: `${roomConfig.MINIMAP_POSITION_TOP}px`,
              left: `${roomConfig.MINIMAP_POSITION_LEFT}px`
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
                  const seatDiv = seatRefs.current[seat.SEATNO];
                  const isHiddenByMinimap = isSeatHiddenByMinimap(seatDiv);
                  const isVisible = isSeatVisibleByOverlap(seat);

                  const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
                  const isHandicap = seat.STATUS === 9;

                  if (seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7) {
                    const src = getRSeatImage(seat);
                    const fontSize = 30; // Fixed font size for R-type seats
                    return (
                      <div
                        ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                        key={seat.SEATNO}
                        className="absolute pointer-events-auto cursor-pointer transition-all hover:opacity-80"
                        style={{
                          left: `${position.left}px`,
                          top: `${position.top}px`,
                          width: `${position.width}px`,
                          height: `${position.height}px`,
                          display: (isVisible && !isHiddenByMinimap) ? "flex" : "none"
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
                    const fontSize = 30; // Fixed font size for R-type seats
                    const seatDiv = seatRefs.current[seat.SEATNO];
                    const isHiddenByMinimap = isSeatHiddenByMinimap(seatDiv);
                    const isVisible = isSeatVisibleByOverlap(seat);
                    return (
                      <div
                        ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                        key={seat.SEATNO}
                        className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isHandicap
                          ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                          : isAvailable
                            ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f]"
                            : "bg-[#e5e1c4]"
                          }`}
                        style={{
                          left: `${position.left}px`,
                          top: `${position.top}px`,
                          width: `${position.width}px`,
                          height: `${position.height}px`,
                          display: (isVisible && !isHiddenByMinimap) ? "flex" : "none"
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