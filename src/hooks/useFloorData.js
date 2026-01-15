import { useState, useEffect } from "react";
import { FloorImageUrl } from "../services/api";
import { useDispatch, useSelector } from "react-redux";
import { fetchFloorList } from "../redux/slice/floorSlice";
import { clearSectors, fetchSectorList } from "../redux/slice/sectorSlice";

export const useFloorData = (floorId, initialFloorInfo) => {
  const dispatch = useDispatch();

  const { floors } = useSelector((state) => state.floor);
  const { sectors, loading } = useSelector((state) => state.sector);
  const lang = useSelector((state) => state.lang.current);

  const [currentFloor, setCurrentFloor] = useState(null);
  const [floorImageUrl, setFloorImageUrl] = useState("");
  const [imageError, setImageError] = useState(false);

  /* ===============================
     Fetch floors on language change
  ================================ */
  useEffect(() => {
    dispatch(fetchFloorList(1)); // libno = 1
  }, [dispatch, lang]);

  /* ===============================
     Set current floor
  ================================ */
  useEffect(() => {
    if (initialFloorInfo) {
      setCurrentFloor(initialFloorInfo);
    } else if (floorId) {
      const floor = floors.find((f) => f.title === floorId);
      setCurrentFloor(floor);
    }
  }, [floorId, initialFloorInfo, floors]);

  /* ===============================
     Update floor image
  ================================ */
  useEffect(() => {
    if (currentFloor) {
       dispatch(clearSectors());
      const floorNumber = `${currentFloor.floorno}000`;
      const imageUrl = `${FloorImageUrl}/MAP/KIOSK/floor_${floorNumber}.png`;
      setFloorImageUrl(imageUrl);
      setImageError(false);

      // ✅ fetch sector list from redux
      dispatch(
        fetchSectorList({
          floor: currentFloor.floor,
          floorno: currentFloor.floorno,
        })
      );
    }
  }, [currentFloor, dispatch, lang]);

  return {
    floors,
    currentFloor,
    setCurrentFloor,
    sectorList: sectors,
    floorImageUrl,
    imageError,
    setImageError,
    loading, // ✅ from redux
  };
};
