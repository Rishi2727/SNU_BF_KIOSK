import { ImageBaseUrl } from "../../../services/api";
import LoadingSpinner from "../../common/LoadingSpinner";

const getRSeatImage = (seat) => {
  if (seat.ICONTYPE < 2 || seat.ICONTYPE > 7) return null;
  const rNo = seat.ICONTYPE - 1;
  const isDisabled = seat.USECNT !== 0 || (seat.STATUS !== 1 && seat.STATUS !== 2);
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
  onMiniSectorClick,
  onMainImageClick,
  onSeatClick,
  onImageLoad,
  onMiniMapError,
}) => {
  /* ===================================================== 
     PARSE SEAT POSITION 
  ===================================================== */
  const parseSeatPosition = (seat) => {
    if (!seat?.POSX || !seat?.POSY || !imageDimensions.naturalWidth) return null;

    const leftPercent = (seat.POSX / imageDimensions.naturalWidth) * 100;
    const topPercent = (seat.POSY / imageDimensions.naturalHeight) * 100;
    const widthPercent = (seat.POSW / imageDimensions.naturalWidth) * 100;
    const heightPercent = (seat.POSH / imageDimensions.naturalHeight) * 100;

    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      width: `${widthPercent}%`,
      height: `${heightPercent}%`
    };
  };

  /* ===================================================== 
     RENDER 
  ===================================================== */
  return (
    <>
      {/* ================= MINI MAP ================= */}
      {miniMapUrl && layout && !miniMapError && (
        <div className="absolute top-0 right-0 z-30">
          <div className="relative rounded-lg shadow-2xl bg-black/20 p-1">
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
              {layout.sectors.map((sector) => (
                <button
                  key={sector.id}
                  style={{ gridRow: sector.row + 1, gridColumn: sector.col + 1 }}
                  onClick={() => onMiniSectorClick(sector)}
                  className={`border transition-all duration-200 ${
                    selectedMiniSector?.id === sector.id 
                      ? "border-blue-400 bg-blue-500/40" 
                      : "border-white/20 hover:bg-white/20"
                  }`}
                  title={sector.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= MAIN IMAGE WITH SEATS ================= */}
      <div ref={containerRef} className="w-full h-full flex items-center justify-center overflow-hidden relative">
        {loadingSeats ? (
          <LoadingSpinner />
        ) : selectedSector?.SECTOR_IMAGE ? (
          <div
            className="relative transition-transform duration-500 ease-out cursor-pointer"
            style={{
              transform: `translate(${imageTransform.x}%, ${imageTransform.y}%) scale(${imageTransform.scale})`,
              transformOrigin: "center center",
            }}
            onClick={onMainImageClick}
          >
            <img
              ref={mainImageRef}
              src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
              alt=""
              className="object-contain max-w-full max-h-full pointer-events-none"
              onLoad={onImageLoad}
            />

            {/* Seat Markers */}
            {seats.map((seat) => {
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
                    className="absolute pointer-events-auto cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ 
                      left: position.left, 
                      top: position.top, 
                      width: position.width, 
                      height: position.height 
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeatClick(seat);
                    }}
                  >
                    <img src={src} className="w-full h-full" alt="" />
                    <span 
                      style={{ fontSize: `${6 * seatFontScale}px` }} 
                      className="absolute inset-0 flex items-center justify-center text-[6px] font-normal text-black drop-shadow pointer-events-none"
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
                    className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${
                      isHandicap
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
                      onSeatClick(seat);
                    }}
                  >
                    <span 
                      style={{ fontSize: `${7 * seatFontScale}px` }} 
                      className={`text-[7px] font-normal text-gray-800 ${
                        isAvailable ? " drop-shadow-[0_1px_0_#cc9f52]" : ""
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
                    className={`absolute pointer-events-auto cursor-pointer rounded transition-all hover:scale-105 flex items-center justify-center ${
                      isHandicap
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
                      onSeatClick(seat);
                    }}
                  >
                    <span 
                      style={{ fontSize: `${6 * seatFontScale}px` }} 
                      className="text-[6px] font-normal text-gray-800"
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
        ) : (
          <div className="text-gray-400 text-xl">No image available</div>
        )}
      </div>
    </>
  );
};

export default RoomView;