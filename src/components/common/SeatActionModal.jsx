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

// ✅ Import moment utilities
import {
    formatDate,
    formatDateNum,
    formatTimeNum,
    addMinutes,
    DATE_FORMATS
} from "../../utils/momentConfig";
import { MODE_LABELS, MODES } from "../../utils/constant";

/**
 * Common component for seat booking, extension, return, move, and assign check
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

    const navigate = useNavigate();
    const dispatch = useDispatch();

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
            // ✅ Use moment to add minutes
            const endMoment = addMinutes(timeOptions[defaultIndex].value);
            setEndTime(endMoment.toDate());
        }
    }, [timeOptions, defaultIndex, isReturn, isMove, isAssignCheck]);

    /**
     * Execute API call based on mode
     */
    const executeApiCall = useCallback(async () => {
        if (isBooking) {
            const payload = {
                seatno: seat.SEATNO,
                date: formatDateNum(startTime), // ✅ Using moment utility
                useTime: `${formatTimeNum(startTime)}-${formatTimeNum(endTime)}`, // ✅ Using moment utility
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
            return await setReturnSeat({ b_SeqNo: assignNo });
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
        // ✅ Use moment to add minutes
        const endMoment = addMinutes(value);
        setEndTime(endMoment.toDate());
    }, []);

    /**
     * Render header section
     */
    const renderHeader = useMemo(() => {
        const headerClass =
            "mb-10 p-2 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl shadow-md";
        const textClass = "text-center text-[30px] text-teal-700 font-bold";

        if (isAssignCheck && seatInfo) {
            return (
                <div className={headerClass}>
                    <p className={textClass}>
                        Central Library → {seatInfo.FLOOR_NAME} → {seatInfo.SECTOR_NAME} →
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
                        Central Library → {seat?.ROOM_NAME || bookingSeatInfo?.FLOOR_NAME} →{" "}
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
                    Seat {MODE_LABELS[mode]} Request
                </p>
            </div>
        );
    }, [
        isAssignCheck,
        isBooking,
        isMove,
        isExtension,
        isReturn,
        seatInfo,
        seat,
        bookingSeatInfo,
        mode,
    ]);


    /**
     * Render time selection grid
     */
    const renderTimeSelection = useMemo(() => (
        <div className="grid grid-cols-3 gap-2">
            {timeOptions.map((opt, i) => (
                <button
                    key={i}
                    disabled={!opt.enabled}
                    onClick={() => handleTimeSelect(i, opt.value)}
                    className={`text-[28px] font-bold py-2 rounded-2xl transition-all
            ${selectedIndex === i
                            ? "bg-teal-500 text-white scale-105 shadow-xl"
                            : opt.enabled
                                ? "bg-gray-400 hover:bg-gray-300"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                        }`}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    ), [timeOptions, selectedIndex, handleTimeSelect]);

    /**
     * Render confirmation message
     */
    const renderConfirmationMessage = () => {
        if (isMove) {
            return (
                <p className="text-red-600 font-extrabold text-[34px]">
                    Do you want to move to this seat?
                </p>
            );
        }

        if (isReturn) {
            return (
                <p className="text-red-600 font-extrabold text-[34px]">
                    Do you want to return the seat?
                </p>
            );
        }

        if (confirmStep) {
            return (
                <p className="text-red-600 font-extrabold text-[34px]">
                    Are you sure you want to {MODE_LABELS[mode]} the seat?
                </p>
            );
        }

        return null;
    };

    /**
     * Main modal footer
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
                        className="px-12 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-bold text-lg"
                    >
                        Confirm
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

                        // ✅ Go back to UserInfoModal
                        if (onBackToUserInfo) {
                            setTimeout(() => onBackToUserInfo(), 200);
                        }
                    }}
                    className="flex-1 px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold text-lg"
                >
                    Cancel
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
                            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                >
                    Confirm
                </button>
            </div>
        );

    }, [
        isAssignCheck, isReturn, isMove, isBooking, isExtension,
        isAvailable, selectedIndex, endTime, confirmStep,
        onClose, onBackToUserInfo, handleFinalConfirm
    ]);

    /**
     * Result modal footer
     */
    const resultFooter = useMemo(() => (
        <div className="flex justify-center">
            <button
                onClick={handleResultModalClose}
                className="px-12 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-bold text-lg"
            >
                Confirm
            </button>
        </div>
    ), [handleResultModalClose]);

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
                <h2 className="text-[36px] font-extrabold text-center text-teal-600 mb-8 tracking-wide">
                    {isAssignCheck ? "좌석정보" : `좌석 ${MODE_LABELS[mode]}`}
                </h2>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <LoadingSpinner size={80} />
                    </div>
                ) : isAssignCheck && seatInfo ? (
                    /* Assign Check Mode Content */
                    <>
                        {renderHeader}

                        <div className="space-y-6 mb-8 text-[30px]">
                            <div className="flex gap-6 font-bold">
                                <span className="text-gray-700 min-w-[200px]">이름 :</span>
                                <span className="font-extrabold text-teal-700">
                                    {userInfo?.SCHOOLNO}
                                </span>
                            </div>

                            <div className="flex gap-6 font-bold">
                                <span className="text-gray-700 min-w-[200px]">이용시간 :</span>
                                <div className="flex-1 font-extrabold text-teal-700">
                                    {/* ✅ Using moment utility */}
                                    {formatDate(seatInfo.USESTART, DATE_FORMATS.ISO)} ~ {formatDate(seatInfo.USEEXPIRE, DATE_FORMATS.ISO)}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Other Modes Content */
                    <>
                        {userInfo && renderHeader}

                        <div className="space-y-6 mb-2 text-[30px]">
                            <div className="flex gap-6 font-bold">
                                <span className="text-gray-700">Name :</span>
                                <span className="font-extrabold text-teal-700">{userInfo?.SCHOOLNO}</span>
                            </div>

                            {!isReturn && !isMove ? (
                                <div className="flex gap-6">
                                    <span className="text-gray-700 font-bold">Date Duration :</span>
                                    <span className="font-extrabold text-teal-700">
                                        {/* ✅ Using moment utility */}
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </span>
                                </div>
                            ) : isReturn ? (
                                <div className="flex gap-6">
                                    <span className="text-gray-700 font-bold">Start hours :</span>
                                    <span className="font-extrabold text-teal-700">
                                        {/* ✅ Using moment utility */}
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {bookingSeatInfo?.USEEXPIRE ? formatDate(bookingSeatInfo.USEEXPIRE, DATE_FORMATS.ISO) : "종료정보 없음"}
                                    </span>
                                </div>
                            ) : null}

                            <div className="flex gap-6">
                                <span className="text-gray-700 font-bold min-w-[200px]">
                                    {isReturn
                                        ? "Return Confirmation :"
                                        : isMove
                                            ? "Move Confirmation :"
                                            : confirmStep
                                                ? "Confirmation :"
                                                : isBooking
                                                    ? "Select Time :"
                                                    : "Extension Time :"}

                                </span>

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

            {/* Result Modal */}
            <Modal
                isOpen={showResultModal}
                onClose={handleResultModalClose}
                title=""
                size="medium"
                footer={resultFooter}
                showCloseButton={false}
            >
                <div className="text-center py-8">
                    {/* Success/Error Icon */}
                    <div className="flex justify-center mb-6">
                        {actionResult?.success ? (
                            <div className="w-24 h-24 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
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
                    <h2 className={`text-[36px] font-extrabold mb-4 ${actionResult?.success ? "text-teal-600" : "text-red-600"}`}>
                        {actionResult?.success ? `${MODE_LABELS[mode]} 완료` : `${MODE_LABELS[mode]} 실패`}
                    </h2>

                    <p className="text-[28px] text-gray-700 font-bold mb-6">
                        {actionResult?.message}
                    </p>

                    {/* Success Details */}
                    {actionResult?.success && !isReturn && !isMove && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl">
                            {isBooking && seat ? (
                                <>
                                    <p className="text-[24px] text-teal-700 font-bold">
                                        {seat.ROOM_NAME} - {seat?.VNAME}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-2">
                                        {/* ✅ Using moment utility */}
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[24px] text-teal-700 font-bold">
                                        연장 시간: {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-2">
                                        {formatDate(startTime, DATE_FORMATS.ISO)} ~ {endTime ? formatDate(endTime, DATE_FORMATS.ISO) : ""}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {actionResult?.success && isMove && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl">
                            <p className="text-[24px] text-teal-700 font-bold">
                                좌석 이동이 완료되었습니다
                            </p>
                            <p className="text-[20px] text-gray-600 mt-2">
                                새 좌석: {seat?.ROOM_NAME} - {seat?.VNAME}
                            </p>
                        </div>
                    )}

                    {actionResult?.success && isReturn && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl">
                            <p className="text-[24px] text-teal-700 font-bold">
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