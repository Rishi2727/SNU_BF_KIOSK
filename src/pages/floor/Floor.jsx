import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Header from "../../components/layout/header/Header";
import BgMainImage from "../../assets/images/BgMain.jpg";
import logo from "../../assets/images/logo.png";

import { clearUserInfo } from "../../redux/slice/userInfo";
import LoadingSpinner from "../../components/common/LoadingSpinner";

import { filterDisplayableSectors, parseMapPoint } from "../../utils/mapPointParser";
import { useFloorData } from "../../hooks/useFloorData";

import RoomView from "../../components/layout/floor/RoomView";
import FloorMapImage from "../../components/layout/floor/FloorMapImage";
import FloorStatsBar from "../../components/layout/floor/FloorStatsBar";
import FloorLegendBar from "../../components/layout/floor/FloorLegendBar";
import FooterControls from "../../components/common/Footer";

import { MAP_BASE_URL, getSeatList, ImageBaseUrl } from "../../services/api";
import { MINI_MAP_LAYOUT, MINIMAP_CONFIG } from "../../utils/constant";
import SeatActionModal from "../../components/common/SeatActionModal";

const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId } = useParams();

  const { userInfo } = useSelector((state) => state.userInfo);
  const { sectorList: initialSectorList, floorInfo: initialFloorInfo } = location.state || {};

  /* =====================================================
     FLOOR / SECTOR STATE
  ===================================================== */
  const [selectedSector, setSelectedSector] = useState(null);
  const [showRoomView, setShowRoomView] = useState(false);

  /* =====================================================
     ROOM VIEW STATE
  ===================================================== */
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedMiniSector, setSelectedMiniSector] = useState(null);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ 
    width: 0, 
    height: 0, 
    naturalWidth: 0, 
    naturalHeight: 0,
    offsetX: 0,
    offsetY: 0
  });
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);

  const mainImageRef = useRef(null);
  const containerRef = useRef(null);
  const prevSectorNoRef = useRef(null);

  /* =====================================================
     FLOOR DATA HOOK
  ===================================================== */
  const {
    floors,
    currentFloor,
    setCurrentFloor,
    sectorList,
    floorImageUrl,
    imageError,
    setImageError,
    loading,
    fetchSectorList,
  } = useFloorData(floorId, initialFloorInfo, initialSectorList);

  /* =====================================================
     COMPUTED VALUES FOR ROOM VIEW
  ===================================================== */
  const layout = selectedSector ? MINI_MAP_LAYOUT[selectedSector.SECTORNO] : null;
  const miniMapFile = selectedSector ? MINIMAP_CONFIG[selectedSector.SECTORNO] : null;
  const miniMapUrl = miniMapFile ? `${ImageBaseUrl}/${miniMapFile}` : null;
  const seatFontScale = layout?.seatFontScale ?? 1;

  /* =====================================================
     LOGOUT
  ===================================================== */
  const handleLogout = () => {
    localStorage.removeItem("authenticated");
    dispatch(clearUserInfo());
    navigate("/");
  };

  /* =====================================================
     FLOOR IMAGE ERROR
  ===================================================== */
  const handleImageError = () => {
    console.error("Failed to load floor image:", floorImageUrl);
    setImageError(true);
  };

  /* =====================================================
     FLOOR CHANGE
  ===================================================== */
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

  /* =====================================================
     FETCH SEATS
  ===================================================== */
  const fetchSeats = async (sector) => {
    if (!sector) return;

    setLoadingSeats(true);
    try {
      const res = await getSeatList({
        sectorno: sector.SECTORNO,
        floor: sector.FLOOR,
        floorno: sector.FLOORNO,
        roomno: sector.ROOMNO,
        type: "S",
      });

      setSeats(Array.isArray(res?.seatList) ? res.seatList : []);
    } catch {
      setSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  };

  /* =====================================================
     SECTOR CLICK
  ===================================================== */
  const handleSectorClick = async (sector) => {
    setSelectedSector(sector);
    setShowRoomView(true);

    // Fetch seats immediately
    await fetchSeats(sector);
  };

  const backToFloorMap = () => {
    setShowRoomView(false);
    setSelectedSector(null);
    setMiniMapError(false);
  };

  /* =====================================================
     RESET ON SECTOR CHANGE
  ===================================================== */
  useEffect(() => {
    if (!selectedSector) return;
    
    if (prevSectorNoRef.current === selectedSector.SECTORNO) return;
    prevSectorNoRef.current = selectedSector.SECTORNO;
    
    setSelectedMiniSector(null);
    setImageTransform({ x: 0, y: 0, scale: 1 });
    setMiniMapError(false);
    setSelectedSeat(null);
    setShowSeatModal(false);
  }, [selectedSector]);

  /* =====================================================
     AUTO SELECT DEFAULT MINI MAP SECTOR
  ===================================================== */
  useEffect(() => {
    if (!layout || !showRoomView) return;
    
    const defaultSector = layout.sectors.find((s) => s.alreadyEnabledImage);
    if (!defaultSector) return;
    
    setSelectedMiniSector(defaultSector);
    setImageTransform(defaultSector.transform);
  }, [layout, showRoomView]);

  /* =====================================================
     TRACK IMAGE DIMENSIONS
  ===================================================== */
  useEffect(() => {
    const updateDimensions = () => {
      if (mainImageRef.current && containerRef.current) {
        const img = mainImageRef.current;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();

        setImageDimensions({
          width: imgRect.width,
          height: imgRect.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          offsetX: imgRect.left - containerRect.left,
          offsetY: imgRect.top - containerRect.top,
        });
      }
    };

    if (showRoomView) {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);

      const timer = setTimeout(updateDimensions, 550);

      return () => {
        window.removeEventListener('resize', updateDimensions);
        clearTimeout(timer);
      };
    }
  }, [imageTransform, selectedSector, showRoomView]);

  /* =====================================================
     MINI MAP CLICK
  ===================================================== */
  const handleMiniSectorClick = (sector) => {
    if (selectedMiniSector?.id === sector.id) {
      setSelectedMiniSector(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
      return;
    }
    setSelectedMiniSector(sector);
    setImageTransform(sector.transform);
  };

  /* =====================================================
     MAIN IMAGE CLICK ZOOM
  ===================================================== */
  const handleMainImageClick = (e) => {
    if (!layout || !mainImageRef.current) return;

    if (imageTransform.scale > 1) {
      setSelectedMiniSector(null);
      setImageTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const rect = mainImageRef.current.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const xPercent = (0.5 - clickX) * 100;
    const yPercent = (0.5 - clickY) * 100;

    let closestSector = null;
    let minDistance = Infinity;

    layout.sectors.forEach((sec) => {
      const dx = xPercent - sec.transform.x;
      const dy = yPercent - sec.transform.y;
      const dist = Math.hypot(dx, dy);

      if (dist < minDistance) {
        minDistance = dist;
        closestSector = sec;
      }
    });

    if (closestSector) {
      setSelectedMiniSector(closestSector);
      setImageTransform(closestSector.transform);
    }
  };

  /* =====================================================
     IMAGE LOAD HANDLER
  ===================================================== */
  const handleImageLoad = () => {
    if (mainImageRef.current && containerRef.current) {
      const img = mainImageRef.current;
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      setImageDimensions({
        width: imgRect.width,
        height: imgRect.height,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        offsetX: imgRect.left - containerRect.left,
        offsetY: imgRect.top - containerRect.top,
      });
    }
  };

  /* =====================================================
     SEAT CLICK HANDLER
  ===================================================== */
  const handleSeatClick = (seat) => {
    const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
    if (!isAvailable) return;
    
    setSelectedSeat(seat);
    setShowSeatModal(true);
  };

  /* =====================================================
     SEAT BOOKING HANDLERS
  ===================================================== */
  const handleCloseModal = () => {
    setShowSeatModal(false);
    setSelectedSeat(null);
  };

  const handleConfirmBooking = (seat) => {
    // TODO: Implement booking logic
    console.log('Booking seat:', seat);
    handleCloseModal();
  };

  /* =====================================================
     MAP LABEL HANDLING
  ===================================================== */
  const getSectorLabel = (sector, index = 0) => {
    if (!sector?.MAPLABEL) return "";
    const labels = sector.MAPLABEL.split("$").map((l) => l.trim());
    return labels[index] || labels[0];
  };

  const displayableSectors = filterDisplayableSectors(sectorList);

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" alt="background" />

      <img src={logo} alt="logo" className="absolute top-0 left-0 w-[20%] ml-6 z-10" />

      {/* ================= FLOOR STATS ================= */}
      <div className="absolute top-[110px] left-0 right-0 z-20 px-4">
        <FloorStatsBar
          floors={floors}
          currentFloor={currentFloor}
          onFloorClick={handleFloorClick}
          loading={loading}
        />
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className="absolute inset-0 flex items-center justify-center z-0 mb-[-78px] mx-[11px]">
        {currentFloor && (
          <div className="relative w-full h-[820px] bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden shadow-2xl">
            {loading ? (
              <LoadingSpinner />
            ) : showRoomView && selectedSector ? (
              <RoomView
                selectedSector={selectedSector}
                baseUrl={MAP_BASE_URL}
                seats={seats}
                loadingSeats={loadingSeats}
                selectedMiniSector={selectedMiniSector}
                imageTransform={imageTransform}
                miniMapUrl={miniMapUrl}
                miniMapError={miniMapError}
                layout={layout}
                seatFontScale={seatFontScale}
                imageDimensions={imageDimensions}
                mainImageRef={mainImageRef}
                containerRef={containerRef}
                onMiniSectorClick={handleMiniSectorClick}
                onMainImageClick={handleMainImageClick}
                onSeatClick={handleSeatClick}
                onImageLoad={handleImageLoad}
                onMiniMapError={() => setMiniMapError(true)}
              />
            ) : (
              <div className="relative w-full h-full">
                <FloorMapImage
                  floorImageUrl={floorImageUrl}
                  currentFloor={currentFloor}
                  onImageError={handleImageError}
                  imageError={imageError}
                />

                {!imageError &&
                  displayableSectors.map((sector) => {
                    const mapStylesList = parseMapPoint(sector.MAPPOINT);

                    return mapStylesList.map((mapStyles, idx) => (
                      <button
                        key={`${sector.SECTORNO}-${idx}`}
                        onClick={() => handleSectorClick(sector)}
                        className="absolute group cursor-pointer hover:z-20 transition-all"
                        style={{
                          top: mapStyles.top,
                          left: mapStyles.left,
                          right: mapStyles.right,
                          width: mapStyles.width,
                          height: mapStyles.height,
                        }}
                        title={getSectorLabel(sector, idx)}
                      >
                        <div className="absolute inset-0 bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none">
                          <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg whitespace-nowrap">
                            {getSectorLabel(sector, idx)}
                          </span>
                        </div>
                      </button>
                    ));
                  })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= LEGEND + FOOTER ================= */}
      <FloorLegendBar
        buildingName="Central Library, Gwanjeong Building"
        floorName={currentFloor?.title}
        roomName={selectedSector?.MAPLABEL}
        showBack={showRoomView}
        onBack={backToFloorMap}
      />

      <FooterControls
        userInfo={userInfo}
        openKeyboard={() => {}}
        logout={handleLogout}
        onVolumeUp={() => {}}
        onVolumeDown={() => {}}
        onZoom={() => {}}
        onContrast={() => {}}
      />

      {/* ================= SEAT BOOKING MODAL ================= */}
     <SeatActionModal
  mode="booking"
  seat={selectedSeat}
  isOpen={showSeatModal}
  onClose={handleCloseModal}
/>
    </div>
  );
};

export default Floor;