import { useEffect, useState, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import {
    setSeatAssign,
    setExtend,
    setReturnSeat,
    setMove,
    setAssignSeatInfo
} from "../../services/api";
import { clearUserInfo } from "../../redux/slice/userInfo";
import { clearBookingTime, fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
import {
    formatDate,
    formatDateNum,
    formatTimeNum,
    addMinutes,
    DATE_FORMATS
} from "../../utils/momentConfig";
import { MODE_LABELS, MODES } from "../../utils/constant";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";

/**
 * Common component for seat booking, extension, return, move, and assign check
 * ✅ NOW WITH FULL KEYBOARD NAVIGATION SUPPORT FOR ACCESSIBILITY
 */
const SeatActionModal = ({
    mode = MODES.BOOKING,
    seat,
    assignNo,
    isOpen,
    onClose,
    onBackToUserInfo
}) => {
    // Mode flags
    const modeFlags = useMemo(() => ({
        isBooking: mode === MODES.BOOKING,
        isExtension: mode === MODES.EXTENSION,
        isReturn: mode === MODES.RETURN,
        isMove: mode === MODES.MOVE,
        isAssignCheck: mode === MODES.ASSIGN_CHECK
    }), [mode]);

    const { speak, stop } = useVoice();
    const { t } = useTranslation();

    const { isBooking, isExtension, isReturn, isMove, isAssignCheck } = modeFlags;

    // Check seat availability
    const isAvailable = useMemo(() => {
        if (!(isBooking || isMove)) return true;
        return seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false;
    }, [isBooking, isMove, seat]);

    // Redux
    const { userInfo } = useSelector((state) => state.userInfo);
    const { timeOptions, defaultIndex, bookingSeatInfo } = useSelector((state) => state.bookingTime);

    // Local state
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [actionResult, setActionResult] = useState(null);
    const [seatInfo, setSeatInfo] = useState(null);
    // ✅ NEW: Focus management state
    const [focusIndex, setFocusIndex] = useState(0);
    const [isModalFocused, setIsModalFocused] = useState(false);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    /**
     * ✅ STEP 1: Define focusable elements based on modal state
     * This function calculates all focusable items dynamically
     */
    const getFocusableElements = useCallback(() => {
        const elements = [];

        // RESULT MODAL - Different structure
        if (showResultModal) {
            elements.push({ type: 'result-message', label: 'Result Message' });
            elements.push({ type: 'confirm-button', label: 'Confirm Button' });
            return elements;
        }

        // MAIN MODAL
        // 1. Modal Title (always present)
        elements.push({ type: 'title', label: 'Modal Title' });

        // 2. Header section (location info)
        elements.push({ type: 'header', label: 'Location Information' });

        if (isAssignCheck && seatInfo) {
            // ASSIGN CHECK MODE
            elements.push({ type: 'name-label', label: 'Name Label' });
            elements.push({ type: 'name-value', label: 'Name Value' });
            elements.push({ type: 'time-label', label: 'Time Label' });
            elements.push({ type: 'time-value', label: 'Time Value' });
            elements.push({ type: 'confirm-button', label: 'Confirm Button' });
        } else {
            // OTHER MODES
            elements.push({ type: 'name-label', label: 'Name Label' });
            elements.push({ type: 'name-value', label: 'Name Value' });

            if (!isReturn && !isMove) {
                elements.push({ type: 'date-label', label: 'Date Duration Label' });
                elements.push({ type: 'date-value', label: 'Date Duration Value' });
            } else if (isReturn) {
                elements.push({ type: 'start-label', label: 'Start Hours Label' });
                elements.push({ type: 'start-value', label: 'Start Hours Value' });
            }

            elements.push({ type: 'action-label', label: 'Action Label' });

            // Time selection buttons OR confirmation message
            if (isReturn || isMove) {
                elements.push({ type: 'confirmation-message', label: 'Confirmation Message' });
            } else if (confirmStep) {
                elements.push({ type: 'confirmation-message', label: 'Confirmation Message' });
            } else if (!loading && timeOptions.length > 0) {
                // Add each time option button
                timeOptions.forEach((opt, i) => {
                    if (opt.enabled) {
                        elements.push({
                            type: 'time-button',
                            label: opt.label,
                            index: i,
                            value: opt.value
                        });
                    }
                });
            }

            // Footer buttons
            elements.push({ type: 'cancel-button', label: 'Cancel Button' });
            elements.push({ type: 'confirm-button', label: 'Confirm Button' });
        }

        return elements;
    }, [
        showResultModal, isAssignCheck, seatInfo, isReturn, isMove,
        confirmStep, loading, timeOptions
    ]);

    /**
     * ✅ STEP 2: Auto-focus modal when it opens
     * Sets focus to index 0 (title) automatically
     */
    useEffect(() => {
        if (isOpen) {
            setIsModalFocused(true);
            setFocusIndex(0); // Start at title
        } else {
            setIsModalFocused(false);
            setFocusIndex(0);
        }
    }, [isOpen]);

    /**
 * ✅ FIX: Auto-focus confirmation message when confirmStep changes
 */
    useEffect(() => {
        if (!isOpen) return;

        // When entering confirmation step, reset focus
        if (confirmStep) {
            setFocusIndex(0);
        }
    }, [confirmStep, isOpen]);

    const getNextVisibleFocusIndex = useCallback(
        (current, direction) => {
            const items = getFocusableElements();
            const len = items.length;

            let next = current;

            do {
                next =
                    direction === "next"
                        ? (next + 1) % len
                        : (next - 1 + len) % len;

                // 👇 SKIP label-only elements (they are grouped visually)
            } while (
                ["name-label", "date-label", "start-label", "action-label"].includes(
                    items[next]?.type
                )
            );

            return next;
        },
        [getFocusableElements]
    );

    /**
     * ✅ STEP 3: Keyboard navigation handler
     * Handles Left/Right arrows and Enter key
     */
    useEffect(() => {
        if ((!isOpen && !showResultModal) || !isModalFocused) return;

        const handleKeyDown = (e) => {
            const focusableElements = getFocusableElements();
            const maxIndex = focusableElements.length - 1;

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
    }, [isOpen, isModalFocused, focusIndex, getFocusableElements, showResultModal]);


    /**
     * ✅ STEP 5: Helper to check if element is focused
     */
    const isFocused = useCallback((elementType, elementIndex = null) => {
        if (!isModalFocused) return false;

        const focusableElements = getFocusableElements();
        const currentElement = focusableElements[focusIndex];

        if (!currentElement) return false;

        if (elementIndex !== null) {
            return currentElement.type === elementType && currentElement.index === elementIndex;
        }

        return currentElement.type === elementType;
    }, [isModalFocused, focusIndex, getFocusableElements]);

    /**
     * Fetch assign seat info for assign check mode
     */
    useEffect(() => {
        if (!isOpen || !isAssignCheck || !assignNo) return;

        const fetchInfo = async () => {
            try {
                setLoading(true);
                setSeatInfo(null);

                const res = await setAssignSeatInfo({ bseqno: assignNo });

                if (res?.successYN === "Y") {
                    setSeatInfo(res.bookingSeatInfo);
                } else {
                    console.warn("Assign seat info fetch failed", res);
                }
            } catch (err) {
                console.error("Failed to fetch assign seat info", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInfo();
    }, [isOpen, isAssignCheck, assignNo]);

    /**
     * Reset state and fetch time options on modal open
     */
    useEffect(() => {
        if (!isOpen) return;
        if (isAssignCheck) return;
        if ((isBooking || isMove) && (!seat?.SEATNO || !isAvailable)) return;
        if ((isExtension || isReturn) && !assignNo) return;

        // Reset state
        dispatch(clearBookingTime());
        setConfirmStep(false);
        setStartTime(new Date());
        setEndTime(null);
        setShowResultModal(false);
        setActionResult(null);
        setSelectedIndex(null);
        setSeatInfo(null);

        // Fetch booking time for booking and extension modes only
        if (!isReturn && !isMove) {
            if (isBooking) {
                dispatch(fetchBookingTime({ seatno: seat.SEATNO }));
            } else if (isExtension) {
                dispatch(fetchBookingTime({ assignno: assignNo }));
            }
        }
    }, [
        isOpen, seat, assignNo, isAvailable,
        isBooking, isExtension, isReturn, isMove, isAssignCheck,
        dispatch
    ]);


    /**
     * Set default time option using moment
     */
    useEffect(() => {
        if (isReturn || isMove || isAssignCheck) return;
        if (defaultIndex !== null && timeOptions[defaultIndex]?.enabled) {
            setSelectedIndex(defaultIndex);
            const endMoment = addMinutes(timeOptions[defaultIndex].value);
            setEndTime(endMoment.toDate());
        }
    }, [timeOptions, defaultIndex, isReturn, isMove, isAssignCheck]);

    /**
     * ✅ FIX: Auto-focus Result Modal when it opens
     * Does NOT disturb existing logic
     */
    useEffect(() => {
        if (!showResultModal) return;

        // Result modal has its own focus structure
        setIsModalFocused(true);
        setFocusIndex(0); // Focus Result Message by default
    }, [showResultModal]);


    /**
     * Execute API call based on mode
     */
    const executeApiCall = useCallback(async () => {
        if (isBooking) {
            const payload = {
                seatno: seat.SEATNO,
                date: formatDateNum(startTime),
                useTime: `${formatTimeNum(startTime)}-${formatTimeNum(endTime)}`,
                schoolno: userInfo.SCHOOLNO,
                members: "",
            };
            return await setSeatAssign(payload);
        }

        if (isExtension) {
            const extendM = timeOptions[selectedIndex].value;
            const payload = {
                b_SeqNo: assignNo,
                extendM,
                useExpire: bookingSeatInfo?.USEEXPIRE,
            };
            return await setExtend(payload);
        }

        if (isReturn) {
            return await setReturnSeat({
                b_SeqNo: assignNo ?? bookingSeatInfo?.B_SEQNO
            });
        }

        if (isMove) {
            return await setMove({
                seatNo: seat.SEATNO,
                bSeqNo: userInfo?.ASSIGN_NO || assignNo,
            });
        }
    }, [
        isBooking, isExtension, isReturn, isMove,
        seat, assignNo, startTime, endTime,
        timeOptions, selectedIndex, bookingSeatInfo, userInfo
    ]);

    /**
     * Handle final confirmation
     */
    const handleFinalConfirm = useCallback(async () => {
        if (!isReturn && !isMove && selectedIndex === null) return;
        if ((isBooking || isMove) && !isAvailable) return;

        try {
            setLoading(true);
            const res = await executeApiCall();

            onClose();

            if (res?.successYN === "Y") {
                setActionResult({ success: true, message: res?.msg });
            } else {
                setActionResult({
                    success: false,
                    message: res?.msg || `좌석 ${MODE_LABELS[mode]}에 실패했습니다.`
                });
            }

            setShowResultModal(true);
        } catch (err) {
            onClose();
            setActionResult({
                success: false,
                message: err?.response?.data?.msg || "문제가 발생했습니다. 다시 시도해주세요."
            });
            setShowResultModal(true);
        } finally {
            setLoading(false);
        }
    }, [
        isReturn, isMove, isBooking, selectedIndex,
        isAvailable, executeApiCall, onClose, mode
    ]);

    //helper function to hours and minutes 
    const formatDurationLabel = (minutes, t) => {
        if (!minutes) return "";

        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;

        // English
        if (t("common.hour") === "hour") {
            if (hrs && mins) return `${hrs} ${t("common.hour")}${hrs > 1 ? "s" : ""} ${mins} ${t("common.minutes")}`;
            if (hrs) return `${hrs} ${t("common.hour")}${hrs > 1 ? "s" : ""}`;
            return `${mins} ${t("common.minutes")}`;
        }

        // Korean
        if (hrs && mins) return `${hrs}${t("common.hour")} ${mins}${t("common.minutes")}`;
        if (hrs) return `${hrs}${t("common.hour")}`;
        return `${mins}${t("common.minutes")}`;
    };


    // ===================HANDLE BY ENTER KEY ================
    const handleEnterPress = useCallback((focusedElement) => {
        if (!focusedElement) return;

        switch (focusedElement.type) {
            case 'time-button':
                handleTimeSelect(focusedElement.index, focusedElement.value);
                break;

            case 'cancel-button':
                setConfirmStep(false);
                onClose();
                if (onBackToUserInfo) {
                    setTimeout(() => onBackToUserInfo(), 200);
                }
                break;

            case 'confirmation-message':
                if (isReturn || isMove) {
                    handleFinalConfirm();
                } else if (confirmStep) {
                    handleFinalConfirm();
                }
                break;

            case 'confirm-button':
                if (isAssignCheck) {
                    onClose();
                    if (onBackToUserInfo) {
                        setTimeout(() => onBackToUserInfo(), 300);
                    }
                    return;
                }
                if (showResultModal) {
                    handleResultModalClose();
                } else if (isReturn || isMove) {
                    handleFinalConfirm();
                } else if (confirmStep) {
                    handleFinalConfirm();
                } else {
                    setConfirmStep(true);
                }
                break;

            default:
                break;
        }
    }, [showResultModal, isReturn, isMove, confirmStep, handleFinalConfirm]);
    /**
     * Handle result modal close
     */
    const handleResultModalClose = useCallback(async () => {
        setShowResultModal(false);
        const wasSuccessful = actionResult?.success;
        setActionResult(null);

        if (wasSuccessful) {
            try {
                localStorage.removeItem("authenticated");
                dispatch(clearUserInfo());
                navigate("/");
            } catch (err) {
                console.error("Logout error:", err);
                navigate("/");
            }
        }
    }, [actionResult, dispatch, navigate]);

    /**
     * Handle time option selection using moment
     */
    const handleTimeSelect = useCallback((index, value) => {
        setSelectedIndex(index);
        const endMoment = addMinutes(value);
        setEndTime(endMoment.toDate());
    }, []);

    /**
     * ✅ STEP 6: Render header section with focus highlighting
     */
    const renderHeader = useMemo(() => {
        const headerClass = `mb-10 p-2  border-4 border-[#DDAB2C] rounded-2xl shadow-md ${isFocused('header') ? 'outline-[6px] outline-[#dc2f02]' : ''
            }`;
        const textClass = "text-center text-[30px] text-[#DDAB2C] font-bold";

        if (isAssignCheck && seatInfo) {
            return (
                <div className={headerClass}>
                    <p className={textClass}>
                        {t("Central Library")} → {seatInfo.FLOOR_NAME} → {seatInfo.SECTOR_NAME} →
                        <span className="text-red-600 font-extrabold ml-3">
                            {seatInfo.SEAT_VNAME}
                        </span>
                    </p>
                </div>
            );
        }

        if ((isBooking || isMove || isExtension || isReturn) && (seat || bookingSeatInfo)) {
            return (
                <div className={headerClass}>
                    <p className={textClass}>
                        {t("translations.Central Library")} → {seat?.ROOM_NAME || bookingSeatInfo?.FLOOR_NAME} →{" "}
                        {seat?.NAME || bookingSeatInfo?.SECTOR_NAME} →
                        <span className="text-red-600 font-extrabold ml-3">
                            {(seat?.VNAME || bookingSeatInfo?.SEAT_VNAME) ?? "-"}
                        </span>
                    </p>
                </div>
            );
        }

        return (
            <div className={headerClass}>
                <p className={textClass}>
                    {t("Seat")} {MODE_LABELS[mode]} {t("Request")}
                </p>
            </div>
        );
    }, [
        isAssignCheck, isBooking, isMove, isExtension, isReturn,
        seatInfo, seat, bookingSeatInfo, mode, isFocused
    ]);

    /**
     * ✅ STEP 7: Render time selection grid with focus highlighting
     */
    const renderTimeSelection = useMemo(() => (
        <div className="grid grid-cols-3 gap-2">
            {timeOptions.map((opt, i) => (
                <button
                    key={i}
                    disabled={!opt.enabled}
                    onClick={() => handleTimeSelect(i, opt.value)}
                    className={`text-[28px] font-bold py-1 rounded-lg ml-1 transition-all 
                        ${selectedIndex === i
                            ? "bg-linear-to-r from-[#FFCB35] to-[#dfac15] text-white scale-105 shadow-xl"
                            : opt.enabled
                                ? "bg-gray-400 hover:bg-gray-300"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }
                        ${isFocused('time-button', i) ? 'outline-[6px] outline-[#dc2f02]' : ''}
                    `}
                >
                    {formatDurationLabel(opt.value, t)}

                </button>
            ))}
        </div>
    ), [timeOptions, selectedIndex, handleTimeSelect, isFocused]);

    /**
     * Render confirmation message
     */
    const renderConfirmationMessage = () => {
        if (!isMove && !isReturn && !confirmStep) return null;

        return (
            <p className="text-red-600 font-extrabold text-[30px]">
                {isMove
                    ? t('common.Do you want to move to this seat?')
                    : isReturn
                        ? t('common.Do you want to return the seat?')
                        : t("common.SEAT_CONFIRM_GENERIC", {
                            action: t(`common.${MODE_LABELS[mode]}`)
                        })}
            </p>
        );
    };


    /**
     * ✅ STEP 8: Main modal footer with focus highlighting
     */
    const mainFooter = useMemo(() => {
        if (isAssignCheck) {
            return (
                <div className="flex justify-center">
                    <button
                        onClick={() => {
                            onClose();
                            if (onBackToUserInfo) {
                                setTimeout(() => onBackToUserInfo(), 300);
                            }
                        }}
                        className={`px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold text-lg ${isFocused('confirm-button') ? 'outline-[6px] outline-[#dc2f02]' : ''
                            }`}
                    >
                        {t("Confirm")}
                    </button>
                </div>
            );
        }

        const isConfirmDisabled =
            (isBooking && (!isAvailable || selectedIndex === null || !endTime)) ||
            (isExtension && (selectedIndex === null || !endTime));

        return (
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        setConfirmStep(false);
                        onClose();
                        if (onBackToUserInfo) {
                            setTimeout(() => onBackToUserInfo(), 200);
                        }
                    }}
                    className={`flex-1 px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold text-lg ${isFocused('cancel-button') ? 'outline-[6px] outline-[#dc2f02]' : ''
                        }`}
                >
                    {t("translations.Cancel")}
                </button>

                <button
                    onClick={
                        (isReturn || isMove)
                            ? handleFinalConfirm
                            : confirmStep
                                ? handleFinalConfirm
                                : () => setConfirmStep(true)
                    }
                    disabled={isConfirmDisabled}
                    className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg
                        ${!isConfirmDisabled && ((isReturn || isMove) || selectedIndex !== null) && (!(isBooking || isMove) || isAvailable)
                            ? "bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }
                        ${isFocused('confirm-button') ? 'outline-[6px] outline-[#dc2f02]' : ''}
                    `}
                >
                    {t("translations.Confirm")}
                </button>
            </div>
        );
    }, [
        isAssignCheck, isReturn, isMove, isBooking, isExtension,
        isAvailable, selectedIndex, endTime, confirmStep,
        onClose, onBackToUserInfo, handleFinalConfirm, isFocused
    ]);

    /**
     * ✅ STEP 9: Result modal footer with focus highlighting
     */
    const resultFooter = useMemo(() => (
        <div className="flex justify-center">
            <button
                onClick={handleResultModalClose}
                className={`px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold text-lg ${isFocused('confirm-button') ? 'outline-[6px] outline-[#dc2f02]' : ''
                    }`}
            >
                {t("Confirm")}
            </button>
        </div>
    ), [handleResultModalClose, isFocused]);

    // Helper function to get the value and label focus together 
    const isGroupFocused = useCallback((types = []) => {
        if (!isModalFocused) return false;

        const focusableElements = getFocusableElements();
        const current = focusableElements[focusIndex];

        if (!current) return false;

        return types.includes(current.type);
    }, [isModalFocused, focusIndex, getFocusableElements]);


    const getSpeechForFocusedElement = useCallback(
        (element) => {
            if (!element) return "";

            switch (element.type) {
                case "title":
                    return t("speech.SEAT_MODAL_TITLE", {
                        action: MODE_LABELS[mode],
                    });

                case "header":
                    return t("speech.SEAT_MODAL_LOCATION_INFO");

                case "name-label":
                case "name-value":
                    return t("SEAT_MODAL_USER_NAME", {
                        name: userInfo?.SCHOOLNO,
                    });

                case "date-label":
                case "date-value": {
                    let durationText = "";

                    if (startTime && endTime) {
                        const diffMs = endTime - startTime;
                        if (diffMs > 0) {
                            const minutes = Math.floor(diffMs / 60000);
                            durationText = formatDurationLabel(minutes, t);
                        }
                    }

                    return durationText
                        ? `${t("speech.SEAT_MODAL_DATE_DURATION")}. ${durationText}`
                        : t("speech.SEAT_MODAL_DATE_DURATION");
                }


                case "start-label":
                case "start-value":
                    return t("speech.SEAT_MODAL_START_TIME");

                case "action-label":
                    return t("speech.SEAT_MODAL_ACTION_SECTION");

                case "time-button":
                    return t("speech.SEAT_MODAL_TIME_OPTION", {
                        time: element.label,
                    });

                case "confirmation-message":
                    if (isMove) return t("speech.SEAT_MODAL_MOVE_CONFIRM");
                    if (isReturn) return t("speech.SEAT_MODAL_RETURN_CONFIRM");
                    return t("speech.SEAT_MODAL_CONFIRM_GENERIC", {
                        action: MODE_LABELS[mode],
                    });

                case "cancel-button":
                    return t("speech.Cancel");

                case "confirm-button":
                    return t("speech.Confirm");

                case "result-message":
                    return actionResult?.success
                        ? t("speech.SEAT_MODAL_SUCCESS")
                        : t("speech.SEAT_MODAL_FAILURE");

                default:
                    return "";
            }
        },
        [
            t,
            mode,
            userInfo,
            isMove,
            isReturn,
            actionResult,
        ]
    );

    useEffect(() => {
        if (!isOpen && !showResultModal) return;
        if (!isModalFocused) return;

        const focusableElements = getFocusableElements();
        const currentElement = focusableElements[focusIndex];

        if (!currentElement) return;

        stop(); // 🔇 stop previous speech

        const speechText = getSpeechForFocusedElement(currentElement);

        if (speechText) {
            speak(speechText);
        }
    }, [
        isOpen,
        showResultModal,
        isModalFocused,
        focusIndex,
        getFocusableElements,
        getSpeechForFocusedElement,
        speak,
        stop,
    ]);




    return (
        <>
            {/* Main Action Modal */}
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title=""
                size="large"
                footer={mainFooter}
                showCloseButton={false}
            >
                {/* ✅ Modal Title with focus highlighting */}
                <h2 className={`text-[36px] font-extrabold text-center text-[#f7c224] mb-8 tracking-wide ${isFocused('title') ? 'outline-[6px] outline-[#dc2f02] rounded-lg' : ''
                    }`}>
                    {isAssignCheck
                        ? t("common.Seat information")
                        : `${t("common.Seat")} ${t(`common.${MODE_LABELS[mode]}`)}`
                    }

                </h2>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner size={80} />
                    </div>
                ) : isAssignCheck && seatInfo ? (
                    /* ✅ Assign Check Mode Content with focus highlighting */
                    <>
                        {renderHeader}

                        <div className="space-y-4 mb-8 text-[30px]">

                            {/* NAME */}
                            <div
                                className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-2
        ${isGroupFocused(['name-label', 'name-value'])
                                        ? 'outline-[6px] outline-[#dc2f02]'
                                        : ''
                                    }`}
                            >
                                <span className="text-gray-700">
                                    {t("translations.Name")}
                                </span>
                                <span className="text-gray-700">:</span>

                                <span className="font-extrabold text-[#f7c224]">
                                    {userInfo?.SCHOOLNO}
                                </span>
                            </div>

                            {/* TIME */}
                            <div
                                className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-2
        ${isGroupFocused(['time-label', 'time-value'])
                                        ? 'outline-[6px] outline-[#dc2f02]'
                                        : ''
                                    }`}
                            >
                                <span className="text-gray-700">
                                    {t("translations.Time of use")}
                                </span>
                                <span className="text-gray-700">:</span>

                                <div className="flex-1 font-extrabold text-[#f7c224]">
                                    {formatDate(seatInfo.USESTART, DATE_FORMATS.ISO)} ~{" "}
                                    {formatDate(seatInfo.USEEXPIRE, DATE_FORMATS.ISO)}
                                </div>
                            </div>

                        </div>
                    </>

                ) : (
                    /* ✅ Other Modes Content with focus highlighting */
                    <>
                        {userInfo && renderHeader}

                        <div className="space-y-4 mb-2 text-[30px]">

                            {/* NAME */}
                            <div
                                className={`grid grid-cols-[220px_25px_1fr] items-center font-bold rounded-lg p-1
        ${isGroupFocused(["name-label", "name-value"])
                                        ? "outline-[6px] outline-[#dc2f02]"
                                        : ""
                                    }`}
                            >
                                <span className="text-gray-700">{t("translations.Name")}</span>
                                <span className="text-gray-700">: </span>
                                <span className="font-extrabold text-[#f7c224]">
                                    {userInfo?.SCHOOLNO}
                                </span>
                            </div>

                            {/* DATE / START HOURS */}
                            {!isReturn && !isMove ? (
                                <div
                                    className={`grid grid-cols-[220px_25px_1fr] items-center rounded-lg p-2
          ${isGroupFocused(['date-label', 'date-value'])
                                            ? 'outline-[6px] outline-[#dc2f02]'
                                            : ''
                                        }`}
                                >
                                    <span className="text-gray-700 font-bold">
                                        {t("translations.Date Duration")}
                                    </span>
                                    <span className="text-gray-700 font-bold">:</span>

                                    <span className="font-extrabold text-[#f7c224]">
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~{" "}
                                        {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </span>
                                </div>

                            ) : isReturn ? (
                                <div
                                    className={`grid grid-cols-[220px_25px_1fr] items-center rounded-lg p-2
          ${isGroupFocused(['start-label', 'start-value'])
                                            ? 'outline-[6px] outline-[#dc2f02]'
                                            : ''
                                        }`}
                                >
                                    <span className="text-gray-700 font-bold">
                                        {t("translations.Start hours")}
                                    </span>
                                    <span className="text-gray-700 font-bold">:</span>

                                    <span className="font-extrabold text-[#f7c224]">
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~{" "}
                                        {bookingSeatInfo?.USEEXPIRE
                                            ? formatDate(bookingSeatInfo.USEEXPIRE, DATE_FORMATS.ISO)
                                            : "종료정보 없음"}
                                    </span>
                                </div>
                            ) : null}

                            {/* ACTION / SELECT TIME */}
                            <div
                                className={`grid grid-cols-[220px_25px_1fr] rounded-lg p-2
        ${isGroupFocused(['action-label', 'confirmation-message'])
                                        ? 'outline-[6px] outline-[#dc2f02]'
                                        : ''
                                    }`}
                            >
                                <span className="text-gray-700 font-bold">
                                    {isReturn
                                        ? t('common.Return Confirmation')
                                        : isMove
                                            ? t('common.Move Confirmation')
                                            : confirmStep
                                                ? t('common.Confirmation')
                                                : isBooking
                                                    ? t('common.Select Time')
                                                    : t('common.Extension Time')}
                                </span>

                                <span className="text-gray-700 font-bold">:</span>

                                <div className="flex-1">
                                    {renderConfirmationMessage() || (
                                        loading ? (
                                            <div className="flex justify-center py-10">
                                                <LoadingSpinner size={80} />
                                            </div>
                                        ) : renderTimeSelection
                                    )}
                                </div>
                            </div>

                        </div>
                    </>

                )}
            </Modal>

            {/* ✅ Result Modal with focus highlighting */}
            <Modal
                isOpen={showResultModal}
                onClose={handleResultModalClose}
                title=""
                size="medium"
                footer={resultFooter}
                showCloseButton={false}
            >
                <div className={`text-center py-4 ${isFocused('result-message') ? 'outline-[6px] outline-[#dc2f02] rounded-lg' : ''
                    }`}>
                    {/* Success/Error Icon */}
                    <div className="flex justify-center mb-6">
                        {actionResult?.success ? (
                            <div className="w-24 h-24 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] rounded-full flex items-center justify-center">
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Result Message */}
                    <h2 className={`text-[36px] font-extrabold mb-4 ${actionResult?.success ? "text-[#F7C233]" : "text-red-600"}`}>
                        {actionResult?.success ? `${MODE_LABELS[mode]} 완료` : `${MODE_LABELS[mode]} 실패`}
                    </h2>

                    <p className="text-[28px] text-gray-700 font-bold mb-4">
                        {actionResult?.message}
                    </p>

                    {/* Success Details */}
                    {actionResult?.success && !isReturn && !isMove && (
                        <div className="mt-4 p-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0bd0] border-4 border-[#cf9e0b] rounded-2xl">
                            {isBooking && seat ? (
                                <>
                                    <p className="text-[24px] text-[#F7C233] font-bold">
                                        {seat.ROOM_NAME} - {seat?.VNAME}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-1">
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[24px]  font-bold">
                                        연장 시간: {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-1">
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {actionResult?.success && isMove && (
                        <div className="mt-4 p-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] border-4 border-[#cf9e0b] rounded-2xl">
                            <p className="text-[24px] font-bold">
                                좌석 이동이 완료되었습니다
                            </p>
                            <p className="text-[20px] text-gray-600 mt-2">
                                새 좌석: {seat?.ROOM_NAME} - {seat?.VNAME}
                            </p>
                        </div>
                    )}

                    {actionResult?.success && isReturn && (
                        <div className="mt-4 p-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] border-4 border-[#cf9e0b] rounded-2xl">
                            <p className="text-[24px]  font-bold">
                                좌석이 성공적으로 반납되었습니다
                            </p>
                            <p className="text-[20px] text-gray-600 mt-2">
                                다시 배정받으시려면 로그인해주세요
                            </p>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default SeatActionModal;