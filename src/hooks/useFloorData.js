import { useState, useEffect } from 'react';
import { getSectorList, MAP_BASE_URL } from '../services/api';

export const useFloorData = (floorId, initialFloorInfo, initialSectorList) => {
  const floors = [
    { id: 16, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
    { id: 17, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
    { id: 18, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
  ];

  const [currentFloor, setCurrentFloor] = useState(null);
  const [sectorList, setSectorList] = useState(initialSectorList);
  const [floorImageUrl, setFloorImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialFloorInfo) {
      setCurrentFloor(initialFloorInfo);
    } else if (floorId) {
      const floor = floors.find(f => f.title === floorId);
      setCurrentFloor(floor);
    }
  }, [floorId, initialFloorInfo]);

  useEffect(() => {
    if (currentFloor) {
      const floorNumber = `${currentFloor.floorno}000`;
      const imageUrl = `${MAP_BASE_URL}/MAP/KIOSK/floor_${floorNumber}.png`;
      setFloorImageUrl(imageUrl);
      setImageError(false);
    }
  }, [currentFloor]);

  const fetchSectorList = async (floor) => {
    setLoading(true);
    try {
      const response = await getSectorList({
        floor: floor.floor,
        floorno: floor.floorno,
      });
      const newSectorList = response?.SectorList || response;
      setSectorList(newSectorList);
      return newSectorList;
    } catch (error) {
      console.error("Failed to fetch sector list for floor:", floor.title, error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    floors,
    currentFloor,
    setCurrentFloor,
    sectorList,
    setSectorList,
    floorImageUrl,
    imageError,
    setImageError,
    loading,
    fetchSectorList,
  };
};
