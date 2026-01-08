import React from 'react';

const FloorMapImage = ({ floorImageUrl, currentFloor, onImageError, imageError ,isFocused }) => {
  
  if (imageError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-2xl text-red-400 mb-2">Failed to load floor image</p>
          <p className="text-lg text-gray-300">URL: {floorImageUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <img
        src={floorImageUrl}
        alt={`Floor ${currentFloor.title} Map`}
        className="w-full h-full object-contain"
        onError={onImageError}
      />
    </>
  );
};

export default FloorMapImage;