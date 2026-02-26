import { useEffect, useState, useRef, useMemo } from "react";
import { ImageBaseUrl } from "../../../services/api";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { getRoomConfig } from "../../../utils/config";
import SectorZoomMiniMap from "./SectorZoomMiniMap.jsx";
import seatUserIcon from "../../../assets/images/SeatIcons.png";
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
  const prevSectorNoRef = useRef(null); // Track previous sector number

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
  const [firstSectorSet, setFirstSectorSet] = useState(false);
  const imageWrapperRef = useRef(null);

  const isRoomStillLoading =
    loadingSeats ||
    !isImageLoaded ||
    !seatBounds ||
    !sectors.length;

  /* ================= ROOM CONFIG ================= */
  const roomConfig = useMemo(() => {
    const config = getRoomConfig(selectedSector?.SECTORNO);
    return {
      ...config
    };
  }, [selectedSector?.SECTORNO]);



  /* ================= COMPLETE RESET ON SECTOR CHANGE ================= */
  useEffect(() => {
    if (prevSectorNoRef.current === selectedSector?.SECTORNO) return;

    prevSectorNoRef.current = selectedSector?.SECTORNO;

    setSelectedMiniSectorLocal(null);
    setImagePanOffset({ x: 0, y: 0 });
    setSectors([]);
    setAllSectors([]);
    setSeatBounds(null);
    setIsImageLoaded(false);
    setNaturalDimensions({ width: 0, height: 0 });
    setDisplayDimensions({ width: 0, height: 0 });
    setRefsReady(false);
    setFirstSectorSet(false);

    seatRefs.current = {};

  }, [selectedSector?.SECTORNO]);



  /* ================= PARSE SEAT POSITION ================= */
  const parseSeatPosition = (seat) => {
    if (
      !seat?.POSX ||
      !seat?.POSY ||
      !seat?.POSW ||
      !seat?.POSH ||
      !naturalDimensions.width ||
      !displayDimensions.width
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
      left: seat.POSX * scaleX,
      top: seat.POSY * scaleY,
      width: seat.POSW * scaleX,
      height: seat.POSH * scaleY,
    };
  };
  const parseSeatIconPosition = (seat) => {
    if (!naturalDimensions.width || !displayDimensions.width) {
      return null;
    }

    const referenceDimensions = roomConfig.USE_LEGACY_SYSTEM_MAPPING
      ? {
        width: roomConfig.USE_LEGACY_SYSTEM_MAPPING_WIDTH,
        height: roomConfig.USE_LEGACY_SYSTEM_MAPPING_HEIGHT
      }
      : naturalDimensions;

    const scaleX = displayDimensions.width / referenceDimensions.width;
    const scaleY = displayDimensions.height / referenceDimensions.height;

    // ✅ Use MANX/MANY if available
    if (seat.MANX != null && seat.MANY != null) {
      return {
        left: seat.MANX * scaleX,
        top: seat.MANY * scaleY,
      };
    }

    // ✅ Fallback → center of seat
    const seatPosition = parseSeatPosition(seat);
    if (!seatPosition) return null;

    return {
      left: seatPosition.left + seatPosition.width / 2,
      top: seatPosition.top + seatPosition.height / 2,
    };
  };
  /* ================= UPDATE CONTAINER SIZE ================= */
  useEffect(() => {
    const updateContainerSize = () => {
      if (containerRef.current) {
        const newSize = {
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        };
        console.log("📦 Container size:", newSize);
        setContainerSize(newSize);
      }
    };

    updateContainerSize();
    window.addEventListener('resize', updateContainerSize);
    return () => window.removeEventListener('resize', updateContainerSize);
  }, []);

  /* ================= IMAGE LOAD HANDLER ================= */
  const handleImageLoad = (e) => {
    const img = e.target;

    console.log('🖼️ Image loaded:', {
      natural: { width: img.naturalWidth, height: img.naturalHeight },
      sector: selectedSector?.SECTORNO
    });

    setNaturalDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });

    const containerElement = containerRef.current;
    const containerWidth = containerElement?.clientWidth || window.innerWidth * 0.67;
    const containerHeight = containerElement?.clientHeight || 870;

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

    console.log('🔍 Display dimensions:', { width: displayWidth, height: displayHeight, scale: finalScale });

    setDisplayDimensions({ width: displayWidth, height: displayHeight });
    setIsImageLoaded(true);
  };

  /* ================= CALCULATE SEAT BOUNDS ================= */
  useEffect(() => {
    if (!isImageLoaded || !seats.length || !naturalDimensions.width || !displayDimensions.width) {
      console.log("⏸️ Skipping seat bounds:", {
        isImageLoaded,
        seatsCount: seats.length,
        hasNaturalDims: !!naturalDimensions.width,
        hasDisplayDims: !!displayDimensions.width
      });
      return;
    }

    console.log("📏 Calculating seat bounds for", seats.length, "seats");

    if (!roomConfig.USE_SEAT_BOUNDS) {
      console.log("📏 Using full display dimensions (USE_SEAT_BOUNDS=false)");
      setSeatBounds({
        minX: 0,
        minY: 0,
        maxX: displayDimensions.width,
        maxY: displayDimensions.height,
        width: displayDimensions.width,
        height: displayDimensions.height
      });
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

    const bounds = {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY
    };

    setSeatBounds(bounds);
  }, [seats, naturalDimensions, displayDimensions, isImageLoaded, roomConfig]);

  /* ================= CALCULATE SECTORS ================= */
  useEffect(() => {
    if (!seatBounds || !containerSize.width || !containerSize.height) {
      console.log('⏸️ Sector calc waiting for:', {
        hasSeatBounds: !!seatBounds,
        containerSize
      });
      return;
    }

    if (!seats.length || !naturalDimensions.width || !displayDimensions.width) {
      console.log('⏸️ Sector calc waiting for dimensions:', {
        seatsCount: seats.length,
        naturalDimensions,
        displayDimensions
      });
      return;
    }

    console.log("🔢 Calculating sectors...");

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

        // Check if any seat is COMPLETELY within this sector
        const hasCompleteSeat = seats.some(seat => {
          const sx1 = seat.POSX * scaleX;
          const sy1 = seat.POSY * scaleY;
          const sx2 = (seat.POSX + seat.POSW) * scaleX;
          const sy2 = (seat.POSY + seat.POSH) * scaleY;

          const overlapLeft = Math.max(sx1, x1);
          const overlapTop = Math.max(sy1, y1);
          const overlapRight = Math.min(sx2, x2);
          const overlapBottom = Math.min(sy2, y2);

          const isComplete = overlapLeft < overlapRight && overlapTop < overlapBottom;



          return isComplete;
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

    console.log("✅ Sectors calculated:", {
      total: allSectors.length,
      enabled: calculatedSectors.length,
      enabledIds: calculatedSectors.map(s => s.id)
    });

    setSectors(calculatedSectors);
    setAllSectors(allSectors);

  }, [seatBounds, containerSize, seats, naturalDimensions, displayDimensions, roomConfig]);

  // 🔄 Geometry changed → allow first sector to be set again
  useEffect(() => {
    if (!seatBounds) return;

    console.log("♻️ Geometry changed → resetting first sector lock");

    setFirstSectorSet(false);
    setSelectedMiniSectorLocal(null);

  }, [
    seatBounds?.minX,
    seatBounds?.minY,
    seatBounds?.maxX,
    seatBounds?.maxY,
    displayDimensions.width,
    displayDimensions.height
  ]);

  useEffect(() => {
    if (!sectors.length) return;
    if (!isImageLoaded) return;
    if (!seatBounds) return;
    if (!containerSize.width || !containerSize.height) return;
    if (firstSectorSet) return;

    const firstSector = allSectors.find(s => s.id === 1);
    if (!firstSector) return;

    console.log("🎯 Auto-selected sector:------------->", firstSector.id, allSectors);

    setFirstSectorSet(true);
    setSelectedMiniSectorLocal(firstSector);
    setImagePanOffset({ x: -firstSector.x1, y: -firstSector.y1 });

    if (onMiniSectorClick) onMiniSectorClick(firstSector);

  }, [
    sectors,
    isImageLoaded,
    seatBounds,
    containerSize,
    firstSectorSet,
    onMiniSectorClick
  ]);


  /* ================= CHECK SEAT VISIBILITY BY OVERLAP ================= */
  const isSeatVisibleByOverlap = (seat) => {
    if (!selectedMiniSectorLocal || !sectors.length) return true;

    const sector = sectors.find(s => s.id === selectedMiniSectorLocal.id);
    if (!sector) return true;

    const threshold = roomConfig.SEAT_OVERLAP_THRESHOLD || 0.1;

    const position = parseSeatPosition(seat);
    if (!position) return false;

    const seatLeft = position.left;
    const seatTop = position.top;
    const seatWidth = position.width;
    const seatHeight = position.height;
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

      return overlapPercentage >= (1 - threshold);
    }

    return false;
  };

  /* ================= MINIMAP HIDE CHECK ================= */
  const isSeatHiddenByMinimap = (seat) => {

    if (!miniMapRef.current || !containerRef.current) return false;

    const position = parseSeatPosition(seat);
    if (!position) return false;

    const threshold = roomConfig.SEAT_OVERLAP_THRESHOLD || 0.1;

    // Seat position in image coordinates (before pan transform)
    const seatInImageCoords = {
      left: position.left,
      top: position.top,
      right: position.left + position.width,
      bottom: position.top + position.height,
    };

    // Apply pan offset to get seat position in viewport
    const seatInViewport = {
      left: seatInImageCoords.left + imagePanOffset.x,
      top: seatInImageCoords.top + imagePanOffset.y,
      right: seatInImageCoords.right + imagePanOffset.x,
      bottom: seatInImageCoords.bottom + imagePanOffset.y,
    };

    // Get minimap position relative to container
    const containerRect = containerRef.current.getBoundingClientRect();
    const miniRect = miniMapRef.current.getBoundingClientRect();

    // Minimap position in viewport (relative to container)
    const minimapInViewport = {
      left: miniRect.left - containerRect.left,
      top: miniRect.top - containerRect.top,
      right: miniRect.right - containerRect.left,
      bottom: miniRect.bottom - containerRect.top,
    };

    // Calculate overlap area
    const overlapLeft = Math.max(seatInViewport.left, minimapInViewport.left);
    const overlapTop = Math.max(seatInViewport.top, minimapInViewport.top);
    const overlapRight = Math.min(seatInViewport.right, minimapInViewport.right);
    const overlapBottom = Math.min(seatInViewport.bottom, minimapInViewport.bottom);

    // Check if there's any overlap
    if (overlapLeft < overlapRight && overlapTop < overlapBottom) {
      const seatArea = position.width * position.height;
      const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop);
      const overlapPercentage = overlapArea / seatArea;

      // Hide seat if overlap exceeds threshold (e.g., more than 10% of seat is hidden)
      return overlapPercentage >= threshold;
    }

    return false;
  };


  /* ================= HANDLE SECTOR SELECTION ================= */
  const handleSectorSelect = (sectorId) => {
    console.log("🎯 Manual sector selection:", sectorId);
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
    if (!selectedMiniSectorLocal) return false;

    const position = parseSeatPosition(seat);
    if (!position) return false;

    const seatLeft = position.left;
    const seatTop = position.top;
    const seatRight = seatLeft + position.width;
    const seatBottom = seatTop + position.height;

    const viewportLeft = -imagePanOffset.x;
    const viewportTop = -imagePanOffset.y;
    const viewportRight = viewportLeft + containerSize.width;
    const viewportBottom = viewportTop + containerSize.height;

    return (
      seatRight > viewportLeft &&
      seatLeft < viewportRight &&
      seatBottom > viewportTop &&
      seatTop < viewportBottom
    );
  };

  /* ================= VISIBLE SEATS MEMO ================= */
  const visibleSeats = useMemo(() => {
    if (!seats?.length || !selectedMiniSectorLocal) {
      return [];
    }

    const visible = seats.filter(seat => {
      if (!isSeatInViewport(seat)) return false;
      if (!isSeatVisibleByOverlap(seat)) return false;

      // 👉 hide if covered by minimap
      if (isSeatHiddenByMinimap(seat)) return false;

      return true;
    });


    const sorted = visible.sort((a1, b1) => {
      const a = a1.VNAME;
      const b = b1.VNAME;

      const re = /^([A-Za-z]*)(\d*)$/;
      const [, aPrefix, aNum] = a.match(re);
      const [, bPrefix, bNum] = b.match(re);

      if (aPrefix !== bPrefix) {
        return aPrefix.localeCompare(bPrefix);
      }

      return (parseInt(aNum || 0) - parseInt(bNum || 0));
    });



    return sorted;
  }, [seats, selectedMiniSectorLocal, imagePanOffset, containerSize, miniMapRef.current]);

  /* ================= MARK REFS AS READY ================= */
  useEffect(() => {
    if (!seats?.length || !isImageLoaded) return;

    const timer = setTimeout(() => {
      setRefsReady(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [seats, isImageLoaded]);

  /* ================= MINIMAP FOCUS SPEAK ================= */
  useEffect(() => {
    if (!isMinimapFocused) return;
    if (!sectors.length) return;
    if (minimapFocusIndex === -1) return;

    const clampedIndex = Math.min(minimapFocusIndex, sectors.length - 1);
    const sector = sectors[clampedIndex];
    if (!sector) return;

    console.log("👀 Minimap focus moved to sector:", sector.id);

    // 🔊 SPEAK
    speak(t("speech.Mini map sector") + " " + sector.id);

  }, [
    minimapFocusIndex,
    isMinimapFocused,
    sectors,
    speak,
    t
  ]);

  useEffect(() => {
    if (!isMinimapFocused) return;

    const handleKeyDown = (e) => {
      if (e.key !== "Enter") return;
      if (minimapFocusIndex === -1) return;

      const clampedIndex = Math.min(minimapFocusIndex, sectors.length - 1);
      const sector = sectors[clampedIndex];
      if (!sector) return;

      console.log("✅ ENTER pressed → selecting sector:", sector.id);

      setSelectedMiniSectorLocal(sector);
      setImagePanOffset({ x: -sector.x1, y: -sector.y1 });

      // 🔊 SPEAK CONFIRMATION
      speak(t("speech.Selected mini map sector") + " " + sector.id);

      if (onMiniSectorClick) onMiniSectorClick(sector);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [isMinimapFocused, minimapFocusIndex, sectors, onMiniSectorClick, speak, t]);


  // Notify parent of sector count and visible seats
  useEffect(() => {
    if (sectors?.length > 0 && onSectorsCalculated) {
      onSectorsCalculated(sectors.length);
    }
  }, [sectors, onSectorsCalculated]);

  useEffect(() => {
    if (typeof visibleSeatsFromParent === "function") {
      visibleSeatsFromParent(visibleSeats);
    }
  }, [visibleSeats, visibleSeatsFromParent]);

  /* ================= RENDER ================= */
  const canShowMinimap = !loadingSeats && selectedSector?.SECTOR_IMAGE && sectors.length > 0;
  const canShowSeats = selectedMiniSectorLocal && !loadingSeats;

  return (
    <>
      <div
        ref={containerRef}
        className="flex flex-col w-full h-full relative"
      >
        {isRoomStillLoading && <LoadingSpinner message={t("Loading room and seats")} />}


        {/* MINIMAP */}
        {canShowMinimap && (
          <div
            ref={miniMapRef}
            className="absolute z-100 bg-white/10"
            style={{
              top: `${roomConfig.MINIMAP_POSITION_TOP}px`,
              left: `${roomConfig.MINIMAP_POSITION_LEFT}px`,
            }}
          >
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
                ref={imageWrapperRef}
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

                {canShowSeats && visibleSeats.map((seat, visibleIndex) => {
                  const position = parseSeatPosition(seat);
                  if (!position) return null;

                  const isFocused =
                    visibleIndex === focusedSeatIndex && focusedRegion === "room";

                  const isAvailable =
                    seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
                  const isBooked = !isAvailable;
                  const isHandicap = seat.STATUS === 9;

                  const iconPos = !isAvailable
                    ? parseSeatIconPosition(seat)
                    : null;
                  return (
                    <div key={seat.SEATNO}>

                      {/* ================= SEAT ================= */}
                      {seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7 && (
                        <div
                          ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                          className={`absolute cursor-pointer transition-all hover:opacity-80 ${isFocused ? "ring-[6px] ring-[#dc2f02] ring-offset-2 z-50" : ""
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
                          <img
                            src={getRSeatImage(seat)}
                            className="w-full h-full"
                            alt=""
                          />
                          <span
                            className="absolute inset-0 font-medium flex items-center justify-center text-black drop-shadow"
                            style={{ fontSize: "30px" }}
                          >
                            {seat.VNAME}
                            <span> {isBooked && (
                              <div className="absolute w-15 bottom-8 left-5 h-[6px] bg-[#00B1B0] rounded-sm pointer-events-none"></div>
                            )}</span>
                          </span>
                        </div>
                      )}

                      {(seat.ICONTYPE === 1 || seat.ICONTYPE === 8) && (
                        <div
                          ref={(el) => (seatRefs.current[seat.SEATNO] = el)}
                          className={`absolute cursor-pointer rounded flex items-center justify-center  ${isFocused ? "ring-[6px] ring-[#dc2f02] ring-offset-2 z-50" : ""
                            } ${isHandicap
                              ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                              : isAvailable
                                ? "bg-linear-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f]"
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
                            className="text-gray-800 font-medium"
                            style={{ fontSize: "30px" }}
                          >
                            {seat.VNAME}
                            <span> {isBooked && (
                              <div className="absolute w-12 bottom-2 left-2 h-[6px] bg-[#00B1B0] rounded-sm pointer-events-none"></div>
                            )}</span>
                          </span>
                        </div>
                      )}

                      {/* ================= BOOKED ICON ================= */}
                      {iconPos && (
                        <img
                          src={seatUserIcon}
                          alt="Booked"
                          className="absolute pointer-events-none"
                          style={{
                            left: `${iconPos.left}px`,
                            top: `${iconPos.top}px`,
                            width: `30px`,
                            height: `30px`,


                          }}
                        />
                      )}

                    </div>
                  );
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