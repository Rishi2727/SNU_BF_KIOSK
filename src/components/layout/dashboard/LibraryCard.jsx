const LibraryCard = ({ title, subtitle, availableCount = 0, totalCount = 217, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="
        flex flex-col justify-between
        bg-[#FFCA08] hover:bg-[#D7D8D2]
        transition rounded-2xl
        flex-1 h-[220px] min-w-[180px] mx-2 p-6
      "
    >
      {/* Top Text Section */}
      <div className="flex flex-col gap-2">
        <div className="text-[50px] font-bold text-[#9A7D4C] leading-tight">
          {title}
        </div>
      </div>

      {/* Bottom Progress Bar Section */}
      <div className="mt-4 relative">
        <div className="w-full h-4 bg-gray-300 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#9A7D4C] transition-all duration-300"
            style={{ width: `${(availableCount / totalCount) * 100}%` }}
          />
        </div>

        {/* Moving Count Badge */}
        <div
          className="absolute -top-3 transform -translate-x-1/2 bg-[#9A7D4C] text-white 
               px-2 rounded-md text-sm font-bold shadow-md transition-all duration-300"
          style={{
            left: `${(availableCount / totalCount) * 100}%`,
          }}
        >
          {availableCount}
        </div>

        {/* Total count */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">
          {totalCount}
        </div>
      </div>

    </button>
  );
};

export default LibraryCard;
