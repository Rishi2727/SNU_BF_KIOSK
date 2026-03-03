import { useState, useEffect } from "react";
import { getFloorImageUrl , setApiLang } from "../services/api";
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
  const imageBaseUrl = getFloorImageUrl();
useEffect(() => {
    setApiLang(lang);
  }, [lang]);
  useEffect(() => {
    dispatch(fetchFloorList(1));
  }, [dispatch, lang]);
  useEffect(() => {
    if (!floors.length) return;

    // priority 1: initialFloorInfo
    if (initialFloorInfo?.floorno) {
      const updated = floors.find(
        (f) => String(f.floorno) === String(initialFloorInfo.floorno)
      );
      setCurrentFloor(updated || null);
      return;
    }

    // priority 2: from route param
    if (floorId) {
      const updated = floors.find(
        (f) => String(f.floorno) === String(floorId) || f.title === floorId
      );
      setCurrentFloor(updated || null);
      return;
    }
  }, [floors, lang]); // 🔥 lang included

  useEffect(() => {
    if (!currentFloor?.floorno) return;

    dispatch(clearSectors());
    const floorNumber = `${currentFloor.floorno}000`;
    setFloorImageUrl(`${imageBaseUrl}/MAP/KIOSK/floor_${floorNumber}.png`);
    setImageError(false);

    dispatch(
      fetchSectorList({
        floor: currentFloor.floor,
        floorno: currentFloor.floorno,
      })
    );
  }, [lang, currentFloor?.floorno, dispatch]); // ✅ depend on primitive, not object

  return {
    floors,
    currentFloor,
    setCurrentFloor,
    sectorList: sectors, // ✅ ONLY source
    floorImageUrl,
    imageError,
    setImageError,
    loading,
  };
};
