import { useEffect, useState } from 'react';
import { miniMapBaseUrl } from '../../../services/api';

// Mini-map configuration based on sector labels
const getMiniMapUrl = (sectorLabel, miniMapBaseUrl) => {
  console.log('🔍 RoomView - Sector Label:', sectorLabel);
  
  if (sectorLabel?.includes('멀티미디어') || sectorLabel?.includes('감상용')) {
    const url = `${miniMapBaseUrl}/commons/images/kiosk/Mapmini_6F_Multimedia.png`;
    console.log('✅ Multimedia section matched! URL:', url);
    return url;
  }

  if (sectorLabel?.includes('정보검색실')) {
    const url = `${miniMapBaseUrl}/commons/images/kiosk/Mapmini_6F_Computer.png`;
    console.log('✅ Computer section matched! URL:', url);
    return url;
  }

  console.log('❌ No mini-map match found for label:', sectorLabel);
  return null;
};

// Define 6 sections of the mini-map (2 rows x 3 columns)
const MINI_MAP_SECTIONS = [
  { id: 1, row: 0, col: 0, label: 'Top Left' },
  { id: 2, row: 0, col: 1, label: 'Top Center' },
  { id: 3, row: 0, col: 2, label: 'Top Right' },
  { id: 4, row: 1, col: 0, label: 'Bottom Left' },
  { id: 5, row: 1, col: 1, label: 'Bottom Center' },
  { id: 6, row: 1, col: 2, label: 'Bottom Right' },
];

const RoomView = ({ selectedSector, baseUrl }) => {
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedSection, setSelectedSection] = useState(null);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1});
 
  const miniMapUrl = getMiniMapUrl(selectedSector?.MAPLABEL, miniMapBaseUrl);

  useEffect(() => {
    setMiniMapError(false);
    setSelectedSection(null);
    setImageTransform({ x: 0, y: 0, scale: 1 });
  }, [selectedSector]);

  const handleMiniMapError = (e) => {
    console.error('❌ Failed to load mini map:', miniMapUrl);
    setMiniMapError(true);
  };

  const handleMiniMapLoad = () => {
    console.log('✅ Mini map loaded successfully:', miniMapUrl);
  };

  const handleSectionClick = (section) => {
    if (selectedSection?.id === section.id) {
      // Reset zoom if clicking the same section
      setSelectedSection(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
    } else {
      // Zoom to selected section
      setSelectedSection(section);
      
      // Calculate zoom position for 2x3 grid
      const scale = 3;
      
      // For a 3-column grid, each column is 1/3 of the width
      // For a 2-row grid, each row is 1/2 of the height
      // We need to move the image so the selected section is centered
      
      // Calculate the center point of the selected section (in terms of 0-1 range)
      const sectionCenterX = (section.col + 0.5) / 3; // 0.167, 0.5, or 0.833
      const sectionCenterY = (section.row + 0.5) / 2; // 0.25 or 0.75
      
      // When scaled, we need to translate so this point stays in the center
      // Formula: to center a point at position P in a scaled image:
      // translate = (0.5 - P) * (scale - 1) / (scale - 1) * 100
      // Simplified: (0.5 - P) * scale * 100
      const xOffset = (0.5 - sectionCenterX) * 100 * scale;
      const yOffset = (0.5 - sectionCenterY) * 100 * scale;
      
      setImageTransform({
        x: xOffset,
        y: yOffset,
        scale: scale
      });
    }
  };


  return (
    <>
      {/* Mini Map - Top Right Corner */}
      {miniMapUrl && !miniMapError && (
        <div className="absolute top-0 right-0 z-20">
          <div className="relative rounded-lg shadow-2xl">
            <img
              src={miniMapUrl}
              alt="Mini Map"
              className="w-84 h-auto rounded opacity-80"
              onError={handleMiniMapError}
              onLoad={handleMiniMapLoad}
            />
            
            {/* Overlay grid for clickable sections - NO GAPS */}
            <div className="absolute inset-0 grid grid-rows-2 grid-cols-3">
              {MINI_MAP_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section)}
                  className={`
                    border transition-all duration-200
                    ${selectedSection?.id === section.id 
                      ? 'border-blue-400 bg-blue-500/40' 
                      : 'border-white/20 bg-transparent hover:bg-white/20 hover:border-white/50'
                    }
                  `}
                  title={`${section.label} - Click to zoom`}
                />
              ))}
            </div>

            {/* Section label */}
            {selectedSection && (
              <div className="absolute -bottom-8 left-0 right-0 text-center">
                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                  {selectedSection.label}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Room Image with Zoom */}
      <div className="w-full h-full flex items-center justify-center overflow-hidden ">
        {selectedSector?.SECTOR_IMAGE ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
            <img
              src={`${baseUrl}${selectedSector.SECTOR_IMAGE}`}
              alt={selectedSector.ROOM_NAME}
              className="object-cover rounded-lg shadow-2xl transition-transform duration-500 ease-out"
              style={{
                transform: `translate(${imageTransform.x}%, ${imageTransform.y}%) scale(${imageTransform.scale})`,
                transformOrigin: 'center center',
                maxWidth: '100%',
                maxHeight: '100%',
                width: '100%',
                height: 'auto',
              }}
              onError={() => {
                console.error(
                  '❌ Failed to load sector image:',
                  `${baseUrl}${selectedSector.SECTOR_IMAGE}`
                );
              }}
              onLoad={() => {
                console.log(
                  '✅ Sector image loaded:',
                  `${baseUrl}${selectedSector.SECTOR_IMAGE}`
                );
              }}
            />
          </div>
        ) : (
          <p className="text-2xl text-gray-300">
            No image available for this room
          </p>
        )}
      </div>
     
    </>
  );
};

export default RoomView;