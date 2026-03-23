import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import BgMainImage from "../../assets/images/SNU_bg.jpg";
import { clearUserInfo, setUserInfo } from "../../redux/slice/userInfo";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { filterDisplayableSectors, parseMapPoint } from "../../utils/mapPointParser";
import { useTranslation } from "react-i18next";
import { useFloorData } from "../../hooks/useFloorData";
import RoomView from "../../components/layout/floor/RoomView";
import FloorMapImage from "../../components/layout/floor/FloorMapImage";
import FloorStatsBar from "../../components/layout/floor/FloorStatsBar";
import FloorLegendBar from "../../components/layout/floor/FloorLegendBar";
import FooterControls from "../../components/common/Footer";
import {
  getFloorImageUrl, getSeatList, getImageBaseUrl,
  getPopupTimers, initializeApi, setApiLang,
} from "../../services/api";
import { MINI_MAP_LAYOUT, MINIMAP_CONFIG } from "../../utils/constant";
import SeatActionModal from "../../components/common/SeatActionModal";
import Modal from "../../components/common/Modal";
import { useVoice } from "../../context/voiceContext";
import { formatFloorForSpeech } from "../../utils/speechFormatter";
import { isMinimapAtBottom } from "../../utils/config";
import { logout } from "../../redux/slice/authSlice";
import { logEvent } from "../../logger";

// ─── Module-level constants ───────────────────────────────────────────────────

const FocusRegion = Object.freeze({
  FLOOR_STATS: "floor_stats",
  MINI_MAP: "mini_map",
  MAP: "map",
  ROOM: "room",
  FOOTER: "footer",
});

const LEGEND_BAR_COUNT = 4;
const SESSION_BUTTON_COUNT = 2;
const FOCUS_ORDER_ROOM = [FocusRegion.FLOOR_STATS, FocusRegion.MINI_MAP, FocusRegion.ROOM, FocusRegion.FOOTER];
const FOCUS_ORDER_MAP = [FocusRegion.FLOOR_STATS, FocusRegion.MAP, FocusRegion.FOOTER];

// ─── Component ────────────────────────────────────────────────────────────────

const Floor = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { floorId, sectorNo, move } = useParams();
  const { speak, stop } = useVoice();
  const { t } = useTranslation();

  // ─── Redux ──────────────────────────────────────────────────────────────
  const { userInfo } = useSelector((s) => s.userInfo);
  const lang = useSelector((s) => s.lang.current);

  // ─── Route state ────────────────────────────────────────────────────────
  const isMoveMode = move === "move" || location.state?.mode === "move";
  const { floorInfo: initialFloorInfo } = location.state || {};
  const isSeatAssignMode = move === "seatAssign" || location.state?.mode === "seatAssign";
  const bookingNo = location.state?.bookingNo ?? null;

  // ─── UI state ────────────────────────────────────────────────────────────
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [showRoomView, setShowRoomView] = useState(false);
  const [miniMapError, setMiniMapError] = useState(false);
  const [selectedMiniSector, setSelectedMiniSector] = useState(null);
  const [imageTransform, setImageTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [seats, setSeats] = useState([]);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, naturalWidth: 0, naturalHeight: 0, offsetX: 0, offsetY: 0 });
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [focusedRegion, setFocusedRegion] = useState(null);
  const [visibleSeats, setVisibleSeats] = useState([]);
  const [minimapSectorCount, setMinimapSectorCount] = useState(0);
  const [miniMapCursor, setMiniMapCursor] = useState(-1);
  const [mainContentCursor, setMainContentCursor] = useState(null);

  // ─── Session / timer state ───────────────────────────────────────────────
  const [floorTimerConfig, setFloorTimerConfig] = useState({ time: 180, state: true });
  const [sessionReminderConfig, setSessionReminderConfig] = useState({ time: 60, state: true });
  const [timeLeft, setTimeLeft] = useState(180);
  const [showSessionReminder, setShowSessionReminder] = useState(false);
  const [sessionCursor, setSessionCursor] = useState(null);
  const [resetTimerOnTouch, setResetTimerOnTouch] = useState(true);
  const [persistedSeatSelection, setPersistedSeatSelection] = useState(null);

  // ─── Refs ────────────────────────────────────────────────────────────────
  const mainImageRef = useRef(null);
  const containerRef = useRef(null);
  const timerRef = useRef(null);
  const timeLeftRef = useRef(180);
  const lastSpokenRef = useRef("");
  const lastFocusedRegionRef = useRef(null);
  const hasSpokenRoomRef = useRef(false);
  const hasSpokenFloorRef = useRef(false);
  const savedFocusRegionRef = useRef(null);

  // ─── API urls ────────────────────────────────────────────────────────────
  const imageBaseUrl = getFloorImageUrl();
  const SeatImagebaseUrl = getImageBaseUrl();

  // ─── Floor data hook ─────────────────────────────────────────────────────
  const {
    floors, currentFloor, setCurrentFloor, sectorList,
    floorImageUrl, imageError, setImageError, loading,
  } = useFloorData(floorId, initialFloorInfo);

  // ─── Derived / memoized values ────────────────────────────────────────────

  const displayableSectors = useMemo(
    () => filterDisplayableSectors(sectorList),
    [sectorList]
  );

  const layout = useMemo(
    () => selectedSector ? MINI_MAP_LAYOUT[selectedSector.SECTORNO] : null,
    [selectedSector]
  );

  const miniMapUrl = useMemo(() => {
    const file = selectedSector ? MINIMAP_CONFIG[selectedSector.SECTORNO] : null;
    return file ? `${SeatImagebaseUrl}/${file}` : null;
  }, [selectedSector, SeatImagebaseUrl]);

  const seatFontScale = layout?.seatFontScale ?? 1;

  const isMinimapNearFloorStats = useMemo(
    () => showRoomView && selectedSector ? isMinimapAtBottom(selectedSector.SECTORNO) : false,
    [showRoomView, selectedSector]
  );

  const focusOrder = useMemo(
    () => showRoomView ? FOCUS_ORDER_ROOM : FOCUS_ORDER_MAP,
    [showRoomView]
  );

  const mainContentItemCount = useMemo(() => {
    if (focusedRegion === FocusRegion.ROOM) return LEGEND_BAR_COUNT + visibleSeats.length;
    if (focusedRegion === FocusRegion.MAP) return LEGEND_BAR_COUNT + (displayableSectors?.length || 0);
    return LEGEND_BAR_COUNT;
  }, [focusedRegion, visibleSeats.length, displayableSectors]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const buildFloorPath = useCallback((floorTitle, sNo = null) => {
    let path = `/floor/${floorTitle}`;
    if (sNo) path += `/${sNo}`;
    if (isMoveMode) path += "/move";
    if (isSeatAssignMode) path += "/seatAssign";
    return path;
  }, [isMoveMode, isSeatAssignMode]);

  const getSectorLabel = useCallback((sector, index = 0) => {
    if (!sector?.MAPLABEL) return "";
    const labels = sector.ROOM_NAME.split("$").map((l) => l.trim());
    return labels[index] || labels[0];
  }, []);

  // ─── Init: user info + timer config ──────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      try {
        await initializeApi();
        const timers = getPopupTimers();
        if (timers?.length) {
          const floorCfg = timers.find((t) => t.name === "LOG OUT FLOOR TIMER");
          const reminderCfg = timers.find((t) => t.name === "SESSION TIMER REMINDER");
          const resetCfg = timers.find((t) => t.name === "RESET TIMER ON TOUCH");
          if (floorCfg) { setFloorTimerConfig(floorCfg); setTimeLeft(floorCfg.time); timeLeftRef.current = floorCfg.time; }
          if (reminderCfg) setSessionReminderConfig(reminderCfg);
          if (resetCfg) setResetTimerOnTouch(resetCfg.state);
          logEvent("info", `Timer config loaded — floor: ${floorCfg?.time}s, reminder: ${reminderCfg?.time}s, resetOnTouch: ${resetCfg?.state}`);
        }
      } catch (err) {
        logEvent("error", `Failed to load timer config: ${err.message}`);
        console.error("Failed to load timer config:", err);
      }
    };
    init();
  }, [dispatch]);

  // Sync API language
  useEffect(() => { setApiLang(lang); }, [lang]);

  // ─── Load sector from route ───────────────────────────────────────────────

  useEffect(() => {
    if (!sectorNo || !sectorList?.length) return;
    const sector = sectorList.find((s) => String(s.SECTORNO) === String(sectorNo));
    if (sector) {
      logEvent("info", `Sector loaded from route param: ${sector.MAPLABEL} (sectorNo=${sectorNo})`);
      setSelectedSector(sector);
      setShowRoomView(true);
      fetchSeats(sector);
    }
  }, [sectorList, sectorNo]);

  // ─── Modal open → clear focus + stop speech ───────────────────────────────

  useEffect(() => {
    if (isAnyModalOpen) { stop(); setFocusedRegion(null); }
  }, [isAnyModalOpen, stop]);

  // ─── Sync focusedRegion when view switches ────────────────────────────────

  useEffect(() => {
    if (showRoomView && focusedRegion === FocusRegion.MAP) setFocusedRegion(FocusRegion.ROOM);
    if (!showRoomView && focusedRegion === FocusRegion.ROOM) setFocusedRegion(FocusRegion.MAP);
  }, [showRoomView, focusedRegion]);

  // Reset main cursor on region / view change
  useEffect(() => { setMainContentCursor(null); stop(); }, [focusedRegion, showRoomView, stop]);

  // Reset minimap cursor when entering MINI_MAP focus
  useEffect(() => {
    if (focusedRegion === FocusRegion.MINI_MAP) setMiniMapCursor(-1);
  }, [focusedRegion]);

  // Reset minimap cursor when sector changes
  useEffect(() => { if (selectedSector) setMiniMapCursor(-1); }, [selectedSector]);

  // ─── '#' key → speak current screen ──────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.repeat) return;
      const isHash = e.key === "#" || e.code === "NumpadHash" || (e.keyCode === 51 && e.shiftKey);
      if (isHash) { stop(); speak(t("speech.This screen is the floor or reading room selection screen.")); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [speak, stop, t]);

  // ─── '*' key → cycle focus regions ───────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e) => {
      const isAsterisk = e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106;
      if (!isAsterisk || e.repeat) return;
      if (showSeatModal || isAnyModalOpen) return;
      e.preventDefault();
      e.stopPropagation();
      setFocusedRegion((prev) => {
        const idx = focusOrder.indexOf(prev);
        const next = focusOrder[(idx + 1) % focusOrder.length];
        logEvent("info", `Focus region cycled via * key: ${prev} → ${next}`);
        return next;
      });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSeatModal, isAnyModalOpen, focusOrder]);

  // ─── MAP / ROOM keyboard navigation ──────────────────────────────────────

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP && focusedRegion !== FocusRegion.ROOM) return;
    if (isAnyModalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMainContentCursor((prev) => {
          const next = prev === null ? 0 : (prev + 1 >= mainContentItemCount ? 0 : prev + 1);
          logEvent("info", `Keyboard ArrowRight in ${focusedRegion} — cursor: ${prev} → ${next}`);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMainContentCursor((prev) => {
          const next = prev === null ? mainContentItemCount - 1 : (prev - 1 < 0 ? mainContentItemCount - 1 : prev - 1);
          logEvent("info", `Keyboard ArrowLeft in ${focusedRegion} — cursor: ${prev} → ${next}`);
          return next;
        });
      } else if (e.key === "Enter" && mainContentCursor !== null) {
        e.preventDefault();
        if (mainContentCursor < LEGEND_BAR_COUNT) return;
        const contentIndex = mainContentCursor - LEGEND_BAR_COUNT;
        if (focusedRegion === FocusRegion.MAP && displayableSectors?.length) {
          logEvent("info", `Keyboard Enter selected sector: ${displayableSectors[contentIndex]?.MAPLABEL} (index=${contentIndex})`);
          handleSectorClick(displayableSectors[contentIndex]);
        }
        if (focusedRegion === FocusRegion.ROOM) {
          const seat = visibleSeats[contentIndex];
          if (!seat) return;
          if (seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2)) {
            logEvent("info", `Keyboard Enter selected seat: ${seat.VNAME}`);
            handleSeatClick(seat);
          } else {
            logEvent("info", `Keyboard Enter on unavailable seat: ${seat.VNAME} (USECNT=${seat.USECNT}, STATUS=${seat.STATUS})`);
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedRegion, mainContentCursor, mainContentItemCount, displayableSectors, visibleSeats, isAnyModalOpen]);

  // ─── MINI MAP keyboard navigation ────────────────────────────────────────

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MINI_MAP || !showRoomView || !selectedSector || !minimapSectorCount) return;

    const onKeyDown = (e) => {
      if (e.key === "*" || e.code === "NumpadMultiply" || e.keyCode === 106) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setMiniMapCursor((prev) => {
          const next = prev === -1 ? 0 : (prev + 1) % minimapSectorCount;
          logEvent("info", `Keyboard ArrowRight in MiniMap — cursor: ${prev} → ${next}`);
          return next;
        });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setMiniMapCursor((prev) => {
          const next = prev === -1 ? minimapSectorCount - 1 : (prev - 1 + minimapSectorCount) % minimapSectorCount;
          logEvent("info", `Keyboard ArrowLeft in MiniMap — cursor: ${prev} → ${next}`);
          return next;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusedRegion, showRoomView, selectedSector, minimapSectorCount]);

  // ─── Session reminder: focus + speech on open ────────────────────────────

  useEffect(() => {
    if (!showSessionReminder) return;
    logEvent("info", "Session reminder modal opened");
    savedFocusRegionRef.current = focusedRegion;
    setIsAnyModalOpen(true);
    setFocusedRegion(null);
    setSessionCursor(null);
    stop();
    setTimeout(() => speak(t("translations.Do you want to continue this session?")), 300);
  }, [showSessionReminder, speak, stop, t]);

  // ─── Session reminder: keyboard navigation ───────────────────────────────

  useEffect(() => {
    if (!showSessionReminder) return;
    const onKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setSessionCursor((p) => p === null ? 0 : (p + 1) % SESSION_BUTTON_COUNT);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSessionCursor((p) => p === null ? SESSION_BUTTON_COUNT - 1 : (p - 1 + SESSION_BUTTON_COUNT) % SESSION_BUTTON_COUNT);
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSessionEnter(sessionCursor);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showSessionReminder, sessionCursor]);

  // ─── Session reminder: speech on cursor change ────────────────────────────

  useEffect(() => {
    if (!showSessionReminder || sessionCursor === null) return;
    stop();
    speak(sessionCursor === 0 ? t("translations.Yes") : t("translations.No"));
  }, [sessionCursor, showSessionReminder, speak, stop, t]);

  // ─── Speech on room/floor view open ──────────────────────────────────────

  useEffect(() => {
    if (showRoomView && selectedSector && !loading && !loadingSeats) {
      if (hasSpokenRoomRef.current) return;
      hasSpokenRoomRef.current = true;
      stop();
      setTimeout(() => speak(t("speech.This is room page select your desired seat")), 300);
    }
    if (!showRoomView) hasSpokenRoomRef.current = false;
  }, [showRoomView, selectedSector, loading, loadingSeats, speak, stop, t]);

  useEffect(() => {
    if (!showRoomView && currentFloor) {
      if (hasSpokenFloorRef.current) return;
      hasSpokenFloorRef.current = true;
      stop();
      setTimeout(() => speak(t("speech.This screen is the floor or reading room selection screen.")), 300);
    }
    if (showRoomView) hasSpokenFloorRef.current = false;
  }, [showRoomView, currentFloor, speak, stop, t]);

  // ─── Speech on focused region change ─────────────────────────────────────

  useEffect(() => {
    if (!focusedRegion || isAnyModalOpen) return;
    if (lastFocusedRegionRef.current === focusedRegion) return;
    lastFocusedRegionRef.current = focusedRegion;
    stop();
    const regionSpeech = {
      [FocusRegion.FLOOR_STATS]: t("speech.Floor Selection Section"),
      [FocusRegion.FOOTER]: t("speech.Footer controls"),
      [FocusRegion.MINI_MAP]: t("speech.Mini map"),
      [FocusRegion.MAP]: t("speech.Floor map section"),
      [FocusRegion.ROOM]: t("speech.Room selection section"),
    };
    const text = regionSpeech[focusedRegion];
    if (text) speak(text);
  }, [focusedRegion, isAnyModalOpen, speak, stop, t]);

  // ─── Speech on main content cursor change ────────────────────────────────

  useEffect(() => {
    if (focusedRegion !== FocusRegion.MAP && focusedRegion !== FocusRegion.ROOM) return;
    if (mainContentCursor === null) return;

    const speechKey = `${focusedRegion}-${mainContentCursor}`;
    if (lastSpokenRef.current === speechKey) return;
    lastSpokenRef.current = speechKey;
    stop();

    if (mainContentCursor < LEGEND_BAR_COUNT) {
      const legendSpeeches = [
        t("speech.Floor legend location", {
          building: t(`translations.${"Central Library, Gwanjeong Building"}`),
          floor: formatFloorForSpeech(currentFloor?.title, lang),
          room: selectedSector?.MAPLABEL || "",
        }),
        t("speech.Available seats"),
        t("speech.Booked seats"),
        t("speech.Fixed seats"),
      ];
      speak(legendSpeeches[mainContentCursor]);
      return;
    }

    const contentIndex = mainContentCursor - LEGEND_BAR_COUNT;

    if (focusedRegion === FocusRegion.MAP && displayableSectors?.length) {
      const sector = displayableSectors[contentIndex];
      if (sector) speak(t("speech.MAP_SECTOR_INFO", { sector: getSectorLabel(sector) }));
    }

    if (focusedRegion === FocusRegion.ROOM && visibleSeats?.length) {
      const seat = visibleSeats[contentIndex];
      if (seat) {
        const isFixed = seat.STATUS === 9;
        const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
        const seatState = isFixed ? t("speech.fixed") : isAvailable ? t("speech.available") : t("speech.booked");
        speak(t("speech.Seat Label", { seat: seat.VNAME, state: seatState }));
      }
    }
  }, [focusedRegion, mainContentCursor, displayableSectors, visibleSeats, currentFloor, selectedSector, speak, stop, t, lang, getSectorLabel]);

  // ─── Idle timer ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!floorTimerConfig.state) return;
    clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      if (sessionReminderConfig.state && timeLeftRef.current === sessionReminderConfig.time) {
        logEvent("info", `Session reminder triggered at ${sessionReminderConfig.time}s remaining`);
        setShowSessionReminder(true);
      }
      if (timeLeftRef.current <= 0) {
        clearInterval(timerRef.current);
        logEvent("info", "Session expired — idle timer reached zero, logging out");
        localStorage.removeItem("authenticated");
        dispatch(clearUserInfo());
        navigate("/");
        return;
      }
      setTimeLeft(timeLeftRef.current);
    }, 1000);

    const resetTimer = () => {
      if (isAnyModalOpen || !resetTimerOnTouch) return;
      timeLeftRef.current = floorTimerConfig.time;
      setTimeLeft(floorTimerConfig.time);
    };

    if (resetTimerOnTouch) {
      window.addEventListener("click", resetTimer, true);
      window.addEventListener("touchstart", resetTimer, true);
    }

    return () => {
      clearInterval(timerRef.current);
      if (resetTimerOnTouch) {
        window.removeEventListener("click", resetTimer, true);
        window.removeEventListener("touchstart", resetTimer, true);
      }
    };
  }, [floorTimerConfig.state, sessionReminderConfig.state, resetTimerOnTouch, isAnyModalOpen]);

  // ─── Action handlers ──────────────────────────────────────────────────────

  const handleLogout = useCallback(() => {
    logEvent("info", "User logged out from floor page");
    localStorage.removeItem("authenticated");
    dispatch(logout());
    dispatch(clearUserInfo());
    navigate("/");
  }, [dispatch, navigate]);

  const handleImageError = useCallback(() => {
    logEvent("error", `Failed to load floor image: ${floorImageUrl}`);
    console.error("Failed to load floor image:", floorImageUrl);
    setImageError(true);
  }, [floorImageUrl, setImageError]);

  const fetchSeats = useCallback(async (sector) => {
    if (!sector) return;
    setLoadingSeats(true);
    logEvent("info", `Fetching seats for sector: ${sector.MAPLABEL} (sectorNo=${sector.SECTORNO})`);
    try {
      const seatList = await getSeatList({ sectorno: sector?.SECTORNO });
      console.log("seat res---------->", seatList);
      logEvent("info", `Seats loaded for sector ${sector.MAPLABEL}: ${Array.isArray(seatList) ? seatList.length : 0} seats`);
      setSeats(Array.isArray(seatList) ? seatList : []);
    } catch (err) {
      logEvent("error", `Seat fetch error for sector ${sector.MAPLABEL}: ${err.message}`);
      console.error("Seat fetch error:", err);
      setSeats([]);
    } finally {
      setLoadingSeats(false);
    }
  }, []);

  const backToFloorMap = useCallback(() => {
    logEvent("info", `Navigating back to floor map: ${currentFloor?.title}`);
    navigate(buildFloorPath(currentFloor?.title), {
      replace: true,
      state: { sectorList, floorInfo: currentFloor, mode: isMoveMode ? "move" : undefined },
    });
    setShowRoomView(false);
    setSelectedSector(null);
    setMiniMapError(false);
    setIsZoomed(false);
  }, [buildFloorPath, currentFloor, sectorList, isMoveMode, navigate]);

  const handleFloorClick = useCallback((floor) => {
    if (currentFloor?.id === floor.id) {
      if (showRoomView) {
        logEvent("info", `Same floor re-selected (${floor.title}) while in room view — returning to floor map`);
        backToFloorMap();
      }
      return;
    }
    logEvent("info", `Floor switched: ${currentFloor?.title} → ${floor.title}`);
    setCurrentFloor(floor);
    setSelectedSector(null);
    setShowRoomView(false);
    navigate(buildFloorPath(floor.title), {
      replace: true,
      state: { floorInfo: floor, mode: isMoveMode ? "move" : undefined },
    });
  }, [currentFloor, showRoomView, backToFloorMap, setCurrentFloor, buildFloorPath, navigate, isMoveMode]);

  const handleSectorClick = useCallback(async (sector) => {
    logEvent("info", `Sector selected: ${sector.MAPLABEL} (sectorNo=${sector.SECTORNO}, floor=${sector.FLOOR})`);
    setSelectedSector(sector);
    setShowRoomView(true);
    navigate(buildFloorPath(sector.FLOOR, sector.SECTORNO), {
      replace: false,
      state: { selectedSector: sector, sectorList, floorInfo: currentFloor, mode: isMoveMode ? "move" : undefined },
    });
    await fetchSeats(sector);
  }, [buildFloorPath, sectorList, currentFloor, isMoveMode, navigate, fetchSeats]);

  const handleMiniSectorClick = useCallback((sector) => {
    if (!sector) return;
    logEvent("info", `Mini-map sector clicked — panning to x:${sector.x1}, y:${sector.y1}`);
    setImageTransform((prev) => ({ ...prev, x: -sector.x1, y: -sector.y1 }));
  }, []);

  const handleSeatClick = useCallback((seat) => {
    const isAvailable = seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2);
    if (!isAvailable) return;
    logEvent("info", `Seat selected: ${seat.VNAME} (STATUS=${seat.STATUS}, USECNT=${seat.USECNT})`);
    setSelectedSeat(seat);
    setShowSeatModal(true);
    setIsAnyModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    logEvent("info", `Seat booking modal closed — seat: ${selectedSeat?.VNAME ?? "none"}`);
    setShowSeatModal(false);
    setSelectedSeat(null);
    setIsAnyModalOpen(false);
    setPersistedSeatSelection(null);
  }, [selectedSeat]);

  const handleSessionEnter = useCallback((index) => {
    if (index === 0) {
      logEvent("info", "Session extended by user");
      timeLeftRef.current = floorTimerConfig.time;
      setTimeLeft(floorTimerConfig.time);
    } else {
      logEvent("info", "Session extension declined by user");
    }
    setShowSessionReminder(false);
    setIsAnyModalOpen(false);

    // ✅ Restore focus that was active before the modal opened
    if (savedFocusRegionRef.current !== null) {
      setFocusedRegion(savedFocusRegionRef.current);
      savedFocusRegionRef.current = null;
    }
  }, [floorTimerConfig.time]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const isMapOrRoomFocused = focusedRegion === FocusRegion.ROOM || focusedRegion === FocusRegion.MAP;

  return (
    <div className="relative h-screen w-screen overflow-hidden font-bold text-white">
      <img src={BgMainImage} className="absolute inset-0 h-full w-full object-cover" alt="background" />
      <div className="contrast-overlay absolute inset-0 pointer-events-none"></div>
      {/* ═══ MAIN CONTENT ═══ */}
      <div className={`relative inset-0 h-[900px] flex items-center justify-center z-0
        ${isMapOrRoomFocused ? "border-[6px] border-[#dc2f02]" : "border-[6px] border-transparent"} box-border`}>

        <FloorLegendBar
          buildingName="Central Library, Gwanjeong Building"
          floorName={currentFloor?.name}
          roomName={selectedSector?.MAPLABEL}
          isFocused={isMapOrRoomFocused}
          isAnyModalOpen={isAnyModalOpen}
          cursor={mainContentCursor}
          SECTION_COUNT={LEGEND_BAR_COUNT}
        />

        {currentFloor && (
          <div className="relative w-full h-[720px] bg-white/10 backdrop-blur-sm rounded-lg shadow-2xl top-[80px]">
            {loading ? (
              <LoadingSpinner />
            ) : showRoomView && selectedSector ? (
              <RoomView
                key={selectedSector?.SECTOR_IMAGE}
                selectedSector={selectedSector}
                baseUrl={imageBaseUrl}
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
                isZoomed={isZoomed}
                isPanning={isPanning}
                onMiniSectorClick={handleMiniSectorClick}
                onSeatClick={handleSeatClick}
                onMiniMapError={() => {
                  logEvent("error", `Mini-map image failed to load for sector: ${selectedSector?.MAPLABEL}`);
                  setMiniMapError(true);
                }}
                isMinimapFocused={focusedRegion === FocusRegion.MINI_MAP}
                minimapFocusIndex={miniMapCursor}
                focusedRegion={focusedRegion}
                focusedSeatIndex={mainContentCursor !== null && mainContentCursor >= LEGEND_BAR_COUNT ? mainContentCursor - LEGEND_BAR_COUNT : -1}
                visibleSeatsFromParent={setVisibleSeats}
                onSectorsCalculated={setMinimapSectorCount}
              />
            ) : (
              <div className="relative w-full h-full">
                <FloorMapImage
                  floorImageUrl={floorImageUrl}
                  currentFloor={currentFloor}
                  onImageError={handleImageError}
                  imageError={imageError}
                />

                {!imageError && displayableSectors.map((sector, sectorIndex) => {
                  const mapStylesList = parseMapPoint(sector.MAPPOINT);
                  const isSectorFocused = focusedRegion === FocusRegion.MAP && mainContentCursor === sectorIndex + LEGEND_BAR_COUNT;

                  return mapStylesList.map((mapStyles, idx) => {
                    const label = getSectorLabel(sector, idx) || "";
                    const words = label.split(" ");
                    const isLong = words.length > 3;

                    return (
                      <button
                        key={`${sector.SECTORNO}-${idx}`}
                        onClick={() => handleSectorClick(sector)}
                        className="group absolute transition-all z-20"
                        aria-selected={isSectorFocused}
                        style={{
                          top: `calc(${mapStyles.top} - 45px)`,
                          left: mapStyles.left,
                          right: mapStyles.right,
                          width: mapStyles.width,
                          height: mapStyles.height,
                        }}
                      >
                        {isSectorFocused && (
                          <div className="pointer-events-none absolute inset-0 rounded border-[6px] border-[#dc2f02] z-30" />
                        )}
                        <div className="pointer-events-none absolute inset-0 bg-[#FFCA08]/20 border-2 border-[#FFCA08] rounded opacity-0 group-hover:opacity-100 transition-all duration-200 z-20" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 pointer-events-none z-40">
                          <span className="bg-[#9A7D4C] text-white px-4 py-1.5 rounded-md text-[30px] font-bold shadow-lg text-center whitespace-nowrap inline-block leading-[1.1]">
                            {isLong ? (<>{words.slice(0, -2).join(" ")}<br />{words.slice(-2).join(" ")}</>) : label}
                          </span>
                        </div>
                      </button>
                    );
                  });
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ FLOOR STATS ═══ */}
      <div className="absolute bottom-20 left-0 right-0 z-20 px-4">
        <FloorStatsBar
          floors={floors}
          currentFloor={currentFloor}
          onFloorClick={handleFloorClick}
          loading={loading}
          isFocused={focusedRegion === FocusRegion.FLOOR_STATS}
          isAnyModalOpen={isAnyModalOpen}
          isMinimapNearFloorStats={isMinimapNearFloorStats}
        />
      </div>

      {/* ═══ FOOTER ═══ */}
      <FooterControls
        userInfo={userInfo}
        logout={handleLogout}
        isFocused={focusedRegion === FocusRegion.FOOTER}
        isAnyModalOpen={isAnyModalOpen}
        showBack={showRoomView}
        onBack={backToFloorMap}
        timer={timeLeft}
      />

      {/* ═══ SEAT BOOKING MODAL ═══ */}
      <SeatActionModal
        mode={isMoveMode ? "move" : isSeatAssignMode ? "seatAssign" : "booking"}
        seat={selectedSeat}
        isOpen={showSeatModal}
        onClose={handleCloseModal}
        bookingNo={bookingNo}     
        logoutOnSuccess={isSeatAssignMode} 
        disableFocusAndSpeech={showSessionReminder}
        persistedSelection={persistedSeatSelection}
        onSelectionChange={setPersistedSeatSelection}
      />

      {/* ═══ SESSION REMINDER MODAL ═══ */}
      <Modal
        isOpen={showSessionReminder}
        onClose={() => setShowSessionReminder(false)}
        title={t("translations.Session Extension")}
        size="medium"
        showCloseButton={false}
        zIndex={9999}
        className="session-reminder-modal border-[6px] border-[#dc2f02] rounded"
      >
        <div className="flex flex-col items-center gap-6 p-6">
          <p className="text-[30px] text-[#000] text-center font-medium">
            {t("translations.Do you want to continue this session?")}
          </p>
          <div className="flex gap-4 w-full justify-center">
            <button
              onClick={() => handleSessionEnter(0)}
              className={`px-8 py-3 rounded-full bg-[#66b2b2] text-white font-bold text-[30px] min-w-[120px]
                ${sessionCursor === 0 ? "outline-[6px] outline-[#dc2f02]" : ""}`}
            >
              {t("translations.Yes")}
            </button>
            <button
              onClick={() => handleSessionEnter(1)}
              className={`px-8 py-3 rounded-full bg-gray-500 text-white font-bold text-[30px] min-w-[120px]
                ${sessionCursor === 1 ? "outline-[6px] outline-[#dc2f02]" : ""}`}
            >
              {t("translations.No")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Floor;