const FloorStatsBar = ({ floors, currentFloor, onFloorClick, loading }) => {
  const calculatePercentage = (occupied, total) => {
    return (occupied / total) * 100;
  };

  return (
    <div
      className="
        w-[80%]
        absolute bottom-0 right-0 z-30
        flex items-center justify-between gap-4
        px-6 py-5
        bg-white/90 backdrop-blur-md
        rounded-tl-2xl shadow-xl
      "
    >
      {floors.map((item) => (
        <button
          key={item.id}
          onClick={() => onFloorClick(item)}
          disabled={loading}
          className={`w-[35%] flex items-center rounded-xl overflow-hidden
            transition-all duration-200 cursor-pointer
            hover:scale-[1.02] hover:shadow-lg
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              currentFloor?.id === item.id
                ? "bg-[#FFCA08] shadow-md"
                : "bg-[#C4B483] hover:bg-[#D4C493]"
            }`}
        >
          {/* Floor Label */}
          <div
            className={`px-6 py-4 flex items-center justify-center shrink-0 ${
              currentFloor?.id === item.id
                ? "bg-[#9A7D4C]"
                : "bg-[#FFCA08]"
            }`}
          >
            <span
              className={`text-[36px] font-bold tracking-wide ${
                currentFloor?.id === item.id
                  ? "text-white"
                  : "text-[#9A7D4C]"
              }`}
            >
              {item.title}
            </span>
          </div>

          {/* Stats */}
          <div className="flex-1 px-4 py-2 relative">
            {/* Percentage badge */}
            <div className="absolute top-7 left-4 bg-[#9A7D4C] text-white font-bold px-3 py-0 rounded-md text-[30px] shadow-md">
              {item.occupied}%
            </div>

            {/* Progress bar */}
            <div className="mt-2 mb-3">
              <div className="h-2 bg-[#D7D8D2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#9A7D4C] rounded-full transition-all duration-300"
                  style={{
                    width: `${calculatePercentage(
                      item.occupied,
                      item.total
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Total */}
            <div className="text-right text-gray-500 leading-none">
              <span className="text-[30px]">{item.total}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default FloorStatsBar;
