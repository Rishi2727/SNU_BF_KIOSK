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
    DATE_FORMATS
} from "../../utils/momentConfig";
import { MODE_LABELS, MODES } from "../../utils/constant";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../context/voiceContext";
import { useSerialPort } from "../../context/SerialPortContext";
import { logout } from "../../redux/slice/authSlice";
import { getPrintData } from "../layout/floor/PrintSlip";
import { FaCheck, FaTimes } from "react-icons/fa";

const SeatActionModal = ({
    mode = MODES.BOOKING,
    seat,
    assignNo,
    isOpen,
    onClose,
    onBackToUserInfo,
    disableFocusAndSpeech = false
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
    const { userInfo } = useSelector((state) => state.userInfo);
    const { timeOptions, defaultIndex, bookingSeatInfo } = useSelector((state) => state.bookingTime);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [actionResult, setActionResult] = useState(null);
    const [seatInfo, setSeatInfo] = useState(null);
    const [focusIndex, setFocusIndex] = useState(0);
    const [isModalFocused, setIsModalFocused] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const languageCode = localStorage.getItem("lang") === "ko" ? "ko" : "en";

    const uiDateFormat =
        languageCode === "ko"
            ? DATE_FORMATS.KO_DATETIME
            : DATE_FORMATS.DATETIME;
    const lastSpokenRef = useRef("");
    const { writeToSerialPort, serialPortsData } = useSerialPort();
    const { isBooking, isExtension, isReturn, isMove, isAssignCheck } = modeFlags;
    const lang = useSelector((state) => state.lang.current);

    // Check seat availability
    const isAvailable = useMemo(() => {
        if (!(isBooking || isMove)) return true;
        return seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false;
    }, [isBooking, isMove, seat]);
    const isInitialLoading = isOpen && loading && !showResultModal;
    const getFocusableElements = useCallback(() => {
        const elements = [];
        if (showResultModal) {
            elements.push({ type: 'result-message', label: 'Result Message' });
            elements.push({ type: 'confirm-button', label: 'Confirm Button' });
            if (actionResult?.success) {
                elements.push({ type: 'print-button', label: 'Print Button' });
            }
            return elements;
        }
        elements.push({ type: 'title', label: 'Modal Title' });
        elements.push({ type: 'header', label: 'Location Information' });
        if (isAssignCheck && seatInfo) {
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
            if (isReturn || isMove) {
                elements.push({ type: 'confirmation-message', label: 'Confirmation Message' });
            } else if (confirmStep) {
                elements.push({ type: 'confirmation-message', label: 'Confirmation Message' });
            } else if (!loading && timeOptions.length > 0) {
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

    useEffect(() => {
        if (!isOpen) return;
        if (!disableFocusAndSpeech) {
            setIsModalFocused(true);
            setFocusIndex(0);
        } else {
            setIsModalFocused(false);
        }
    }, [isOpen, disableFocusAndSpeech]);


    useEffect(() => {
        if (!isOpen) return;
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
            } while (
                ["name-label", "date-label", "start-label", "action-label"].includes(
                    items[next]?.type
                )
            );

            return next;
        },
        [getFocusableElements]
    );

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
    }, [isOpen, isModalFocused, focusIndex, getFocusableElements, showResultModal, disableFocusAndSpeech]);

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
                setApiLang(lang); // Ensure API lang is synced
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
    }, [isOpen, isAssignCheck, assignNo, lang]);



    useEffect(() => {
        if (isReturn || isMove || isAssignCheck) return;
        if (defaultIndex !== null && timeOptions[defaultIndex]?.enabled) {
            setSelectedIndex(defaultIndex);
            const endMoment = addMinutes(timeOptions[defaultIndex].value);
            setEndTime(endMoment.toDate());
        }
    }, [timeOptions, defaultIndex, isReturn, isMove, isAssignCheck]);

    useEffect(() => {
        if (!showResultModal) return;

        setIsModalFocused(true);
        setFocusIndex(0);
    }, [showResultModal]);


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
                b_SeqNo: assignNo ?? bookingSeatInfo?.BSEQNO
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
    useEffect(() => {

        if (!isOpen) return;
        if (isAssignCheck) return;

        dispatch(clearBookingTime());

        setApiLang(lang);

        if (isBooking && seat?.SEATNO && isAvailable) {
            dispatch(fetchBookingTime({ seatno: seat.SEATNO }));
        }
        else if ((isExtension || isReturn || isMove) && assignNo) {
            dispatch(fetchBookingTime({ assignno: assignNo }));
        }

    }, [
        isOpen,
        seat,
        assignNo,
        isAvailable,
        isBooking,
        isExtension,
        isReturn,
        isMove
    ]);

    /**
     * Handle final confirmation
     */
    const handleFinalConfirm = useCallback(async () => {
        if (!isReturn && !isMove && selectedIndex === null) return;
        if ((isBooking || isMove) && !isAvailable) return;

        try {
            setLoading(true);
            if ((isBooking || isMove) && seat) {
                console.log("FLOOR_NAME", seat)
                setSeatInfo({

                    FLOOR_NAME: seat.SECTOR_NAME || "",
                    SECTOR_NAME: seat.NAME || "",
                    SEAT_VNAME: seat.VNAME || "",
                });
            }

            const res = await executeApiCall();
            onClose();
            let msg;
            if (res?.successYN === "Y") {
                if (isBooking) {
                    msg = t('translations.Seat Booked Successfully')
                } else if (isMove) {
                    msg = t('translations.Seat Moved Successfully')
                } else if (isExtension) {
                    msg = t('translations.Seat Extension Successfully')
                } else if (isReturn) {
                    msg = t('translations.Seat Return Successfully')
                }
                setActionResult({ success: true, message: msg || res?.msg });
            } else {
                setActionResult({
                    success: false,
                    message: msg || res?.msg
                });
            }


            setShowResultModal(true);
        } catch (err) {
            onClose();
            setActionResult({
                success: false,
                message: err?.response?.data?.msg
            });
            setShowResultModal(true);
        } finally {
            setLoading(false);
        }
    }, [
        isReturn, isMove, isBooking, selectedIndex,
        isAvailable, executeApiCall, onClose, mode, lang
    ]);

    //helper function to hours and minutes 
    const formatDurationLabel = (minutes, t) => {
        if (!minutes) return "";

        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;

        // English
        if (t("translations.hour") === "hour") {
            if (hrs && mins) return `${hrs} ${t("translations.hour")}${hrs > 1 ? "s" : ""} ${mins} ${t("translations.minutes")}`;
            if (hrs) return `${hrs} ${t("translations.hour")}${hrs > 1 ? "s" : ""}`;
            return `${mins} ${t("translations.minutes")}`;
        }

        // Korean
        if (hrs && mins) return `${hrs}${t("translations.hour")} ${mins}${t("translations.minutes")}`;
        if (hrs) return `${hrs}${t("translations.hour")}`;
        return `${mins}${t("translations.minutes")}`;
    };

    const handlePrint = useCallback(async () => {
        try {
            const languageCode = localStorage.getItem("lang") === "ko" ? "ko" : "en";
            const dateFormat =
                languageCode === "ko"
                    ? DATE_FORMATS.KO_DATETIME
                    : DATE_FORMATS.DATETIME;
            const roomName = seatInfo?.FLOOR_NAME || "";
            const formattedData = {
                USER_NAME: userInfo?.NAME || "",
                SCHOOL_NO: userInfo?.SCHOOLNO || "",
                BOOKING_DATE: formatDate(startTime, dateFormat),
                ROOM: roomName,
                SEAT_NO: seat?.VNAME || bookingSeatInfo?.SEAT_VNAME || seatInfo?.SEAT_VNAME || "",
                CHECKIN_TIME: formatDate(startTime, dateFormat),
                CHECKOUT_TIME: endTime
                    ? formatDate(endTime, dateFormat)
                    : bookingSeatInfo?.USEEXPIRE
                        ? formatDate(bookingSeatInfo.USEEXPIRE, dateFormat)
                        : "",
                BARCODE: userInfo?.SCHOOLNO || "",
                USER_ID_QR: userInfo?.SCHOOLNO || "",
            };

            const printerConfig = Array.isArray(serialPortsData)
                ? serialPortsData.find((port) => port.name === "PRINTER")
                : null;

            const printData = getPrintData(formattedData, t);
            const printOptions = {
                port_name: printerConfig?.port,
                baud_rate: printerConfig?.baudrate,
                commands: printData.commands.map((c) => ({
                    type: c.type,
                    value: c.value || null,
                })),
            };


            const printed = await writeToSerialPort(printerConfig, printOptions);
            dispatch(logout());
            navigate("/");
            console.log("🖨️ Print result:", printed);

        } catch (err) {
            console.error("Error printing:", err);
        }
    }, [userInfo, seat, bookingSeatInfo, startTime, endTime, serialPortsData, writeToSerialPort, t, logout]);

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

            case 'print-button':
                handlePrint();
                break;

            default:
                break;
        }
    }, [showResultModal, isReturn, isMove, confirmStep, handleFinalConfirm, handlePrint]);
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
                dispatch(logout());
                navigate("/");
            } catch (err) {
                console.error("Logout error:", err);
            }
        }
    }, [actionResult, dispatch, navigate, logout]);

    /**
     * Handle time option selection using moment
     */
    const handleTimeSelect = useCallback((index, value) => {
        setSelectedIndex(index);
        const endMoment = addMinutes(value);
        setEndTime(endMoment.toDate());
        lastSpokenRef.current = "";
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
                        {t("translations.Central Library")} → {seatInfo.FLOOR_NAME} → {seatInfo.SECTOR_NAME} →
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
        seatInfo, seat, bookingSeatInfo, mode, isFocused, t, lang
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
                    ? t('translations.Do you want to move to this seat?')
                    : isReturn
                        ? t('translations.Do you want to return the seat?')
                        : t("translations.SEAT_CONFIRM_GENERIC", {
                            action: t(`translations.${MODE_LABELS[mode]}`)
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
                        className={`text-[30px] px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b] hover:from-[#fccc3b] hover:to-[#c79706] text-white rounded-lg font-bold text-lg ${isFocused('confirm-button') ? 'outline-[6px] outline-[#dc2f02]' : ''
                            }`}
                    >
                        {t("translations.Confirm")}
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
                    className={`flex-1 text-[30px] px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold text-[30px] ${isFocused('cancel-button') ? 'outline-[6px] outline-[#dc2f02]' : ''
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
                    className={`flex-1 px-6 py-4 rounded-lg font-bold text-[30px]
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
        <div className="flex gap-10 justify-center">

            <button
                onClick={handleResultModalClose}
                className={`px-12 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b]
            hover:from-[#fccc3b] hover:to-[#c79706]
            text-white rounded-lg font-bold text-[30px]
            ${isFocused('confirm-button') ? 'outline-[6px] outline-[#dc2f02]' : ''}`}
            >
                {t("translations.Confirm")}
            </button>

            {actionResult?.success && (isBooking || isMove) && (
                <button
                    onClick={handlePrint}
                    className={`px-15 py-4 bg-linear-to-r from-[#FFCB35] to-[#cf9e0b]
                hover:from-[#fccc3b] hover:to-[#c79706]
                text-white rounded-lg font-bold text-[30px]
                ${isFocused('print-button') ? 'outline-[6px] outline-[#dc2f02]' : ''}`}
                >
                    {t("translations.Print Receipt")}
                </button>
            )}

        </div>
    ), [
        handleResultModalClose,
        handlePrint,
        actionResult,
        isFocused,
        isBooking,
        isMove
    ]);

    // Helper function to get the value and label focus together 
    const isGroupFocused = useCallback((types = []) => {
        if (!isModalFocused) return false;

        const focusableElements = getFocusableElements();
        const current = focusableElements[focusIndex];

        if (!current) return false;

        return types.includes(current.type);
    }, [isModalFocused, focusIndex, getFocusableElements]);


    // helper for speech 
    const getSpeechForFocusedElement = useCallback(
        (element) => {

            if (!element) return "";
            switch (element.type) {
                case "title":
                    if (isAssignCheck) {
                        return t("translations.Seat information");
                    }
                    return t(`translations.${MODE_LABELS[mode]}`);
                case "header": {
                    // Assign check mode
                    if (isAssignCheck && seatInfo) {
                        return `${t("translations.Central Library")} ${seatInfo.FLOOR_NAME} ${seatInfo.SECTOR_NAME} ${seatInfo.SEAT_VNAME}`;
                    }

                    // Booking / Move / Extension / Return
                    if (seat || bookingSeatInfo) {
                        return `${t("translations.Central Library")} ${seat?.ROOM_NAME || bookingSeatInfo?.FLOOR_NAME
                            } ${seat?.NAME || bookingSeatInfo?.SECTOR_NAME
                            } ${seat?.VNAME || bookingSeatInfo?.SEAT_VNAME
                            }`;
                    }

                    return "";
                }


                case "name-label":
                case "name-value":
                    return t("speech.SEAT_MODAL_USER_NAME", {
                        name: userInfo?.SCHOOLNO,
                    });
                case "date-label":
                case "date-value": {
                    const startStr = formatDate(startTime, uiDateFormat);
                    const endStr = endTime ? formatDate(endTime, uiDateFormat) : "";
                    let durationText = "";
                    if (startTime && endTime) {
                        const diffMs = endTime.getTime() - startTime.getTime();
                        if (diffMs > 0) {
                            const minutes = Math.floor(diffMs / 60000);
                            durationText = formatDurationLabel(minutes, t);
                        }
                    }
                    const fullSpeech = `${t("translations.Date Duration")}: ${startStr} ${t("speech.to")} ${endStr}.`;
                    return fullSpeech;
                }
                case "time-label":
                case "time-value": {
                    if (!seatInfo?.USESTART || !seatInfo?.USEEXPIRE) {
                        return t("translations.Time of use");
                    }
                    const startStr = formatDate(seatInfo.USESTART, uiDateFormat);
                    const endStr = formatDate(seatInfo.USEEXPIRE, uiDateFormat);
                    return `${t("translations.Time of use")}: ${startStr} ${t("speech.to")} ${endStr}`;
                }
                case "start-label":
                case "start-value": {
                    const startStr = formatDate(startTime, uiDateFormat);
                    const endStr = bookingSeatInfo?.USEEXPIRE
                        ? formatDate(bookingSeatInfo.USEEXPIRE, uiDateFormat)
                        : "";
                    let durationText = "";
                    if (startTime && bookingSeatInfo?.USEEXPIRE) {
                        const expireDate = new Date(bookingSeatInfo.USEEXPIRE);
                        const diffMs = expireDate.getTime() - startTime.getTime();
                        if (diffMs > 0) {
                            const minutes = Math.floor(diffMs / 60000);
                            durationText = formatDurationLabel(minutes, t);
                        }
                    }
                    const fullSpeech = `${t("translations.Start hours")}: ${startStr} ${t("speech.to")} ${endStr}.`;
                    return fullSpeech;
                }
                case "action-label":
                    return t("speech.SEAT_MODAL_ACTION_SECTION");
                case "time-button": {
                    const spokenTime = formatDurationLabel(element.value, t);
                    return t("speech.SEAT_MODAL_TIME_OPTION", {
                        time: spokenTime,
                    });
                }
                case "confirmation-message":
                    if (isMove) return t("speech.SEAT_MODAL_MOVE_CONFIRM");
                    if (isReturn) return t("speech.SEAT_MODAL_RETURN_CONFIRM");
                    return t("speech.SEAT_MODAL_CONFIRM_GENERIC", {
                        action: t(`translations.${MODE_LABELS[mode]}`),

                    });

                case "cancel-button":
                    return t("speech.Cancel");

                case "confirm-button":
                    return t("speech.Confirm");

                case "print-button":
                    return t("translations.Print Receipt");

                case "result-message":
                    return `${t(`translations.${MODE_LABELS[mode]}`)}. ${t(`translations.${actionResult?.message}`)}`;

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
            startTime,
            endTime,
            bookingSeatInfo,
            seatInfo
        ]
    );


    //to stop the speech 
    useEffect(() => {
        if (!isOpen && !showResultModal) {
            stop();
            lastSpokenRef.current = "";
        }
    }, [isOpen, showResultModal, stop]);
    useEffect(() => {
        if (!isOpen && !showResultModal) return;
        if (!isModalFocused) return;
        if (isOpen || showResultModal) {
            lastSpokenRef.current = "";
        }
    }, [isOpen, showResultModal, isModalFocused]);

    // Main speech effect
    useEffect(() => {
        if (disableFocusAndSpeech) return;
        if (!isOpen && !showResultModal) return;
        if (!isModalFocused) return;

        const focusableElements = getFocusableElements();
        const currentElement = focusableElements[focusIndex];

        if (!currentElement) return;

        const speechText = getSpeechForFocusedElement(currentElement);
        if (!speechText) return;
        const isDifferent = speechText !== lastSpokenRef.current;

        if (isDifferent) {
            stop();
            lastSpokenRef.current = speechText;
            setTimeout(() => {
                speak(speechText);
            }, 150);
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
            {isInitialLoading && (
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
                className="outline-[6px] outline-[#dc2f02]"
            >
                {/* ✅ Modal Title with focus highlighting */}
                <h2 className={`text-[36px] font-extrabold text-center text-[#f7c224] mb-8 tracking-wide ${isFocused('title') ? 'outline-[6px] outline-[#dc2f02] rounded-lg' : ''
                    }`}>
                    {isAssignCheck
                        ? t("translations.Seat information")
                        : `${t(`translations.${MODE_LABELS[mode]}`)}`
                    }

                </h2>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner size={80} />
                    </div>
                ) : isAssignCheck && seatInfo ? (
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
                                    {formatDate(seatInfo.USESTART, uiDateFormat)} ~{" "}
                                    {formatDate(seatInfo.USEEXPIRE, uiDateFormat)}
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

                                        {formatDate(startTime, uiDateFormat)} ~{" "}
                                        {endTime ? formatDate(endTime, uiDateFormat) : ""}
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
                                        {formatDate(startTime, uiDateFormat)} ~{" "}
                                        {bookingSeatInfo?.USEEXPIRE
                                            ? formatDate(bookingSeatInfo.USEEXPIRE, uiDateFormat)
                                            : ""}
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
                                        ? t('translations.Return Confirmation')
                                        : isMove
                                            ? t('translations.Move Confirmation')
                                            : confirmStep
                                                ? t('translations.Confirmation')
                                                : isBooking
                                                    ? t('translations.Select Time')
                                                    : t('translations.Extension Time')}
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
                className="outline-[6px] outline-[#dc2f02]"
            >
                <div className={`text-center py-4 ${isFocused('result-message') ? '' : ''
                    }`}>
                    {/* Success/Error Icon */}
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

                    {/* Result Message */}
                    <h2 className={`text-[36px] font-extrabold mb-4 ${actionResult?.success ? "text-[#F7C233]" : "text-red-600"}`}>
                        {actionResult?.success ? t(`translations.${MODE_LABELS[mode]}`) : t(`translations.${MODE_LABELS[mode]}`)}
                    </h2>

                    <p className="text-[30px] text-gray-700 font-bold mb-4">
                        {t(`translations.${actionResult?.message}`)}
                    </p>
                </div>
            </Modal>
        </>
    );
};

export default SeatActionModal