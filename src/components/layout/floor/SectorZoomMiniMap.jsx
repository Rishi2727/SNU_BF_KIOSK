import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

const SectorZoomMiniMap = ({
  roomImage,
  mode,
  onSectorSelect,
  focusedSector,
  selectedSector,
  sectors = [],
  allSectors = [], // All sectors including disabled ones
  seatBounds = null,
  displayDimensions = null,
  minimapScaleFactor = 0.1,
  isFocused = false,
  focusStage = null,
  isMinimapFocused,
  minimapFocusIndex

}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const { t } = useTranslation();
  const focusRing = "border-[6px] border-[#dc2f02]";
  useEffect(() => {
    setImageLoaded(false);

    // Check if image is already loaded (cached)
    if (imageRef.current?.complete) {
      setImageLoaded(true);
    }
  }, [roomImage]);

  // Calculate minimap dimensions based on display dimensions and scale factor
  const minimapDimensions = displayDimensions && displayDimensions.width && displayDimensions.height
    ? {
      width: Math.round(displayDimensions.width * minimapScaleFactor),
      height: Math.round(displayDimensions.height * minimapScaleFactor)
    }
    : null;

  if (!roomImage || !mode) {
    return (
      <div className="flex items-center justify-center h-[110px] w-[250px] bg-gray-200 rounded-lg">
        <span className="text-gray-500 text-sm">{t('No Image Available')}</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300 z-50"
      style={minimapDimensions ? {
        width: `${minimapDimensions.width}px`,
        height: `${minimapDimensions.height}px`
      } : {
        width: '250px',
        height: '110px'
      }}
    >
      {/* Image container */}
      <div className={`absolute inset-0  ${isMinimapFocused ? focusRing : ""}`}>
        <img
          ref={imageRef}
          src={roomImage}
          alt={mode === "room" ? "Room map" : "Floor map"}
          className="w-full h-full object-fill"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Sector grid overlay */}
      {imageLoaded && displayDimensions && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {/* Render red overlay for areas outside seat bounds (dead areas) */}
          {seatBounds && (() => {
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
                {/* Top dead area */}
                {boundsY > 0 && (
                  <rect x="0" y="0" width={imageWidth} height={boundsY} fill="rgba(239, 68, 68, 0.3)" className="pointer-events-none" />
                )}
                {/* Bottom dead area */}
                {(boundsY + boundsHeight) < imageHeight && (
                  <rect x="0" y={boundsY + boundsHeight} width={imageWidth} height={imageHeight - (boundsY + boundsHeight)} fill="rgba(239, 68, 68, 0.3)" className="pointer-events-none" />
                )}
                {/* Left dead area */}
                {boundsX > 0 && (
                  <rect x="0" y={boundsY} width={boundsX} height={boundsHeight} fill="rgba(239, 68, 68, 0.3)" className="pointer-events-none" />
                )}
                {/* Right dead area */}
                {(boundsX + boundsWidth) < imageWidth && (
                  <rect x={boundsX + boundsWidth} y={boundsY} width={imageWidth - (boundsX + boundsWidth)} height={boundsHeight} fill="rgba(239, 68, 68, 0.3)" className="pointer-events-none" />
                )}
              </>
            );
          })()}

          {/* Then render sectors */}
          {allSectors.map((sector) => {
            if (!containerRef.current || !imageRef.current) return null;

            const scaleX = minimapScaleFactor;
            const scaleY = minimapScaleFactor;

            // Use unique bounds to avoid overlap
            const x = sector.uniqueX1 * scaleX;
            const y = sector.uniqueY1 * scaleY;
            const width = (sector.uniqueX2 - sector.uniqueX1) * scaleX;
            const height = (sector.uniqueY2 - sector.uniqueY1) * scaleY;

            const isSelected = sector.id === selectedSector;
            const isFocusedSector = isFocused && focusStage === "sector" && sector.id === focusedSector;
            const isEnabled = sector.enabled;

            // Determine fill color based on state
            let fillColor, strokeColor, strokeWidth;
            if (isSelected) {
              // Selected: clear with border
              fillColor = "rgba(255, 255, 255, 0)";
              strokeColor = "#3b82f6";
              strokeWidth = "3";
            } else if (isEnabled) {
              // Enabled but not selected: blue overlay
              fillColor = "rgba(59, 130, 246, 0.3)";
              strokeColor = "#3b82f6";
              strokeWidth = "1";
            } else {
              // Disabled: red overlay (DEAD ZONE - sector without seats)
              fillColor = "rgba(239, 68, 68, 0.3)";
              strokeColor = "none";
              strokeWidth = "0";
            }
            const enabledSectors = allSectors.filter(s => s.enabled);

            let isMinimapFocusedSector = false;

            if (sector.enabled) {
              const enabledIndex = enabledSectors.findIndex(s => s.id === sector.id);
              isMinimapFocusedSector =
                isMinimapFocused && enabledIndex === minimapFocusIndex;
            }

            return (
              <g key={sector.id} className={isEnabled ? "pointer-events-auto cursor-pointer" : "pointer-events-none"} onClick={() => isEnabled && onSectorSelect(sector.id)}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  className="transition-all duration-200"
                />
               { sector.enabled && isMinimapFocusedSector && (
                  <rect
                    x={x - 3}
                    y={y - 3}
                    width={width + 6}
                    height={height + 6}
                    fill="none"
                    stroke="#1b98e0"
                    strokeWidth="4"
                    className="pointer-events-none"
                  />
                )}
                {isSelected && (
                  <text
                    x={(sector.centerX) * scaleX}
                    y={(sector.centerY) * scaleY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-bold fill-white"
                    style={{
                      fontSize: Math.min(width, height) * 0.3,
                      textShadow: '2px 2px 4px rgba(0,0,0,0.9)',
                      pointerEvents: 'none'
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