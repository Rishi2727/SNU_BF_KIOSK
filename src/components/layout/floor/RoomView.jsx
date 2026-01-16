import { useEffect } from "react";
import { ImageBaseUrl } from "../../../services/api";
import LoadingSpinner from "../../common/LoadingSpinner";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";

const getRSeatImage = (seat) => {
  if (seat.ICONTYPE < 2 || seat.ICONTYPE > 7) return null;
  const rNo = seat.ICONTYPE - 1;
  const isDisabled =
    seat.USECNT !== 0 || (seat.STATUS !== 1 && seat.STATUS !== 2);
  return `${ImageBaseUrl}/SeatBtnR${rNo}${isDisabled ? "_Dis" : ""}.png`;
};

const RoomView = ({
  selectedSector,
  baseUrl,
  seats,
  loadingSeats,
  selectedMiniSector,
  imageTransform,
  miniMapUrl,
  miniMapError,
  layout,
  seatFontScale,
  imageDimensions,
  mainImageRef,
  containerRef,
  isZoomed,
  isPanning,
  onMiniSectorClick,
  onMainImageClick,
  onSeatClick,
  onImageLoad,
  onMiniMapError,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  miniMapCursor,
  focusStage,
  seatCursor,
  
}) => {

    const { speak, stop } = useVoice();
    const { t } = useTranslation();
  
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
        speak(t("speech.This screen is the Seat selection screen."));
      };
  
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [speak, stop, t]);

  /* ===================================================== 
     PARSE SEAT POSITION 
  ===================================================== */
  const focusableSeats = seats.filter(
  (s) =>
    s.POSX &&
    s.POSY &&
    s.USECNT === 0 &&
    (s.STATUS === 1 || s.STATUS === 2) // ✅ only selectable seats
);
  const parseSeatPosition = (seat) => {
    if (
      !seat?.POSX ||
      !seat?.POSY ||
      !seat?.POSW ||
      !seat?.POSH ||
      !mainImageRef?.current ||
      !imageDimensions.naturalWidth
    ) {
      return null;
    }

    const img = mainImageRef.current;
    const renderedWidth = img.clientWidth;
    const renderedHeight = img.clientHeight;

    const scaleX = renderedWidth / imageDimensions.naturalWidth;
    const scaleY = renderedHeight / imageDimensions.naturalHeight;

    return {
      left: `${seat.POSX * scaleX}px`,
      top: `${seat.POSY * scaleY}px`,
      width: `${seat.POSW * scaleX}px`,
      height: `${seat.POSH * scaleY}px`,
    };
  };


  /* ===================================================== 
     RENDER 
  ===================================================== */
  return (
    <>
      {/* ================= MINI MAP ================= */}
      {loadingSeats ? (
        <LoadingSpinner />
      ) :
        miniMapUrl && layout && !miniMapError && (
          <div className="absolute top-0 right-0 z-30">
            <div className="relative rounded shadow-2xl bg-black/20 p-1">
              <img
                src={miniMapUrl}
                alt="Mini Map"
                className="w-80 rounded opacity-90"
                onError={onMiniMapError}
              />
              <div
                className="absolute inset-0 p-1"
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                  gridTemplateColumns: selectedSector?.SECTORNO === 16301
                    ? "1fr 1.2fr"
                    : `repeat(${layout.cols}, 1fr)`,
                }}
              >
                {layout.sectors.map((sector, index) => {
                  const isFocused = index === miniMapCursor;
                  const isSelected = selectedMiniSector?.id === sector.id;

                  return (
                    <button
                      key={sector.id}
                      style={{
                        gridRow: sector.row + 1,
                        gridColumn: sector.col + 1,
                      }}
                      onClick={() => onMiniSectorClick(sector)}
                      className={`border transition-all duration-200

        ${isSelected ? " bg-blue-500/40" : " hover:bg-white/20"}
      `}
                    />
                  );
                })}

              </div>
            </div>
          </div>
        )}

      {/* ================= MAIN IMAGE WITH SEATS ================= */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden relative"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {selectedSector?.SECTOR_IMAGE ? (
          <div
            className={`relative border transition-transform ease-out ${isPanning ? 'duration-0 cursor-grabbing' : 'duration-500 cursor-pointer'
              } ${isZoomed && !isPanning ? 'cursor-grab' : ''}`}
            style={{
              transform: `translate(${imageTransform.x}%, ${imageTransform.y}%) scale(${imageTransform.scale})`,
              transformOrigin: "center center",
              ...(isZoomed
                ? {
                  // ✅ ZOOM MODE → real size (allow width to grow)
                  width: "auto",
                  height: "auto",
                  maxWidth: "none",
                  maxHeight: "none",
                }
                : {
                  // ✅ NORMAL MODE → fit container
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
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
                onClick={(e) => {
                  if (!isPanning) onMainImageClick(e);
                }}
              />

              {/* Seat Markers */}
              {seats.map((seat) => {
                const isFocusedSeat =
  focusStage === "seats" &&
  focusableSeats?.[seatCursor]?.SEATNO === seat.SEATNO;
                const position = parseSeatPosition(seat);
                if (!position) return null;

                const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
                const isHandicap = seat.STATUS === 9;

                // ICONTYPE 2-7: Image-based seats
                if (seat.ICONTYPE >= 2 && seat.ICONTYPE <= 7) {
                  const src = getRSeatImage(seat);
                  return (
                    <div
                      key={seat.SEATNO}
                      className={`absolute pointer-events-auto cursor-pointer transition-all
    ${isFocusedSeat ? "ring-4 ring-red-500 scale-110 z-40" : "hover:opacity-80"}
  `}

                      style={{
                        left: position.left,
                        top: position.top,
                        width: position.width,
                        height: position.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPanning) {
                          onSeatClick(seat);
                        }
                      }}
                    >
                      <img src={src} className="w-full h-full" alt="" />
                      <span
                        style={{ fontSize: `${5 * seatFontScale}px` }}
                        className="absolute inset-0 flex items-center justify-center font-normal text-black drop-shadow pointer-events-none"
                      >
                        {seat.VNAME}
                      </span>
                      {!isAvailable && seat.XFULL && (
                        <div
                          className="absolute bottom-2 left-1 h-[2px] bg-teal-500"
                          style={{
                            width: `${Math.min(seat.XFULL * 0.6, 100)}%`,
                            maxWidth: position.width - 15,
                          }}
                        />
                      )}
                    </div>
                  );
                }

                // ICONTYPE 1: Standard seats
                if (seat.ICONTYPE === 1) {
                  return (
                    <div
                      key={seat.SEATNO}
                      className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isHandicap
                        ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                        : isAvailable
                          ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f] shadow-[inset_0_1px_0_0_#fce2c1]"
                          : "bg-[#e5e1c4] border-0"
                        }`}
                      style={{
                        left: position.left,
                        top: position.top,
                        width: position.width,
                        height: position.height
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isPanning) {
                          onSeatClick(seat);
                        }
                      }}
                    >
                      <span
                        style={{ fontSize: `${6 * seatFontScale}px` }}
                        className={`font-normal text-gray-800 ${isAvailable ? " drop-shadow-[0_1px_0_#cc9f52]" : ""
                          }`}
                      >
                        {seat.VNAME}
                      </span>
                      {!isAvailable && seat.XFULL && (
                        <div
                          className="absolute bottom-[1px] left-[2px] h-[2px] bg-teal-500"
                          style={{
                            width: `${Math.min(seat.XFULL * 0.8, 100)}%`,
                            maxWidth: position.width - 10,
                          }}
                        />
                      )}
                    </div>
                  );
                }

                // ICONTYPE 8: Alternative seat style
                if (seat.ICONTYPE === 8) {
                  return (
                    <div
                      key={seat.SEATNO}
                      className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${isHandicap
                        ? 'bg-[url("http://k-rsv.snu.ac.kr:8011/NEW_SNU_BOOKING/commons/images/kiosk/SeatBtn_disable.png")] bg-contain bg-no-repeat bg-center'
                        : isAvailable
                          ? "bg-gradient-to-b from-[#ffc477] to-[#fb9e25] border border-[#eeb44f] shadow-[inset_0_1px_0_0_#fce2c1]"
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
                        if (!isPanning) {
                          onSeatClick(seat);
                        }
                      }}
                    >
                      <span
                        style={{ fontSize: `${5 * seatFontScale}px` }}
                        className="font-normal text-gray-800"
                      >
                        {seat.VNAME}
                      </span>
                      {!isAvailable && seat.XFULL && (
                        <div
                          className="absolute bottom-[4px] left-[2px] h-[2px] bg-teal-500"
                          style={{
                            width: `${Math.min(seat.XFULL * 0.8, 100)}%`,
                            maxWidth: position.width - 10,
                          }}
                        />
                      )}
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
