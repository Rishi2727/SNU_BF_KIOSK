
// import { useEffect, useState, useRef } from "react";
// import { ImageBaseUrl } from "../../../services/api";
// import LoadingSpinner from "../../common/LoadingSpinner";
// import { useVoice } from "../../../context/voiceContext";
// import { useTranslation } from "react-i18next";
// import { getRoomConfig } from "../../../utils/config";
// import SectorZoomMiniMap from "./SectorZoomMiniMap.jsx";


// /* ================= SEAT IMAGE ================= */

// const getRSeatImage = (seat) => {
//   if (seat.ICONTYPE < 2 || seat.ICONTYPE > 7) return null;
//   const rNo = seat.ICONTYPE - 1;
//   const isDisabled =
//     seat.USECNT !== 0 || (seat.STATUS !== 1 && seat.STATUS !== 2);
//   return `${ImageBaseUrl}/SeatBtnR${rNo}${isDisabled ? "_Dis" : ""}.png`;
// };

// /* ================================================= */

// const RoomView = ({
//   selectedSector,
//   baseUrl,
//   seats,
//   loadingSeats,
//   imageTransform,
//   imageDimensions,
//   mainImageRef,
//   containerRef,
//   isPanning,
//   onMiniSectorClick,
//   onSeatClick,
//   onImageLoad,
//   focusedRegion,
//   focusStage 
// }) => {
//   const { speak, stop } = useVoice();
//   const { t } = useTranslation();

//   const safeTransform = imageTransform || { x: 0, y: 0, scale: 1 };
//   const roomConfig = getRoomConfig(selectedSector?.SECTORNO);

//   const [seatBounds, setSeatBounds] = useState(null);
//   const [sectors, setSectors] = useState([]);
//   const [allSectors, setAllSectors] = useState([]);
//   const [selectedMiniSectorLocal, setSelectedMiniSectorLocal] = useState(null);

//   /* ================= PARSE SEAT ================= */

//   const parseSeatPosition = (seat) => {
//     if (
//       !seat?.POSX ||
//       !seat?.POSY ||
//       !seat?.POSW ||
//       !seat?.POSH ||
//       !mainImageRef?.current ||
//       !imageDimensions?.naturalWidth
//     ) return null;

//     const img = mainImageRef.current;
//     const scaleX = img.clientWidth / imageDimensions.naturalWidth;
//     const scaleY = img.clientHeight / imageDimensions.naturalHeight;

//     return {
//       left: `${seat.POSX * scaleX}px`,
//       top: `${seat.POSY * scaleY}px`,
//       width: `${seat.POSW * scaleX}px`,
//       height: `${seat.POSH * scaleY}px`,
//     };
//   };

//   /* ================= SEAT BOUNDS ================= */

//   useEffect(() => {
//     if (!seats.length || !mainImageRef.current || !imageDimensions?.naturalWidth) return;

//     const img = mainImageRef.current;
//     const scaleX = img.clientWidth / imageDimensions.naturalWidth;
//     const scaleY = img.clientHeight / imageDimensions.naturalHeight;

//     let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

//     seats.forEach(seat => {
//       const x1 = seat.POSX * scaleX;
//       const y1 = seat.POSY * scaleY;
//       const x2 = (seat.POSX + seat.POSW) * scaleX;
//       const y2 = (seat.POSY + seat.POSH) * scaleY;

//       minX = Math.min(minX, x1);
//       minY = Math.min(minY, y1);
//       maxX = Math.max(maxX, x2);
//       maxY = Math.max(maxY, y2);
//     });

//     minX = Math.max(0, minX - roomConfig.SEAT_BOUNDS_MARGIN);
//     minY = Math.max(0, minY - roomConfig.SEAT_BOUNDS_MARGIN);
//     maxX = Math.min(img.clientWidth, maxX + roomConfig.SEAT_BOUNDS_MARGIN);
//     maxY = Math.min(img.clientHeight, maxY + roomConfig.SEAT_BOUNDS_MARGIN);

//     setSeatBounds({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
//   }, [seats, imageDimensions, roomConfig]);

//   /* ================= 🔥 DYNAMIC SECTOR CALC (same as example) ================= */

//   useEffect(() => {
//     if (!seatBounds || !containerRef.current || !mainImageRef.current) return;
//     if (!imageDimensions?.naturalWidth) return;

//     const container = containerRef.current;
//     const img = mainImageRef.current;
//     const scale = safeTransform.scale || 1;

//     const visibleWidth = container.clientWidth / scale;
//     const visibleHeight = container.clientHeight / scale;

//     const boundsWidth = seatBounds.width;
//     const boundsHeight = seatBounds.height;

//     const numCols = Math.ceil(boundsWidth / visibleWidth);
//     const numRows = Math.ceil(boundsHeight / visibleHeight);

//     const horizontalStep =
//       numCols > 1 ? (boundsWidth - visibleWidth) / (numCols - 1) : 0;

//     const verticalStep =
//       numRows > 1 ? (boundsHeight - visibleHeight) / (numRows - 1) : 0;

//     const scaleX = img.clientWidth / imageDimensions.naturalWidth;
//     const scaleY = img.clientHeight / imageDimensions.naturalHeight;

//     let sectorId = 1;
//     const calculated = [];
//     const all = [];

//     for (let row = 0; row < numRows; row++) {
//       for (let col = 0; col < numCols; col++) {

//         const x1 = seatBounds.minX + col * horizontalStep;
//         const y1 = seatBounds.minY + row * verticalStep;
//         const x2 = x1 + visibleWidth;
//         const y2 = y1 + visibleHeight;

//         let uniqueX1 = x1;
//         let uniqueX2 = x2;
//         let uniqueY1 = y1;
//         let uniqueY2 = y2;

//         if (col > 0) {
//           const prevX = seatBounds.minX + (col - 1) * horizontalStep;
//           uniqueX1 = (prevX + x1) / 2 + visibleWidth / 2;
//         }
//         if (col < numCols - 1) {
//           const nextX = seatBounds.minX + (col + 1) * horizontalStep;
//           uniqueX2 = (x1 + nextX) / 2 + visibleWidth / 2;
//         }
//         if (row > 0) {
//           const prevY = seatBounds.minY + (row - 1) * verticalStep;
//           uniqueY1 = (prevY + y1) / 2 + visibleHeight / 2;
//         }
//         if (row < numRows - 1) {
//           const nextY = seatBounds.minY + (row + 1) * verticalStep;
//           uniqueY2 = (y1 + nextY) / 2 + visibleHeight / 2;
//         }

//         const centerX = (uniqueX1 + uniqueX2) / 2;
//         const centerY = (uniqueY1 + uniqueY2) / 2;

//         const hasCompleteSeat = seats.some((s) => {
//           const sx1 = s.POSX * scaleX;
//           const sy1 = s.POSY * scaleY;
//           const sx2 = (s.POSX + s.POSW) * scaleX;
//           const sy2 = (s.POSY + s.POSH) * scaleY;
//           return sx1 >= x1 && sx2 <= x2 && sy1 >= y1 && sy2 <= y2;
//         });

//         const sector = {
//           id: sectorId,
//           row,
//           col,
//           x1: Math.round(x1),
//           y1: Math.round(y1),
//           x2: Math.round(x2),
//           y2: Math.round(y2),
//           uniqueX1: Math.round(uniqueX1),
//           uniqueY1: Math.round(uniqueY1),
//           uniqueX2: Math.round(uniqueX2),
//           uniqueY2: Math.round(uniqueY2),
//           centerX: Math.round(centerX),
//           centerY: Math.round(centerY),
//           enabled: hasCompleteSeat,
//         };

//         all.push(sector);
//         if (hasCompleteSeat) calculated.push(sector);
//         sectorId++;
//       }
//     }

//     setAllSectors(all);
//     setSectors(calculated);

//     if (calculated.length && !selectedMiniSectorLocal) {
//       setSelectedMiniSectorLocal(calculated[0]);
//       onMiniSectorClick(calculated[0]);
//     }

//   }, [seatBounds, seats, imageDimensions, safeTransform.scale]);

//   /* ================= RENDER ================= */

//   return (
//     <>
//       {loadingSeats && <LoadingSpinner />}

//       {/* ======= SAME SectorZoomMiniMap ======= */}
//       {!loadingSeats && selectedSector?.SECTOR_IMAGE && (
//         <div className="absolute top-2 right-2 z-30">
//           <SectorZoomMiniMap
//             roomImage={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
//             mode="room"
//             onSectorSelect={(sectorId) => {
//               const sec = sectors.find(s => s.id === sectorId);
//               if (!sec) return;
//               setSelectedMiniSectorLocal(sec);
//               onMiniSectorClick(sec);
//             }}
//             focusedSector={null}
//             selectedSector={selectedMiniSectorLocal?.id}
//             sectors={sectors}
//             allSectors={allSectors}
//             seatBounds={seatBounds}
//             displayDimensions={{
//               width: mainImageRef.current?.clientWidth || 0,
//               height: mainImageRef.current?.clientHeight || 0
//             }}
//             minimapScaleFactor={roomConfig.MINIMAP_SCALE_FACTOR}
//             isFocused={focusedRegion === "mini_map"}
//             focusStage="sector"
//             isMinimapFocused={focusedRegion === "mini_map"}
//             minimapFocusIndex={-1}
//           />
//         </div>
//       )}

//       {/* ======= ROOM IMAGE ======= */}
//  <div
//         ref={containerRef}
//         className="w-full h-full flex items-center justify-center overflow-hidden relative"
//       >
//         {selectedSector?.SECTOR_IMAGE ? (
//           <div
//             className={`relative border transition-transform ease-out ${isPanning ? "duration-0 cursor-grabbing" : "duration-500 cursor-pointer"
//               }`}
//             style={{
//               transform: `translate(${safeTransform.x}px, ${safeTransform.y}px) scale(${safeTransform.scale})`,
//               transformOrigin: "center center",
//               display: "flex",
//               alignItems: "center",
//               justifyContent: "center",
//             }}
//           >
//             <div className="relative w-full h-full flex items-center justify-center">
//               <img
//                 key={selectedSector?.SECTOR_IMAGE}
//                 ref={mainImageRef}
//                 src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
//                 alt=""
//                 className="select-none max-w-full max-h-full object-contain"
//                 onLoad={onImageLoad}
//                 draggable={false}
//               />

//               {seats.map((seat) => {
//                 const isFocusedSeat =
//                   focusStage === "seats" &&
//                   focusableSeats?.[seatCursor]?.SEATNO === seat.SEATNO;

//                 const position = parseSeatPosition(seat);
//                 if (!position) return null;

//                 const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
//                 const isHandicap = seat.STATUS === 9;

//                 if (seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7) {
//                   const src = getRSeatImage(seat);
//                   return (
//                     <div
//                       key={seat.SEATNO}
//                       className={`absolute pointer-events-auto cursor-pointer transition-all
//                         ${isFocusedSeat ? "ring-4 ring-red-500 scale-110 z-40" : "hover:opacity-80"}`}
//                       style={{
//                         left: position.left,
//                         top: position.top,
//                         width: position.width,
//                         height: position.height
//                       }}
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         if (!isPanning) onSeatClick(seat);
//                       }}
//                     >
//                       <img src={src} className="w-full h-full" alt="" />
//                       <span
//                         className="absolute inset-0 flex items-center text-[7px] justify-center font-normal text-black drop-shadow pointer-events-none"
//                       >
//                         {seat.VNAME}
//                       </span>
//                     </div>
//                   );
//                 }

//                 if (seat.ICONTYPE === 1 || seat.ICONTYPE === 8) {
//                   return (
//                     <div
//                       key={seat.SEATNO}
//                       className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isHandicap
//                         ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
//                         : isAvailable
//                           ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f]"
//                           : "bg-[#e5e1c4]"
//                         }`}
//                       style={{
//                         left: position.left,
//                         top: position.top,
//                         width: position.width,
//                         height: position.height
//                       }}
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         if (!isPanning) onSeatClick(seat);
//                       }}
//                     >
//                       <span className="font-normal text-gray-800 text-[8px]">
//                         {seat.VNAME}
//                       </span>
//                     </div>
//                   );
//                 }

//                 return null;
//               })}
//             </div>
//           </div>
//         ) : (
//           <div className="text-gray-400 text-xl">No image available</div>
//         )}
//       </div>
//     </>
//   );
// };

// export default RoomView;


import { useEffect, useState, useRef } from "react";
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
  imageTransform,
  imageDimensions,
  mainImageRef,
  containerRef,
  isPanning,
  onMiniSectorClick,
  onSeatClick,
  onImageLoad,
  focusedRegion,
  focusStage 
}) => {
  const { speak, stop } = useVoice();
  const { t } = useTranslation();

  const safeTransform = imageTransform || { x: 0, y: 0, scale: 1 };
  const roomConfig = getRoomConfig(selectedSector?.SECTORNO);

  const miniMapRef = useRef(null); // ✅ ADDED

  const [seatBounds, setSeatBounds] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [allSectors, setAllSectors] = useState([]);
  const [selectedMiniSectorLocal, setSelectedMiniSectorLocal] = useState(null);

  /* ================= PARSE SEAT ================= */

  const parseSeatPosition = (seat) => {
    if (
      !seat?.POSX ||
      !seat?.POSY ||
      !seat?.POSW ||
      !seat?.POSH ||
      !mainImageRef?.current ||
      !imageDimensions?.naturalWidth
    ) return null;

    const img = mainImageRef.current;
    const scaleX = img.clientWidth / imageDimensions.naturalWidth;
    const scaleY = img.clientHeight / imageDimensions.naturalHeight;

    return {
      left: `${seat.POSX * scaleX}px`,
      top: `${seat.POSY * scaleY}px`,
      width: `${seat.POSW * scaleX}px`,
      height: `${seat.POSH * scaleY}px`,
    };
  };

  /* ================= SEAT BOUNDS ================= */

  useEffect(() => {
    if (!seats.length || !mainImageRef.current || !imageDimensions?.naturalWidth) return;

    const img = mainImageRef.current;
    const scaleX = img.clientWidth / imageDimensions.naturalWidth;
    const scaleY = img.clientHeight / imageDimensions.naturalHeight;

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
    maxX = Math.min(img.clientWidth, maxX + roomConfig.SEAT_BOUNDS_MARGIN);
    maxY = Math.min(img.clientHeight, maxY + roomConfig.SEAT_BOUNDS_MARGIN);

    setSeatBounds({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
  }, [seats, imageDimensions, roomConfig]);

  /* ================= 🔥 DYNAMIC SECTOR CALC ================= */

  useEffect(() => {
    if (!seatBounds || !containerRef.current || !mainImageRef.current) return;
    if (!imageDimensions?.naturalWidth) return;

    const container = containerRef.current;
    const img = mainImageRef.current;
    const scale = safeTransform.scale || 1;

    const visibleWidth = container.clientWidth / scale;
    const visibleHeight = container.clientHeight / scale;

    const boundsWidth = seatBounds.width;
    const boundsHeight = seatBounds.height;

    const numCols = Math.ceil(boundsWidth / visibleWidth);
    const numRows = Math.ceil(boundsHeight / visibleHeight);

    const horizontalStep =
      numCols > 1 ? (boundsWidth - visibleWidth) / (numCols - 1) : 0;

    const verticalStep =
      numRows > 1 ? (boundsHeight - visibleHeight) / (numRows - 1) : 0;

    const scaleX = img.clientWidth / imageDimensions.naturalWidth;
    const scaleY = img.clientHeight / imageDimensions.naturalHeight;

    let sectorId = 1;
    const calculated = [];
    const all = [];

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {

        const x1 = seatBounds.minX + col * horizontalStep;
        const y1 = seatBounds.minY + row * verticalStep;
        const x2 = x1 + visibleWidth;
        const y2 = y1 + visibleHeight;

        let uniqueX1 = x1;
        let uniqueX2 = x2;
        let uniqueY1 = y1;
        let uniqueY2 = y2;

        if (col > 0) {
          const prevX = seatBounds.minX + (col - 1) * horizontalStep;
          uniqueX1 = (prevX + x1) / 2 + visibleWidth / 2;
        }
        if (col < numCols - 1) {
          const nextX = seatBounds.minX + (col + 1) * horizontalStep;
          uniqueX2 = (x1 + nextX) / 2 + visibleWidth / 2;
        }
        if (row > 0) {
          const prevY = seatBounds.minY + (row - 1) * verticalStep;
          uniqueY1 = (prevY + y1) / 2 + visibleHeight / 2;
        }
        if (row < numRows - 1) {
          const nextY = seatBounds.minY + (row + 1) * verticalStep;
          uniqueY2 = (y1 + nextY) / 2 + visibleHeight / 2;
        }

        const centerX = (uniqueX1 + uniqueX2) / 2;
        const centerY = (uniqueY1 + uniqueY2) / 2;

        const hasCompleteSeat = seats.some((s) => {
          const sx1 = s.POSX * scaleX;
          const sy1 = s.POSY * scaleY;
          const sx2 = (s.POSX + s.POSW) * scaleX;
          const sy2 = (s.POSY + s.POSH) * scaleY;
          return sx1 >= x1 && sx2 <= x2 && sy1 >= y1 && sy2 <= y2;
        });

        const sector = {
          id: sectorId,
          row,
          col,
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
        };

        all.push(sector);
        if (hasCompleteSeat) calculated.push(sector);
        sectorId++;
      }
    }

    setAllSectors(all);
    setSectors(calculated);

    if (calculated.length && !selectedMiniSectorLocal) {
      setSelectedMiniSectorLocal(calculated[0]);
      onMiniSectorClick(calculated[0]);
    }

  }, [seatBounds, seats, imageDimensions, safeTransform.scale]);

  /* ================= OLD ENGINE VISIBILITY ================= */

  const isSeatVisibleByOverlap = (seat, sector) => {
    if (!sector || !mainImageRef.current) return true;

    const img = mainImageRef.current;
    const scaleX = img.clientWidth / imageDimensions.naturalWidth;
    const scaleY = img.clientHeight / imageDimensions.naturalHeight;

    const x1 = seat.POSX * scaleX;
    const y1 = seat.POSY * scaleY;
    const x2 = (seat.POSX + seat.POSW) * scaleX;
    const y2 = (seat.POSY + seat.POSH) * scaleY;

    const seatArea = (x2 - x1) * (y2 - y1);

    const ox1 = Math.max(x1, sector.x1);
    const oy1 = Math.max(y1, sector.y1);
    const ox2 = Math.min(x2, sector.x2);
    const oy2 = Math.min(y2, sector.y2);

    if (ox1 < ox2 && oy1 < oy2) {
      const overlap = (ox2 - ox1) * (oy2 - oy1);
      return overlap / seatArea >= (1 - roomConfig.SEAT_OVERLAP_THRESHOLD);
    }

    return false;
  };

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

  /* ================= RENDER ================= */

  return (
    <>
      {loadingSeats && <LoadingSpinner />}

      {!loadingSeats && selectedSector?.SECTOR_IMAGE && (
        <div ref={miniMapRef} className="absolute top-2 right-2 z-30">
          <SectorZoomMiniMap
            roomImage={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
            mode="room"
            onSectorSelect={(sectorId) => {
              const sec = sectors.find(s => s.id === sectorId);
              if (!sec) return;
              setSelectedMiniSectorLocal(sec);
              onMiniSectorClick(sec);
            }}
            focusedSector={null}
            selectedSector={selectedMiniSectorLocal?.id}
            sectors={sectors}
            allSectors={allSectors}
            seatBounds={seatBounds}
            displayDimensions={{
              width: mainImageRef.current?.clientWidth || 0,
              height: mainImageRef.current?.clientHeight || 0
            }}
            minimapScaleFactor={roomConfig.MINIMAP_SCALE_FACTOR}
            isFocused={focusedRegion === "mini_map"}
            focusStage="sector"
            isMinimapFocused={focusedRegion === "mini_map"}
            minimapFocusIndex={-1}
          />
        </div>
      )}

       <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden relative"
      >
        {selectedSector?.SECTOR_IMAGE ? (
          <div
            className={`relative border transition-transform ease-out ${isPanning ? "duration-0 cursor-grabbing" : "duration-500 cursor-pointer"
              }`}
            style={{
              transform: `translate(${safeTransform.x}px, ${safeTransform.y}px) scale(${safeTransform.scale})`,
              transformOrigin: "center center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                key={selectedSector?.SECTOR_IMAGE}
                ref={mainImageRef}
                src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
                alt=""
                className="select-none max-w-full max-h-full object-contain"
                onLoad={onImageLoad}
                draggable={false}
              />

              {seats.map((seat) => {
                const isFocusedSeat =
                  focusStage === "seats" &&
                  focusableSeats?.[seatCursor]?.SEATNO === seat.SEATNO;

                const position = parseSeatPosition(seat);
                if (!position) return null;

                const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
                const isHandicap = seat.STATUS === 9;

                if (seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7) {
                  const src = getRSeatImage(seat);
                  return (
                    <div
                      key={seat.SEATNO}
                      className={`absolute pointer-events-auto cursor-pointer transition-all
                        ${isFocusedSeat ? "ring-4 ring-red-500 scale-110 z-40" : "hover:opacity-80"}`}
                      style={{
                        left: position.left,
                        top: position.top,
                        width: position.width,
                        height: position.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPanning) onSeatClick(seat);
                      }}
                    >
                      <img src={src} className="w-full h-full" alt="" />
                      <span
                        className="absolute inset-0 flex items-center text-[7px] justify-center font-normal text-black drop-shadow pointer-events-none"
                      >
                        {seat.VNAME}
                      </span>
                    </div>
                  );
                }

                if (seat.ICONTYPE === 1 || seat.ICONTYPE === 8) {
                  return (
                    <div
                      key={seat.SEATNO}
                      className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isHandicap
                        ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                        : isAvailable
                          ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f]"
                          : "bg-[#e5e1c4]"
                        }`}
                      style={{
                        left: position.left,
                        top: position.top,
                        width: position.width,
                        height: position.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPanning) onSeatClick(seat);
                      }}
                    >
                      <span className="font-normal text-gray-800 text-[8px]">
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
    </>
  );
};

export default RoomView;

