import { useEffect, useState } from "react";
import { miniMapBaseUrl, getSeatList } from "../../../services/api";
import LoadingSpinner from "../../common/LoadingSpinner";

const MINI_MAP_LAYOUT = {
  16101: {
    rows: 2,
    cols: 3,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 0, col: 2, label: "Zone C" },
      { id: "D", row: 1, col: 0, label: "Zone D" },
      { id: "E", row: 1, col: 1, label: "Zone E" },
      { id: "F", row: 1, col: 2, label: "Zone F" },
    ],
  },
  16301: {
    rows: 2,
    cols: 1,
    sectors: [
      { id: "TOP", row: 0, col: 0, label: "Top Area" },
      { id: "BOTTOM", row: 1, col: 0, label: "Bottom Area" },
    ],
  },
  17201: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
  17202: {
    rows: 3,
    cols: 3,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 0, col: 2, label: "Zone C" },
      { id: "D", row: 1, col: 0, label: "Zone D" },
      { id: "E", row: 1, col: 1, label: "Zone E" },
      { id: "F", row: 1, col: 2, label: "Zone F" },
      { id: "G", row: 2, col: 0, label: "Zone G" },
      { id: "H", row: 2, col: 1, label: "Zone H" },
      { id: "I", row: 2, col: 2, label: "Zone I" },
    ],
  },
  17101: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
  17301: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
  18202: {
    rows: 3,
    cols: 3,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 0, col: 2, label: "Zone C" },
      { id: "D", row: 1, col: 0, label: "Zone D" },
      { id: "E", row: 1, col: 1, label: "Zone E" },
      { id: "F", row: 1, col: 2, label: "Zone F" },
      { id: "G", row: 2, col: 0, label: "Zone G" },
      { id: "H", row: 2, col: 1, label: "Zone H" },
      { id: "I", row: 2, col: 2, label: "Zone I" },
    ],
  },
  18201: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
  18101: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
  18301: {
    rows: 2,
    cols: 2,
    sectors: [
      { id: "A", row: 0, col: 0, label: "Zone A" },
      { id: "B", row: 0, col: 1, label: "Zone B" },
      { id: "C", row: 1, col: 0, label: "Zone C" },
      { id: "D", row: 1, col: 1, label: "Zone D" },
    ],
  },
};

const MINIMAP_CONFIG = {
  16101: "Mapmini_6F_Multimedia.png",
  16301: "Mapmini_6F_Computer.png",
  17201: "Mapmini_7F_A1.png",
  17202: "Mapmini_7F_A2.png",
  17101: "Mapmini_7F_Notebook.png",
  17301: "Mapmini_7F_B.png",
  18201: "Mapmini_8F_A1.png",
  18202: "Mapmini_8F_A2.png",
  18101: "Mapmini_8F_Notebook.png",
  18301: "Mapmini_8F_B.png"
};

const zoomToSector = (sector, rows, cols) => {
  const scale = 2;
  const centerX = (sector.col + 0.5) / cols;
  const centerY = (sector.row + 0.5) / rows;

  return {
    scale,
    x: (0.5 - centerX) * 100 * scale,
    y: (0.5 - centerY) * 100 * scale,
  };
};

const RoomView = ({ selectedSector, baseUrl, allSectors }) => {
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedMiniSector, setSelectedMiniSector] = useState(null);
  const [imageTransform, setImageTransform] = useState({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const imageWidth = 3200;
  const imageHeight = 1500;
  const miniMapFile = MINIMAP_CONFIG[selectedSector?.SECTORNO];
  const miniMapUrl = miniMapFile ? `${miniMapBaseUrl}/${miniMapFile}` : null;
  const layout = MINI_MAP_LAYOUT[selectedSector?.SECTORNO];

  // Fetch seats when sector changes
  useEffect(() => {
    const fetchSeats = async () => {
      if (!selectedSector) return;

      setLoadingSeats(true);
      try {
        const seatData = await getSeatList({
          sectorno: selectedSector.SECTORNO,
          floor: selectedSector.FLOOR,
          floorno: selectedSector.FLOORNO,
          roomno: selectedSector.ROOMNO,
          type: 'S'
        });

        if (seatData?.seatList && Array.isArray(seatData.seatList)) {
          setSeats(seatData.seatList);
        } else {
          setSeats([]);
        }
      } catch (error) {
        console.error("Error fetching seats:", error);
        setSeats([]);
      } finally {
        setLoadingSeats(false);
      }
    };

    fetchSeats();
  }, [selectedSector]);

  // Reset on room change
  useEffect(() => {
    setMiniMapError(false);
    setSelectedMiniSector(null);
    setImageTransform({ x: 0, y: 0, scale: 1 });
    setSelectedSeat(null);
  }, [selectedSector]);

  const handleMiniSectorClick = (sector) => {
    if (selectedMiniSector?.id === sector.id) {
      setSelectedMiniSector(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const transform = zoomToSector(sector, layout.rows, layout.cols);
    setSelectedMiniSector(sector);
    setImageTransform(transform);
  };

  const handleSeatClick = (seat) => {
    if (selectedSeat?.SEATNO === seat.SEATNO) {
      setSelectedSeat(null);
    } else {
      setSelectedSeat(seat);
    }
  };

  // Parse seat position from POSX/POSY (pixel coordinates)
  const parseSeatPosition = (seat) => {
    if (!seat || !seat.POSX || !seat.POSY) return null;

    // POSX and POSY are pixel coordinates on the image
    // Convert them to percentages based on image dimensions
    // You may need to adjust these dimensions based on your actual image size
    const imageWidth = 3600; // Adjust based on your actual image width
    const imageHeight = 1500; // Adjust based on your actual image height

    const leftPercent = (seat.POSX / imageWidth) * 100;
    const topPercent = (seat.POSY / imageHeight) * 100;

    return {
      left: `${leftPercent}%`,
      top: `${topPercent}%`
    };
  };

  // Get seat status color - matching the image style
  const getSeatColor = (status, isSelected) => {
    if (isSelected) {
      return 'bg-blue-500 border-blue-300';
    }

    // STATUS values: 1=Available, 2=Occupied, 4=Reserved (based on API data)
    switch (status) {
      case 1: return 'bg-orange-500 border-orange-400'; // Available
      case 2: return 'bg-gray-400 border-gray-300';     // Occupied
      case 4: return 'bg-green-400 border-green-300';   // Reserved
      default: return 'bg-gray-500 border-gray-400';
    }
  };

  return (
    <>
      {/* Mini Map */}
      {miniMapUrl && !miniMapError && layout && (
        <div className="absolute top-4 right-4 z-30">
          <div className="relative rounded-lg shadow-2xl bg-black/20 p-1">
            <img
              src={miniMapUrl}
              alt="Mini Map"
              className="w-80 rounded opacity-90"
              onError={() => setMiniMapError(true)}
            />

            <div
              className="absolute inset-0 p-1"
              style={{
                display: "grid",
                gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
                gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
              }}
            >
              {layout.sectors.map((sector) => (
                <button
                  key={sector.id}
                  style={{
                    gridRow: sector.row + 1,
                    gridColumn: sector.col + 1,
                  }}
                  onClick={() => handleMiniSectorClick(sector)}
                  className={`
                    border transition-all duration-200
                    ${selectedMiniSector?.id === sector.id
                      ? "border-blue-400 bg-blue-500/40"
                      : "border-white/20 hover:bg-white/20 hover:border-white/50"
                    }
                  `}
                  title={sector.label}
                />
              ))}
            </div>

            <div className="absolute -top-8 left-0 right-0 text-center">
              <span className="text-xs bg-gray-800 text-white px-3 py-1 rounded">
                {selectedSector?.ROOM_NAME || selectedSector?.NAME}
              </span>
            </div>

            {selectedMiniSector && (
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded">
                  {selectedMiniSector.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seat Info Panel */}
      {selectedSeat && (
        <div className="absolute top-4 left-4 z-30 bg-white text-gray-800 p-4 rounded-lg shadow-2xl min-w-[200px]">
          <button
            onClick={() => setSelectedSeat(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-800 text-xl"
          >
            ×
          </button>
          <h3 className="text-lg font-bold mb-3 pr-6">Seat {selectedSeat.VNAME}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Status:</span>
              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${selectedSeat.STATUS === 1 ? 'bg-orange-500' :
                  selectedSeat.STATUS === 2 ? 'bg-gray-400' :
                    'bg-green-400'
                }`}>
                {selectedSeat.STATUS === 1 ? 'Available' :
                  selectedSeat.STATUS === 2 ? 'Occupied' :
                    'Reserved'}
              </span>
            </div>
            {selectedSeat.NAME && (
              <p><span className="font-semibold">Name:</span> {selectedSeat.NAME}</p>
            )}
          </div>
        </div>
      )}

      {/* Main Room Image with Seats */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden relative">
        {loadingSeats ? (
          <LoadingSpinner />
        ) : selectedSector?.SECTOR_IMAGE ? (
          <>
            {/* Background Image */}
            <img
              src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
              alt={selectedSector.ROOM_NAME || selectedSector.NAME}
              className="object-contain transition-transform duration-500 ease-out max-w-full max-h-full"
              style={{
                transform: `translate(${imageTransform.x}%, ${imageTransform.y}%) scale(${imageTransform.scale})`,
                transformOrigin: "center center",
              }}
            />

            {/* Seat Markers Container */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${imageTransform.x}%, ${imageTransform.y}%) scale(${imageTransform.scale})`,
                transformOrigin: "center center",
                transition: "transform 500ms ease-out"
              }}
            >
              {seats.length > 0 && seats.map((seat) => {
                const position = parseSeatPosition(seat);
                if (!position) return null;

                const isSelected = selectedSeat?.SEATNO === seat.SEATNO;

                return (
                  <button
                    key={seat.SEATNO}
                    onClick={() => handleSeatClick(seat)}
                    className={`absolute pointer-events-auto transition-all duration-200 ${getSeatColor(seat.STATUS, isSelected)}`}
                    style={{
                      left: position.left,
                      top: position.top,
                      transform: 'translate(-50%, -50%)',
                      width: '25px',
                      height: '25px',
                      borderWidth: '2px',
                      borderRadius: '4px',
                      boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : '0 2px 4px rgba(0,0,0,0.3)',
                    }}
                    title={`Seat ${seat.VNAME || seat.SEATNO}`}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-white text-[10px] font-bold leading-tight">
                        {seat.VNAME || seat.SEATNO}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-gray-300 text-xl">No image available</div>
        )}
      </div>

      {/* Legend */}
      {seats.length > 0 && (
        <div className="absolute bottom-4 left-4 z-30 bg-white/95 text-gray-800 p-3 rounded-lg shadow-lg">
          <div className="flex gap-4 text-sm font-semibold">
            <div className="flex items-center gap-2">
              <div className="w-6 h-8 rounded border-2 border-orange-400 bg-orange-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-8 rounded border-2 border-gray-300 bg-gray-400"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-8 rounded border-2 border-green-300 bg-green-400"></div>
              <span>Reserved</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RoomView;