import React from 'react';

const FloorStatsBar = ({ floors, currentFloor, onFloorClick, loading }) => {
  const calculatePercentage = (occupied, total) => {
    return (occupied / total) * 100;
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 p-2 bg-black/30 backdrop-blur-sm">
      {floors.map((item) => (
        <button
          key={item.id}
          onClick={() => onFloorClick(item)}
          disabled={loading}
          className={`w-full flex items-center rounded-lg overflow-hidden transition-all cursor-pointer hover:scale-102 disabled:opacity-50 disabled:cursor-not-allowed ${
            currentFloor?.id === item.id
              ? "bg-[#FFCA08] shadow-lg"
              : "bg-[#C4B483] hover:bg-[#D4C493]"
          }`}>
          <div
            className={`px-8 py-6 flex items-center justify-center ${
              currentFloor?.id === item.id ? "bg-[#9A7D4C]" : "bg-[#FFCA08]"
            }`}>
            <span
              className={`text-4xl font-bold ${
                currentFloor?.id === item.id ? "text-white" : "text-[#9A7D4C]"
              }`}>
              {item.title}
            </span>
          </div>

          <div className="flex-1 px-4 py-2 relative mt-4">
            <div className="absolute -top-2 left-4 bg-[#9A7D4C] text-white text-xs font-bold px-3 py-1 rounded-full">
              {item.occupied}
            </div>

            <div className="mt-4 mb-2">
              <div className="h-3 bg-[#D7D8D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9A7D4C] rounded-full transition-all duration-300"
                  style={{
                    width: `${calculatePercentage(item.occupied, item.total)}%`,
                  }}
                />
              </div>
            </div>

            <div className="text-right text-sm text-gray-400 mt-1">
              {item.total}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FloorStatsBar;