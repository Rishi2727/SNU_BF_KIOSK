import { useState, useEffect } from "react";
import { getSectorList, FloorImageUrl } from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import { fetchFloorList } from "../redux/slice/floorSlice";

export const useFloorData = (floorId, initialFloorInfo, initialSectorList) => {
  const dispatch = useDispatch();
  const { floors, error } = useSelector((state) => state.floor);
  const lang = useSelector((state) => state.lang.current);
  const [currentFloor, setCurrentFloor] = useState(null);
  const [sectorList, setSectorList] = useState(initialSectorList);
  const [floorImageUrl, setFloorImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    dispatch(fetchFloorList(1)); // libno = 1
  }, [dispatch, lang]);
  useEffect(() => {
    if (initialFloorInfo) {
      setCurrentFloor(initialFloorInfo);
    } else if (floorId) {
      const floor = floors.find((f) => f.title === floorId);
      setCurrentFloor(floor);
    }
  }, [floorId, initialFloorInfo]);

  useEffect(() => {
    if (currentFloor) {
      const floorNumber = `${currentFloor.floorno}000`;
      const imageUrl = `${FloorImageUrl}/MAP/KIOSK/floor_${floorNumber}.png`;
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
      console.error(
        "Failed to fetch sector list for floor:",
        floor.title,
        error
      );
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
