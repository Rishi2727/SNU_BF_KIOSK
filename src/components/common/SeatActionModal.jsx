import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import {
    setSeatAssign,
    setExtend,
    setReturnSeat,
    setMove,
    setAssignSeatInfo,
    setApiLang
} from "../../services/api";
import { clearUserInfo } from "../../redux/slice/userInfo";
import { clearBookingTime, fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
import {
    formatDate,
    formatDateNum,
    formatTimeNum,
    addMinutes,
    DATE_FORMATS,
    formatEndTime
} from "../../utils/momentConfig";
import { MODE_LABELS, MODES } from "../../utils/constant";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";
import { useSerialPort } from "../../context/SerialPortContext";
import { logout } from "../../redux/slice/authSlice";
import { getPrintData } from "../layout/floor/PrintSlip";
import { FaCheck, FaTimes } from "react-icons/fa";
import { fetchBookingList } from "../../redux/slice/bookingHistroySlice";
import { fetchUserInfo } from "../../redux/slice/getUserDataSlice";

// Label-only element types that should be skipped during keyboard nav
const LABEL_TYPES = new Set(["name-label", "date-label", "start-label", "action-label"]);

const SeatActionModal = ({
    mode = MODES.BOOKING,
    seat,
    assignNo,
    isOpen,
    onClose,
    onBackToUserInfo,
    disableFocusAndSpeech = false,
    logoutOnSuccess = false,
    persistedSelection = null,
    onSelectionChange = null,
}) => {
    const modeFlags = useMemo(() => ({
        isBooking: mode === MODES.BOOKING,
        isExtension: mode === MODES.EXTENSION,
        isReturn: mode === MODES.RETURN,
        isMove: mode === MODES.MOVE,
        isAssignCheck: mode === MODES.ASSIGN_CHECK
    }), [mode]);
    const { isBooking, isExtension, isReturn, isMove, isAssignCheck } = modeFlags;

    const { speak, stop } = useVoice();
    const { t } = useTranslation();
    const { userInfo } = useSelector((state) => state.userInfo);
    const { timeOptions, defaultIndex } = useSelector((state) => state.bookingTime);
    const { bookingList: bookingSeatInfo, loading: bookingLoading } = useSelector((state) => state.booking)
    const { userInfo: userData, loading: userDataLoading } = useSelector((state) => state.user);
    const lang = useSelector((state) => state.lang.current);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [startTime] = useState(new Date());
    const [endTime, setEndTime] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [actionResult, setActionResult] = useState(null);
    const [seatInfo, setSeatInfo] = useState(null);
    const [focusIndex, setFocusIndex] = useState(0);
    const [isModalFocused, setIsModalFocused] = useState(false);
    const [loadingTime, setLoadingTime] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const lastSpokenRef = useRef("");
    const isFirstOpenRef = useRef(false);
    const { writeToSerialPort, serialPortsData } = useSerialPort();
    console.log("action errror", actionResult?.message)
    const languageCode = localStorage.getItem("lang") === "ko" ? "ko" : "en";
    const uiDateFormat = languageCode === "ko" ? DATE_FORMATS.KO_DATETIME : DATE_FORMATS.DATETIME;
    useEffect(() => {
        if (!isOpen) return;

        if (!(isReturn || isExtension || isMove || isAssignCheck)) return;

        const fetchBooking = async () => {
            try {
                const today = formatDateNum(new Date());

                await dispatch(
                    fetchBookingList({
                        schoolno: userInfo?.SCHOOLNO,
                        sDate: today,
                        eDate: today,
                    })
                );
            } catch (err) {
                console.error("Fetch booking failed", err);
            }
        };

        fetchBooking();

    }, [isOpen, isReturn, isExtension, isMove, dispatch, userInfo]);
    const activeBooking = useMemo(() => {
        if (!bookingSeatInfo?.length) return null;
        return bookingSeatInfo.find(item => item.STATUS === 3);
    }, [bookingSeatInfo]);

    useEffect(() => {
        if (userInfo?.SCHOOLNO) {
            dispatch(fetchUserInfo({ schoolno: userInfo?.SCHOOLNO }));
        }
    }, [dispatch, userInfo?.SCHOOLNO]);
    // Derived flags
    const isAvailable = useMemo(() => {
        if (!(isBooking || isMove)) return true;
        return seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false;
    }, [isBooking, isMove, seat]);

    const isInitialLoading = isOpen && loading && !showResultModal;
    const isConfirmMode = isReturn || isMove || confirmStep;

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const formatDurationLabel = useCallback((minutes) => {
        if (!minutes) return "";
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const isEn = t("translations.hour") === "hour";
        if (isEn) {
            if (hrs && mins) return `${hrs} ${t("translations.hour")}${hrs > 1 ? "s" : ""} ${mins} ${t("translations.minutes")}`;
            if (hrs) return `${hrs} ${t("translations.hour")}${hrs > 1 ? "s" : ""}`;
            return `${mins} ${t("translations.minutes")}`;
        }
        if (hrs && mins) return `${hrs}${t("translations.hour")} ${mins}${t("translations.minutes")}`;
        if (hrs) return `${hrs}${t("translations.hour")}`;
        return `${mins}${t("translations.minutes")}`;
    }, [t]);

    // ─── Focus system ────────────────────────────────────────────────────────────

    const getFocusableElements = useCallback(() => {
        const elements = [];
        if (showResultModal) {
            elements.push({ type: "result-message", label: "Result Message" });
            elements.push({ type: "confirm-button", label: "Confirm Button" });
            if (actionResult?.success) elements.push({ type: "print-button", label: "Print Button" });
            return elements;
        }

        elements.push({ type: "title", label: "Modal Title" });
        elements.push({ type: "header", label: "Location Information" });

        if (isAssignCheck && seatInfo) {
            elements.push({ type: "name-label", label: "Name Label" });
            elements.push({ type: "name-value", label: "Name Value" });
            elements.push({ type: "time-label", label: "Time Label" });
            elements.push({ type: "time-value", label: "Time Value" });
            elements.push({ type: "confirm-button", label: "Confirm Button" });
        } else {
            elements.push({ type: "name-label", label: "Name Label" });
            elements.push({ type: "name-value", label: "Name Value" });

            if (!isReturn && !isMove) {
                elements.push({ type: "date-label", label: "Date Duration Label" });
                elements.push({ type: "date-value", label: "Date Duration Value" });
            } else if (isReturn) {
                elements.push({ type: "start-label", label: "Start Hours Label" });
                elements.push({ type: "start-value", label: "Start Hours Value" });
            }

            elements.push({ type: "action-label", label: "Action Label" });

            if (isConfirmMode) {
                elements.push({ type: "confirmation-message", label: "Confirmation Message" });
            } else if (!loading && timeOptions.length > 0) {
                timeOptions.forEach((opt, i) => {
                    if (opt.enabled) elements.push({ type: "time-button", label: opt.label, index: i, value: opt.value });
                });
            }

            elements.push({ type: "cancel-button", label: "Cancel Button" });
            elements.push({ type: "confirm-button", label: "Confirm Button" });
        }
        return elements;
    }, [showResultModal, isAssignCheck, seatInfo, isReturn, isMove, isConfirmMode, loading, timeOptions, actionResult]);

    const getNextVisibleFocusIndex = useCallback((current, direction) => {
        const items = getFocusableElements();
        const len = items.length;
        let next = current;
        do {
            next = direction === "next" ? (next + 1) % len : (next - 1 + len) % len;
        } while (LABEL_TYPES.has(items[next]?.type));
        return next;
    }, [getFocusableElements]);

    const isFocused = useCallback((elementType, elementIndex = null) => {
        if (!isModalFocused) return false;
        const current = getFocusableElements()[focusIndex];
        if (!current) return false;
        return elementIndex !== null
            ? current.type === elementType && current.index === elementIndex
            : current.type === elementType;
    }, [isModalFocused, focusIndex, getFocusableElements]);

    const isGroupFocused = useCallback((types = []) => {
        if (!isModalFocused) return false;
        const current = getFocusableElements()[focusIndex];
        return current ? types.includes(current.type) : false;
    }, [isModalFocused, focusIndex, getFocusableElements]);

    // ─── API calls ───────────────────────────────────────────────────────────────
    const executeApiCall = useCallback(async () => {
        if (isBooking) {
            return await setSeatAssign({
                seatno: seat.SEATNO,
                date: formatDateNum(startTime),
                useTime: `${formatTimeNum(startTime)}-${formatTimeNum(endTime)}`,
                schoolno: userInfo.SCHOOLNO,
            });
        }
        if (isExtension) {
            const minutes = Number(timeOptions[selectedIndex].value);

            return await setExtend({
                bseqno: activeBooking?.BSEQNO,
                min: minutes,
                endTime: formatEndTime(activeBooking?.USEEXPIRE, minutes),
            });
        }
        if (isReturn) {
            return await setReturnSeat({
                bseqno: assignNo ?? activeBooking?.BSEQNO
            });
        }
        if (isMove) {
            return await setMove({
                bseqno: userInfo?.ASSIGN_NO || assignNo,
                newSeatno: seat.SEATNO,
            });
        }
    }, [isBooking, isExtension, isReturn, isMove, seat, assignNo, startTime, endTime, timeOptions, selectedIndex, activeBooking, userInfo]);

    // ─── Handlers ────────────────────────────────────────────────────────────────

    const handleTimeSelect = useCallback((index, value) => {
        setSelectedIndex(index);
        setEndTime(addMinutes(value).toDate());
        lastSpokenRef.current = "";
        if (onSelectionChange) onSelectionChange({ selectedIndex: index, endTime: addMinutes(value).toDate() });
    }, [onSelectionChange]);

    const handleFinalConfirm = useCallback(async () => {
        if (!isReturn && !isMove && selectedIndex === null) return;
        if ((isBooking || isMove) && !isAvailable) return;

        try {
            setLoading(true);

            // ── Sync lang before every API call ──
            await setApiLang(lang);

            if ((isBooking || isMove) && seat) {
                setSeatInfo({
                    FLOOR_NAME: seat.SECTOR_NAME || "",
                    SECTOR_NAME: seat.NAME || "",
                    SEAT_VNAME: seat.VNAME || "",
                });
            }

            const res = await executeApiCall();
            onClose();

            const msgKey =
                isBooking ? "Seat Booked Successfully"
                    : isMove ? "Seat Moved Successfully"
                        : isExtension ? "Seat Extension Successful"
                            : "Seat Returned Successfully";

            setActionResult({
                success: res?.header?.resultCode === "200",
                message: res?.header?.resultCode === "200"
                    ? msgKey
                    : res?.header?.resultMsg || "Operation failed"
            });
            setShowResultModal(true);
        } catch (err) {
            onClose();
            setActionResult({ success: false, message: err?.response?.data?.msg });
            setShowResultModal(true);
        } finally {
            setLoading(false);
        }
    }, [isReturn, isMove, isBooking, isExtension, selectedIndex, isAvailable, executeApiCall, onClose, seat, lang]);
    const handleResultModalClose = useCallback(async () => {
        setShowResultModal(false);

        const wasSuccessful = actionResult?.success;
        setActionResult(null);

        if (wasSuccessful || logoutOnSuccess) {
            try {
                localStorage.removeItem("authenticated");
                dispatch(clearUserInfo());
                dispatch(logout());
                navigate("/");
            } catch (err) {
                console.error("Logout error:", err);
            }
        }
    }, [actionResult, dispatch, navigate, logoutOnSuccess]);

    const handlePrint = useCallback(async () => {
        try {
            const dateFormat = languageCode === "ko" ? DATE_FORMATS.KO_DATETIME : DATE_FORMATS.DATETIME;
            const formattedData = {
                USER_NAME: userData?.NAME || "",
                SCHOOL_NO: userInfo?.SCHOOLNO || "",
                BOOKING_DATE: formatDate(startTime, dateFormat),
                ROOM: seatInfo?.FLOOR_NAME || "",
                SEAT_NO: seat?.VNAME || activeBooking?.SEAT_VNAME || seatInfo?.SEAT_VNAME || "",
                CHECKIN_TIME: formatDate(startTime, dateFormat),
                CHECKOUT_TIME: endTime
                    ? formatDate(endTime, dateFormat)
                    : activeBooking?.USEEXPIRE
                        ? formatDate(activeBooking.USEEXPIRE, dateFormat)
                        : "",
                BARCODE: userInfo?.SCHOOLNO || "",
                USER_ID_QR: userInfo?.SCHOOLNO || "",
            };
            const printerConfig = Array.isArray(serialPortsData)
                ? serialPortsData.find((p) => p.name === "PRINTER")
                : null;
            const printData = getPrintData(formattedData, t);
            const printOptions = {
                port_name: printerConfig?.port,
                baud_rate: printerConfig?.baudrate,
                commands: printData.commands.map((c) => ({ type: c.type, value: c.value || null })),
            };
            await writeToSerialPort(printerConfig, printOptions);
            dispatch(logout());
            navigate("/");
        } catch (err) {
            console.error("Error printing:", err);
        }
    }, [userInfo, seat, activeBooking, seatInfo, startTime, endTime, serialPortsData, writeToSerialPort, t, dispatch, navigate, languageCode]);

    const handleEnterPress = useCallback((focusedElement) => {
        if (!focusedElement) return;
        switch (focusedElement.type) {
            case "time-button":
                handleTimeSelect(focusedElement.index, focusedElement.value);
                break;
            case "cancel-button":
                setConfirmStep(false);
                onClose();
                if (onBackToUserInfo) setTimeout(() => onBackToUserInfo(), 200);
                break;
            case "confirmation-message":
                if (isConfirmMode) handleFinalConfirm();
                break;
            case "confirm-button":
                if (isAssignCheck) {
                    onClose();
                    if (onBackToUserInfo) setTimeout(() => onBackToUserInfo(), 300);
                    return;
                }
                if (showResultModal) {
                    handleResultModalClose();
                } else if (isConfirmMode) {
                    handleFinalConfirm();
                } else {
                    setConfirmStep(true);
                }
                break;
            case "print-button":
                handlePrint();
                break;
            default:
                break;
        }
    }, [showResultModal, isConfirmMode, isAssignCheck, handleFinalConfirm, handlePrint, handleResultModalClose, onClose, onBackToUserInfo]);

    // ─── Effects ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (!isOpen) {
            isFirstOpenRef.current = false; // reset when closed
            return;
        }

        // ✅ Only reset focusIndex on a genuine fresh open, not when persistedSelection updates
        if (!isFirstOpenRef.current) {
            isFirstOpenRef.current = true;
            setIsModalFocused(!disableFocusAndSpeech);
            setFocusIndex(0);
            setConfirmStep(false);
        } else {
            // Modal is already open — only sync focus/speech toggle, don't touch focusIndex
            setIsModalFocused(!disableFocusAndSpeech);
        }

        if (persistedSelection) {
            setSelectedIndex(persistedSelection.selectedIndex);
            setEndTime(persistedSelection.endTime);
        } else {
            setSelectedIndex(null);
            setEndTime(null);
        }
    }, [isOpen, disableFocusAndSpeech, persistedSelection]);

    useEffect(() => {
        if (isOpen && confirmStep) setFocusIndex(0);
    }, [confirmStep, isOpen]);

    useEffect(() => {
        if (showResultModal) {
            setIsModalFocused(true);
            setFocusIndex(0);
        }
    }, [showResultModal]);

    useEffect(() => {
        if (!isOpen || !isAssignCheck || !activeBooking) return;

        const fetchInfo = async () => {
            try {
                setLoading(true);
                setSeatInfo(null);
                setApiLang(lang);

                const res = await setAssignSeatInfo({
                    schoolno: userInfo?.SCHOOLNO,
                    date: formatDateNum(new Date()),
                    seatno: activeBooking?.SEATNO,
                    useTime: `${formatTimeNum(activeBooking?.USESTART)}-${formatTimeNum(activeBooking?.USEEXPIRE)}`
                });

                console.log("SeatBooking result:", res);

                if (res) {
                    setSeatInfo({
                        FLOOR_NAME: activeBooking?.FLOOR_NAME,
                        SECTOR_NAME: activeBooking?.SECTOR_NAME,
                        SEAT_VNAME: activeBooking?.SEAT_VNAME,
                        USESTART: activeBooking?.USESTART,
                        USEEXPIRE: activeBooking?.USEEXPIRE
                    });
                }

            } catch (err) {
                console.error("Seat booking API failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();

    }, [isOpen, isAssignCheck, activeBooking, userInfo, lang]);

    useEffect(() => {
        if (isReturn || isMove || isAssignCheck) return;
        if (persistedSelection) return; // ✅ Don't override a restored selection

        if (defaultIndex !== null && timeOptions[defaultIndex]?.enabled) {
            setSelectedIndex(defaultIndex);
            setEndTime(addMinutes(timeOptions[defaultIndex].value).toDate());
        } else if (timeOptions.length > 0) {
            // ✅ Fall back to 30 min default if API doesn't set a defaultIndex
            const thirtyMinIndex = timeOptions.findIndex(opt => opt.enabled && opt.value === 30);
            const fallbackIndex = thirtyMinIndex !== -1 ? thirtyMinIndex : timeOptions.findIndex(opt => opt.enabled);
            if (fallbackIndex !== -1) {
                setSelectedIndex(fallbackIndex);
                setEndTime(addMinutes(timeOptions[fallbackIndex].value).toDate());
                if (onSelectionChange) onSelectionChange({
                    selectedIndex: fallbackIndex,
                    endTime: addMinutes(timeOptions[fallbackIndex].value).toDate()
                });
            }
        }
    }, [timeOptions, defaultIndex, isReturn, isMove, isAssignCheck, persistedSelection]);

    useEffect(() => {
        if (!isOpen) return;
        if (isAssignCheck) return;
        dispatch(clearBookingTime());
        setApiLang(lang);
        setLoadingTime(true); // ← add this

        const fetchTime = async () => {
            try {
                if (isBooking && seat?.SEATNO && isAvailable) {
                    await dispatch(fetchBookingTime({ seatno: seat.SEATNO }));
                } else if ((isExtension || isReturn || isMove) && assignNo) {
                    await dispatch(fetchBookingTime({ seatno: assignNo }));
                }
            } finally {
                setLoadingTime(false); // ← add this
            }
        };
        fetchTime();
    }, [isOpen, seat, assignNo, isAvailable, isBooking, isExtension, isReturn, isMove]);
    useEffect(() => {
        if (disableFocusAndSpeech) return;
        if ((!isOpen && !showResultModal) || !isModalFocused) return;
        const handleKeyDown = (e) => {
            const focusableElements = getFocusableElements();
            switch (e.key) {
                case "ArrowRight":
                    e.preventDefault();
                    setFocusIndex(prev => getNextVisibleFocusIndex(prev, "next"));
                    break;
                case "ArrowLeft":
                    e.preventDefault();
                    setFocusIndex(prev => getNextVisibleFocusIndex(prev, "prev"));
                    break;
                case "Enter":
                    e.preventDefault();
                    handleEnterPress(focusableElements[focusIndex]);
                    break;
                default:
                    break;
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isModalFocused, focusIndex, getFocusableElements, showResultModal, disableFocusAndSpeech, handleEnterPress, getNextVisibleFocusIndex]);

    useEffect(() => {
        if (!isOpen && !showResultModal) {
            stop();
            lastSpokenRef.current = "";
        }
    }, [isOpen, showResultModal, stop]);

    useEffect(() => {
        if ((!isOpen && !showResultModal) || !isModalFocused) return;
        lastSpokenRef.current = "";
    }, [isOpen, showResultModal, isModalFocused]);

    // ─── Speech ──────────────────────────────────────────────────────────────────
    const getSpeechForFocusedElement = useCallback((element) => {
        if (!element) return "";

        const booking = activeBooking;
        switch (element.type) {

            case "title":
                return isAssignCheck
                    ? t("translations.Seat information")
                    : t(`translations.${MODE_LABELS[mode]}`);

            case "header": {
                if (isAssignCheck && booking)
                    return `${t("translations.Central Library")} ${booking.FLOOR_NAME} ${booking.SECTOR_NAME} ${booking.SEAT_VNAME}`;

                if (seat || booking)
                    return `${t("translations.Central Library")} ${seat?.ROOM_NAME || booking?.FLOOR_NAME} ${seat?.NAME || booking?.SECTOR_NAME} ${seat?.VNAME || booking?.SEAT_VNAME}`;

                return "";
            }

            case "name-label":
            case "name-value":
                return t("speech.SEAT_MODAL_USER_NAME", { name: userData?.NAME });

            case "date-label":
            case "date-value": {
                const startStr = formatDate(startTime, uiDateFormat);
                const endStr = endTime ? formatDate(endTime, uiDateFormat) : "";

                return t("speech.dateDurationRange", {
                    start: startStr,
                    end: endStr,
                });
            }

            case "time-label":
            case "time-value": {
                if (!booking?.USESTART || !booking?.USEEXPIRE)
                    return t("translations.Time of use");

                return `${t("translations.Time of use")}: ${formatDate(booking.USESTART, uiDateFormat)} ${t("speech.to")} ${formatDate(booking.USEEXPIRE, uiDateFormat)}`;
            }

            case "start-label":
            case "start-value": {
                const startStr = formatDate(startTime, uiDateFormat);
                const endStr = booking?.USEEXPIRE
                    ? formatDate(booking.USEEXPIRE, uiDateFormat)
                    : "";

                return `${t("translations.Start hours")}: ${startStr} ${t("speech.to")} ${endStr}.`;
            }

            case "action-label":
                return t("speech.SEAT_MODAL_ACTION_SECTION");

            case "time-button":
                return t("speech.SEAT_MODAL_TIME_OPTION", {
                    time: formatDurationLabel(element.value),
                });

            case "confirmation-message":
                if (isMove) return t("speech.SEAT_MODAL_MOVE_CONFIRM");
                if (isReturn) return t("speech.SEAT_MODAL_RETURN_CONFIRM");
                if (isExtension) return t("speech.SEAT_MODAL_EXTENSION_CONFIRM");

                return t("speech.SEAT_MODAL_CONFIRM_GENERIC", {
                    action: t(`translations.${MODE_LABELS[mode]}`),
                });

            case "cancel-button":
                return t("speech.Cancel");

            case "confirm-button":
                return t("speech.Confirm");

            case "print-button":
                return t("translations.Print");

            case "result-message":
                return `${t(`translations.${MODE_LABELS[mode]}`)}. ${t(`translations.${actionResult?.message}`)}`;

            default:
                return "";
        }
    }, [
        t,
        mode,
        userInfo,
        isMove,
        isReturn,
        isAssignCheck,
        actionResult,
        startTime,
        endTime,
        seatInfo,
        seat,
        uiDateFormat,
        formatDurationLabel,
        activeBooking
    ]);
    useEffect(() => {
        if (disableFocusAndSpeech) return;
        if (!isOpen && !showResultModal) return;
        if (!isModalFocused) return;
        const currentElement = getFocusableElements()[focusIndex];
        if (!currentElement) return;
        const speechText = getSpeechForFocusedElement(currentElement);
        if (!speechText || speechText === lastSpokenRef.current) return;
        stop();
        lastSpokenRef.current = speechText;
        setTimeout(() => speak(speechText), 150);
    }, [isOpen, showResultModal, isModalFocused, focusIndex, getFocusableElements, getSpeechForFocusedElement, speak, stop, disableFocusAndSpeech]);

    // ─── Render helpers ──────────────────────────────────────────────────────────

    const focusClass = "outline-[6px] outline-[#dc2f02]";

    const renderHeader = useMemo(() => {
        const headerClass = `mb-10 p-2 border-4 border-[#DDAB2C] rounded-2xl shadow-md ${isFocused("header") ? focusClass : ""}`;
        const textClass = "text-center text-[30px] text-[#DDAB2C] font-bold";

        // ❌ Don't show anything while loading
        if (loading) {
            return (
                <div className="mb-10 p-4">
                    <div className="h-8 bg-gray-300 animate-pulse rounded w-2/3 mx-auto"></div>
                </div>
            );
        }

        if (isAssignCheck && seatInfo) {
            return (
                <div className={headerClass}>
                    <p className={textClass}>
                        {t("translations.Central Library")} → {seatInfo.FLOOR_NAME} → {seatInfo.SECTOR_NAME} →
                        <span className="text-red-600 font-extrabold ml-3">{seatInfo.SEAT_VNAME}</span>
                    </p>
                </div>
            );
        }

        if ((isBooking || isMove || isExtension || isReturn) && (seat || activeBooking)) {
            return (
                <div className={headerClass}>
                    <p className={textClass}>
                        {t("translations.Central Library")} → {seat?.ROOM_NAME || activeBooking?.FLOOR_NAME} →{" "}
                        {seat?.NAME || activeBooking?.SECTOR_NAME} →
                        <span className="text-red-600 font-extrabold ml-3">
                            {(seat?.VNAME || activeBooking?.SEAT_VNAME) ?? "-"}
                        </span>
                    </p>
                </div>
            );
        }

    }, [
        loading, // ✅ ADD THIS
        isAssignCheck,
        isBooking,
        isMove,
        isExtension,
        isReturn,
        seatInfo,
        seat,
        activeBooking,
        mode,
        isFocused,
        t,
        lang
    ]);
    const renderTimeSelection = useMemo(() => (
        <div className="grid grid-cols-3 gap-2">
            {timeOptions.map((opt, i) => (
                <button
                    key={i}
                    disabled={!opt.enabled}
                    onClick={() => handleTimeSelect(i, opt.value)}
                    className={`text-[30px] font-bold py-1 px-2 rounded-lg ml-1 transition-all 
                        ${selectedIndex === i
                            ? "bg-linear-to-r from-[#FFCB35] to-[#dfac15] text-white scale-105 shadow-xl"
                            : opt.enabled ? "bg-gray-400 hover:bg-gray-300" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        } ${isFocused("time-button", i) ? focusClass : ""}`}
                >
                    {formatDurationLabel(opt.value)}
                </button>
            ))}
        </div>
    ), [timeOptions, selectedIndex, handleTimeSelect, isFocused, formatDurationLabel]);

    const renderConfirmationMessage = () => {
        if (!isConfirmMode) return null;

        return (
            <p className="text-red-600 font-extrabold text-[30px]">
                {isMove
                    ? t("translations.Do you want to move to this seat?")
                    : isReturn
                        ? t("translations.Do you want to return the seat?")
                        : isExtension
                            ? t("translations.Do you want to extend the seat?") // ✅ ADD THIS
                            : t("translations.SEAT_CONFIRM_GENERIC", {
                                action: t(`translations.${MODE_LABELS[mode]}`)
                            })}
            </p>
        );
    };

    const mainFooter = useMemo(() => {
        if (isAssignCheck) {
            return (
                <div className="flex justify-center">
                    <button
                        onClick={() => { onClose(); if (onBackToUserInfo) setTimeout(() => onBackToUserInfo(), 300); }}
                        className={`text-[30px] px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold ${isFocused("confirm-button") ? focusClass : ""}`}
                    >
                        {t("translations.Confirm")}
                    </button>
                </div>
            );
        }

        const isConfirmDisabled =
            (isBooking && (!isAvailable || selectedIndex === null || !endTime)) ||
            (isExtension && (selectedIndex === null || !endTime));

        const confirmEnabled = !isConfirmDisabled && (isConfirmMode || selectedIndex !== null) && (!(isBooking || isMove) || isAvailable);

        return (
            <div className="flex gap-4">
                <button
                    onClick={() => { setConfirmStep(false); onClose(); if (onBackToUserInfo) setTimeout(() => onBackToUserInfo(), 200); }}
                    className={`flex-1 text-[30px] px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold ${isFocused("cancel-button") ? focusClass : ""}`}
                >
                    {t("translations.Cancel")}
                </button>
                <button
                    onClick={isConfirmMode ? handleFinalConfirm : () => setConfirmStep(true)}
                    disabled={isConfirmDisabled}
                    className={`flex-1 px-6 py-4 rounded-lg font-bold text-[30px]
                        ${confirmEnabled ? "bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
                        ${isFocused("confirm-button") ? focusClass : ""}`}
                >
                    {t("translations.Confirm")}
                </button>
            </div>
        );
    }, [isAssignCheck, isReturn, isMove, isBooking, isExtension, isAvailable, selectedIndex, endTime, isConfirmMode, onClose, onBackToUserInfo, handleFinalConfirm, isFocused, t]);

    const resultFooter = useMemo(() => (
        <div className="flex gap-10 justify-center">
            <button
                onClick={handleResultModalClose}
                className={`px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold text-[30px] ${isFocused("confirm-button") ? focusClass : ""}`}
            >
                {t("translations.Confirm")}
            </button>
            {actionResult?.success && (isBooking || isMove) && (
                <button
                    onClick={handlePrint}
                    className={`px-15 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold text-[30px] ${isFocused("print-button") ? focusClass : ""}`}
                >
                    {t("translations.Print")}
                </button>
            )}
        </div>
    ), [handleResultModalClose, handlePrint, actionResult, isFocused, isBooking, isMove, t]);

    // ─── Render ──────────────────────────────────────────────────────────────────
    const isTimeReady =
        isAssignCheck ||
        isReturn ||
        isMove ||
        (timeOptions.length > 0 && !loadingTime);
    return (
        <>
            {isOpen && (isInitialLoading || !isTimeReady) && (
                <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <LoadingSpinner size={120} />
                </div>
            )}

            <Modal
                isOpen={isOpen && !isInitialLoading}
                onClose={onClose}
                title=""
                size=""
                footer={mainFooter}
                showCloseButton={false}
                className={`seat-action-modal ${focusClass}`}
            >
                <h2 className={`text-[36px] font-extrabold text-center text-[#f7c224] mb-8 tracking-wide ${isFocused("title") ? `${focusClass} rounded-lg` : ""}`}>
                    {isAssignCheck ? t("translations.Seat information") : t(`translations.${MODE_LABELS[mode]}`)}
                </h2>

                {loading ? (
                    <div className="flex justify-center py-20"><LoadingSpinner size={80} /></div>
                ) : isAssignCheck && seatInfo ? (
                    <>
                        {renderHeader}
                        <div className="space-y-4 mb-8 text-[30px]">
                            <div className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-2 ${isGroupFocused(["name-label", "name-value"]) ? focusClass : ""}`}>
                                <span className="text-gray-700">{t("translations.Name")}</span>
                                <span className="text-gray-700">:</span>
                                <span className="font-extrabold text-[#f7c224]">{userData?.NAME}</span>
                            </div>

                            <div className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-2 ${isGroupFocused(["time-label", "time-value"]) ? focusClass : ""}`}>
                                <span className="text-gray-700">{t("translations.Time of use")}</span>
                                <span className="text-gray-700">:</span>
                                <div className="flex-1 font-extrabold text-[#f7c224]">
                                    {formatDate(seatInfo.USESTART, uiDateFormat)} ~ {formatDate(seatInfo.USEEXPIRE, uiDateFormat)}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {userInfo && renderHeader}
                        <div className="space-y-4 mb-2 text-[30px]">
                            {/* NAME */}
                            <div className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-1 ${isGroupFocused(["name-label", "name-value"]) ? focusClass : ""}`}>
                                <span className="text-gray-700">{t("translations.Name")}</span>
                                <span className="text-gray-700">:</span>
                                <span className="font-extrabold text-[#f7c224]">{userData?.NAME}</span>
                            </div>

                            {/* DATE / START HOURS */}
                            {!isReturn && !isMove ? (
                                <div className={`grid grid-cols-[220px_25px_1fr] items-center rounded-lg p-2 ${isGroupFocused(["date-label", "date-value"]) ? focusClass : ""}`}>
                                    <span className="text-gray-700 font-bold">{t("translations.Date Duration")}</span>
                                    <span className="text-gray-700 font-bold">:</span>
                                    <span className="font-extrabold text-[#f7c224]">
                                        {formatDate(startTime, uiDateFormat)} ~ {endTime ? formatDate(endTime, uiDateFormat) : ""}
                                    </span>
                                </div>
                            ) : isReturn ? (
                                <div className={`grid grid-cols-[220px_25px_1fr] items-center rounded-lg p-2 ${isGroupFocused(["start-label", "start-value"]) ? focusClass : ""}`}>
                                    <span className="text-gray-700 font-bold">{t("translations.Start hours")}</span>
                                    <span className="text-gray-700 font-bold">:</span>
                                    <span className="font-extrabold text-[#f7c224]">
                                        {formatDate(startTime, uiDateFormat)} ~{" "}
                                        {activeBooking?.USEEXPIRE ? formatDate(activeBooking.USEEXPIRE, uiDateFormat) : ""}
                                    </span>
                                </div>
                            ) : null}

                            {/* ACTION / SELECT TIME */}
                            <div className={`grid grid-cols-[220px_25px_1fr] rounded-lg p-2 ${isGroupFocused(["action-label", "confirmation-message"]) ? focusClass : ""}`}>
                                <span className="text-gray-700 font-bold">
                                    {isReturn ? t("translations.Return Confirmation")
                                        : isMove ? t("translations.Move Confirmation")
                                            : confirmStep ? t("translations.Confirmation")
                                                : isBooking ? t("translations.Select Time")
                                                    : t("translations.Extension Time")}
                                </span>
                                <span className="text-gray-700 font-bold">:</span>
                                <div className="flex-1">
                                    {renderConfirmationMessage() || (
                                        loadingTime
                                            ? <div className="flex justify-center py-10"><LoadingSpinner size={80} /></div>
                                            : renderTimeSelection
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </Modal>

            <Modal
                isOpen={showResultModal}
                onClose={handleResultModalClose}
                title=""
                size="medium"
                footer={resultFooter}
                showCloseButton={false}
                className={`seat-action-modal ${focusClass}`}
            >
                <div className="text-center py-4">
                    <div className="flex justify-center mb-6">
                        {actionResult?.success ? (
                            <div className="w-24 h-24 bg-gradient-to-r from-[#FFCB35] to-[#cf9e0b] rounded-full flex items-center justify-center">
                                <FaCheck className="text-white w-14 h-14" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                                <FaTimes className="text-white w-14 h-14" />
                            </div>
                        )}
                    </div>
                    <h2 className={`text-[36px] font-extrabold mb-4 ${actionResult?.success ? "text-[#F7C233]" : "text-red-600"}`}>
                        {t(`translations.${MODE_LABELS[mode]}`)}
                    </h2>
                    <p className="text-[30px] text-gray-700 font-bold mb-4">
                        {t(`translations.${actionResult?.message}`, actionResult?.message)}
                    </p>
                </div>
            </Modal>
        </>
    );
};

export default SeatActionModal;