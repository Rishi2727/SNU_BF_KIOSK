import React from 'react';
import { Home, Users, Armchair, ArrowLeft } from 'lucide-react';

const FloorLegendBar = ({
  buildingName,
  floorName,
  roomName,
  showBack,
  onBack
}) => {
  return (
    <div className="absolute top-[9%] left-0 right-0 w-full bg-[#9A7D4C] py-2 px-4 flex items-center justify-between text-white shadow-lg z-20">
      
      {/* LEFT */}
      <div className="flex items-center gap-4">
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-[#FFCA08] text-[#9A7D4C] px-4 py-2 rounded-lg text-[26px] font-bold hover:bg-[#FFD640]"
          >
            <ArrowLeft className="w-7 h-7" />
            Back
          </button>
        )}

        <div className="flex items-center gap-2">
          <Home className="w-8 h-8" />
          <span className="text-[30px] font-semibold">
            {buildingName && `${buildingName} `}
            {floorName && `( ${floorName} `}
            {roomName && `: ${roomName} `}
            {(floorName || roomName) && ')'}
          </span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FFCA08] rounded"></div>
          <span className="text-[30px]">Available seats</span>
        </div>

        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-400" />
          <span className="text-[30px]">Seats in use</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-gray-300 rounded flex items-center justify-center">
            <Armchair className="w-8 h-8 text-gray-300" />
          </div>
          <span className="text-[30px]">Disabled seating</span>
        </div>
      </div>
    </div>
  );
};

export default FloorLegendBar;
