import React from 'react';

const RoomView = ({ selectedSector, baseUrl }) => {
  return (
    <div className="relative w-full h-full">
      <div className="w-full h-full flex items-center justify-center p-4">
        {selectedSector.SECTOR_IMAGE ? (
          <img
            src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
            alt={selectedSector.ROOM_NAME}
            className="object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <p className="text-2xl text-gray-300">
            No image available for this room
          </p>
        )}
      </div>
    </div>
  );
};

export default RoomView;
