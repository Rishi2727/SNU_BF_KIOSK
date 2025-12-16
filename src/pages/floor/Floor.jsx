import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import Header from "../../components/layout/header/Header";
import BgMainImage from "../../assets/images/BgMain.jpg";
import logo from "../../assets/images/logo.png";
import { clearUserInfo } from "../../redux/userInfo";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { filterDisplayableSectors, parseMapPoint } from "../../utils/mapPointParser";
import { useFloorData } from "../../hooks/useFloorData";
import RoomView from "../../components/layout/floor/RoomView";
import FloorMapImage from "../../components/layout/floor/FloorMapImage";
import FloorStatsBar from "../../components/layout/floor/FloorStatsBar";
import { MAP_BASE_URL } from "../../services/api";
import FloorLegendBar from "../../components/layout/floor/FloorLegendBar";

const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId } = useParams();

  const { userInfo } = useSelector((state) => state.userInfo);
  const { sectorList: initialSectorList, floorInfo: initialFloorInfo } = location.state || {};

  const [selectedSector, setSelectedSector] = useState(null);
  const [showRoomView, setShowRoomView] = useState(false);

  const {
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
  } = useFloorData(floorId, initialFloorInfo, initialSectorList);

  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
    navigate("/");
  };

  const handleImageError = () => {
    console.error("Failed to load floor image:", floorImageUrl);
    setImageError(true);
  };

  const handleFloorClick = async (floor) => {
    if (currentFloor?.id === floor.id) return;

    setCurrentFloor(floor);
    setSelectedSector(null);
    setShowRoomView(false);

    const newSectorList = await fetchSectorList(floor);

    if (newSectorList) {
      navigate(`/floor/${floor.title}`, {
        replace: true,
        state: {
          sectorList: newSectorList,
          floorInfo: floor,
        },
      });
    }
  };

  const handleSectorClick = (sector) => {
    setSelectedSector(sector);
    setShowRoomView(true);
  };

  const backToFloorMap = () => {
    setShowRoomView(false);
    setSelectedSector(null);
  };

  const displayableSectors = filterDisplayableSectors(sectorList);

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img
        src={BgMainImage}
        className="absolute inset-0 h-full w-full object-cover"
        alt="background"
      />

      <img
        src={logo}
        alt="logo"
        className="absolute top-0 left-0 w-[20%] ml-6 z-10"
      />

      <div className="absolute inset-0 flex items-center justify-center z-0 mb-[-70px] mx-2">
        {currentFloor && (
          <div className="relative w-full h-[70%] bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">
            {loading ? (
              <LoadingSpinner />
            ) : showRoomView && selectedSector ? (
              <RoomView
                selectedSector={selectedSector}
                onBack={backToFloorMap}
                baseUrl={MAP_BASE_URL}
                allSectors={sectorList} // Add this line
              />
            ) : (
              <div className="relative w-full h-full">
                <FloorMapImage
                  floorImageUrl={floorImageUrl}
                  currentFloor={currentFloor}
                  onImageError={handleImageError}
                  imageError={imageError}
                />
                {!imageError && displayableSectors.map((sector) => {
                  const mapStyles = parseMapPoint(sector.MAPPOINT);
                  if (!mapStyles) return null;

                  return (
                    <button
                      key={sector.SECTORNO}
                      onClick={() => handleSectorClick(sector)}
                      className="absolute group cursor-pointer hover:z-20 transition-all"
                      style={{
                        top: mapStyles.top,
                        left: mapStyles.left,
                        right: mapStyles.right,
                        width: mapStyles.width,
                        height: mapStyles.height,
                      }}
                      title={sector.MAPLABEL}>
                      <div className="absolute inset-0 bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none">
                        <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg whitespace-nowrap">
                          {sector.MAPLABEL}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <Header userInfo={userInfo} logout={handleLogout} />
      <FloorLegendBar
        buildingName="Central Library, Gwanjeong Building"
        floorName={currentFloor?.title}
        roomName={selectedSector?.MAPLABEL}
        showBack={showRoomView}
        onBack={backToFloorMap}
      />
      <FloorStatsBar
        floors={floors}
        currentFloor={currentFloor}
        onFloorClick={handleFloorClick}
        loading={loading}
      />
    </div>
  );
};

export default Floor;