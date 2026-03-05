const LibraryCard = ({
  name,
  availableCount = 0,
  totalCount = 0,
  onClick,
  isFocused,
}) => {

  const pct = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;

  const getBarColor = () => {
    if (pct > 80) return "from-red-500 to-red-700";
    if (pct > 50) return "from-yellow-400 to-yellow-600";
    return "from-[#b89660] to-[#5c3d10]";
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col flex-1 min-w-[10px] h-[290px]
        px-6 pt-7 pb-6 rounded-2xl overflow-hidden
        transition-all duration-200 cursor-pointer

        ${isFocused
          ? "bg-gradient-to-br from-[#FFCA08] to-[#ffb300] shadow-2xl outline-[5px] outline-[#dc2f02]"
          : "bg-gradient-to-br from-[#fffbf0] to-[#fff3cc] shadow-md outline outline-[2px] outline-[#FFCA0859]"
        }
      `}
    >

      {/* Decorative circle */}
      <div
        className={`
          absolute -top-8 -right-8 w-[110px] h-[110px] rounded-full
          ${isFocused ? "bg-[#9A7D4C]/20" : "bg-[#FFCA08]/20"}
        `}
      />

      {/* Floor Name */}
      <div
        className={`
          text-[55px] font-black tracking-tight leading-none mt-10
          ${isFocused ? "text-[#5c3d10]" : "text-[#9A7D4C]"}
        `}
      >
        {name}
      </div>

      {/* Bottom section */}
      <div className="mt-auto relative">

        {/* Available count bubble */}
        <div
          style={{
            left: `clamp(0px, ${pct}%, calc(100% - 56px))`,
          }}
          className={`
            absolute bottom-[40px] -translate-x-1/2
            px-3 py-[2px] rounded-lg text-[30px] font-extrabold text-white
            shadow-lg

            ${isFocused
              ? "bg-gradient-to-br from-[#7a5c30] to-[#9A7D4C]"
              : "bg-gradient-to-br from-[#9A7D4C] to-[#b89660]"
            }
          `}
        >
          {availableCount}
        </div>

        {/* Progress Track */}
        <div
          className="
            h-[14px] rounded-full overflow-hidden mb-5
            bg-[#9A7D4C]/20 border border-[#9A7D4C]/20
          "
        >
          <div
            style={{ width: `${pct}%` }}
            className={`h-full rounded-full bg-gradient-to-r ${getBarColor()} transition-all`}
          />
        </div>

        {/* Total Count */}
        <div
          className={`
            absolute right-1 top-[25px] -translate-y-1/2
            text-[30px] font-semibold
            ${isFocused ? "text-[#5c3d10]" : "text-gray-500"}
          `}
        >
          {totalCount}
        </div>
      </div>
    </button>
  );
};

export default LibraryCard;