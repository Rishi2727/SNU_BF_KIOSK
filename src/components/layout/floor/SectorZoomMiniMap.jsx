import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const SectorZoomMiniMap = ({
  roomImage,
  mode,
  onSectorSelect,
  focusedSector,
  selectedSector,
  sectors = [],
  allSectors = [],
  seatBounds = null,
  displayDimensions = null,
  minimapScaleFactor = 0.1,
  isFocused = false,
  focusStage = null,
  isMinimapFocused,
  minimapFocusIndex,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const { t } = useTranslation();

  const focusRing = "border-[6px] border-[#dc2f02]";

  useEffect(() => {
    setImageLoaded(false);
    if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [roomImage]);

  const minimapDimensions =
    displayDimensions && displayDimensions.width && displayDimensions.height
      ? {
          width: Math.round(displayDimensions.width * minimapScaleFactor),
          height: Math.round(displayDimensions.height * minimapScaleFactor),
        }
      : { width: 250, height: 110 };

  if (!roomImage || !mode) {
    return (
      <div className="flex items-center justify-center h-[110px] w-[250px] bg-gray-200 rounded-lg">
        <span className="text-gray-500 text-sm">
          {t("No Image Available")}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300"
      style={{
        width: minimapDimensions.width,
        height: minimapDimensions.height,
      }}
    >
      {/* IMAGE */}
      <div
        className={`absolute inset-0 ${
          isMinimapFocused ? focusRing : "border-[6px] border-transparent"
        }`}
      >
        <img
          ref={imageRef}
          src={roomImage}
          alt="Room map"
          className="w-full h-full object-fill"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* SVG OVERLAY */}
      {imageLoaded && displayDimensions && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* 🔴 DEAD AREAS (outside seat bounds) */}
          {seatBounds &&
            (() => {
              const scaleX = minimapScaleFactor;
              const scaleY = minimapScaleFactor;

              const imageWidth = displayDimensions.width * scaleX;
              const imageHeight = displayDimensions.height * scaleY;

              const boundsX = seatBounds.minX * scaleX;
              const boundsY = seatBounds.minY * scaleY;
              const boundsWidth = seatBounds.width * scaleX;
              const boundsHeight = seatBounds.height * scaleY;

              return (
                <>
                  {boundsY > 0 && (
                    <rect
                      x="0"
                      y="0"
                      width={imageWidth}
                      height={boundsY}
                      fill="rgba(239,68,68,0.3)"
                    />
                  )}

                  {boundsY + boundsHeight < imageHeight && (
                    <rect
                      x="0"
                      y={boundsY + boundsHeight}
                      width={imageWidth}
                      height={imageHeight - (boundsY + boundsHeight)}
                      fill="rgba(239,68,68,0.3)"
                    />
                  )}

                  {boundsX > 0 && (
                    <rect
                      x="0"
                      y={boundsY}
                      width={boundsX}
                      height={boundsHeight}
                      fill="rgba(239,68,68,0.3)"
                    />
                  )}

                  {boundsX + boundsWidth < imageWidth && (
                    <rect
                      x={boundsX + boundsWidth}
                      y={boundsY}
                      width={imageWidth - (boundsX + boundsWidth)}
                      height={boundsHeight}
                      fill="rgba(239,68,68,0.3)"
                    />
                  )}
                </>
              );
            })()}

          {/* 🟦 SECTORS */}
          {allSectors.map((sector) => {
            const scaleX = minimapScaleFactor;
            const scaleY = minimapScaleFactor;

            const x = sector.uniqueX1 * scaleX;
            const y = sector.uniqueY1 * scaleY;
            const width = (sector.uniqueX2 - sector.uniqueX1) * scaleX;
            const height = (sector.uniqueY2 - sector.uniqueY1) * scaleY;

            const isSelected = sector.id === selectedSector;
            const isEnabled = sector.enabled;

            let fillColor, strokeColor, strokeWidth;

            if (isSelected) {
              fillColor = "rgba(255,255,255,0)";
              strokeColor = "#3b82f6";
              strokeWidth = "3";
            } else if (isEnabled) {
              fillColor = "rgba(59,130,246,0.3)";
              strokeColor = "#3b82f6";
              strokeWidth = "1";
            } else {
              fillColor = "rgba(239,68,68,0.3)";
              strokeColor = "none";
              strokeWidth = "0";
            }

            const enabledSectors = allSectors.filter((s) => s.enabled);
            const enabledIndex = enabledSectors.findIndex(
              (s) => s.id === sector.id
            );
            const isMinimapFocusedSector =
              isMinimapFocused && enabledIndex === minimapFocusIndex;

            return (
              <g
                key={sector.id}
                className={
                  isEnabled
                    ? "pointer-events-auto cursor-pointer"
                    : "pointer-events-none"
                }
                onClick={() => isEnabled && onSectorSelect(sector.id)}
              >
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                />

                {isMinimapFocusedSector && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={width + 6}
                    height={height + 6}
                    fill="none"
                    stroke="#1b98e0"
                    strokeWidth="4"
                  />
                )}

                {isSelected && (
                  <text
                    x={sector.centerX * scaleX}
                    y={sector.centerY * scaleY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white font-bold"
                    style={{
                      fontSize: Math.min(width, height) * 0.3,
                      textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
                    }}
                  >
                    {sector.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default SectorZoomMiniMap;
