import { useEffect, useState } from "react";
import { setSeatAssign, setExtend, setReturnSeat, setMove } from "../../services/api";
import { useDispatch, useSelector } from "react-redux";
import { clearUserInfo } from "../../redux/slice/userInfo";
import { useNavigate } from "react-router-dom";
import { clearBookingTime, fetchBookingTime } from "../../redux/slice/bookingTimeSlice";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";

/**
 * Common component for seat booking, extension, return, and move
 * @param {Object} props
 * @param {'booking' | 'extension' | 'return' | 'move'} props.mode - Action mode
 * @param {Object} props.seat - Seat object (for booking/move mode)
 * @param {string} props.assignNo - Assignment number (for extension/return/move mode)
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 */
const SeatActionModal = ({ mode = "booking", seat, assignNo, isOpen, onClose }) => {
    const isBookingMode = mode === "booking";
    const isExtensionMode = mode === "extension";
    const isReturnMode = mode === "return";
    const isMoveMode = mode === "move";

    const isAvailable = (isBookingMode || isMoveMode)
        ? seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false
        : true;

    const { userInfo } = useSelector((state) => state.userInfo);
    const { timeOptions, defaultIndex, bookingSeatInfo } = useSelector((state) => state.bookingTime);

    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(null);
    const [confirmStep, setConfirmStep] = useState(false);
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState("");
    const [showResultModal, setShowResultModal] = useState(false);
    const [actionResult, setActionResult] = useState(null);

    const navigate = useNavigate();
    const dispatch = useDispatch();

    const formatDate = (date) => {
        return date?.toLocaleString("ko", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    // Reset and fetch time options when modal opens
    useEffect(() => {
        if (!isOpen) return;
        if ((isBookingMode || isMoveMode) && (!seat?.SEATNO || !isAvailable)) return;
        if ((isExtensionMode || isReturnMode) && !assignNo) return;

        dispatch(clearBookingTime());
        setConfirmStep(false);
        setStartTime(new Date());
        setEndTime("");
        setShowResultModal(false);
        setActionResult(null);
        setSelectedIndex(null);

        // Only fetch booking time for booking and extension modes (NOT for return or move)
        if (!isReturnMode && !isMoveMode) {
            if (isBookingMode) {
                dispatch(fetchBookingTime({ seatno: seat.SEATNO }));
            } else if (isExtensionMode) {
                dispatch(fetchBookingTime({ assignno: assignNo }));
            }
        }
    }, [isOpen, seat, assignNo, isAvailable, isBookingMode, isExtensionMode, isReturnMode, isMoveMode]);

    // Set default time option (not needed for return or move mode)
    useEffect(() => {
        if (isReturnMode || isMoveMode) return;
        if (defaultIndex !== null && timeOptions[defaultIndex]?.enabled) {
            setSelectedIndex(defaultIndex);
            setEndTime(new Date(Date.now() + timeOptions[defaultIndex].value * 60000));
        }
    }, [timeOptions, defaultIndex, isReturnMode, isMoveMode]);

    /* ========================= FINAL CONFIRM + API CALL ========================= */
    const handleFinalConfirm = async () => {
        // For return and move mode, no time selection needed
        if (!isReturnMode && !isMoveMode && selectedIndex === null) return;
        if ((isBookingMode || isMoveMode) && !isAvailable) return;

        try {
            setLoading(true);
            let res;

            if (isBookingMode) {
                const formatHM = (d) => d.getHours().toString().padStart(2, "0") + d.getMinutes().toString().padStart(2, "0");
                const formatDateNum = (d) => d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");

                const payload = {
                    seatno: seat.SEATNO,
                    date: formatDateNum(startTime),
                    useTime: `${formatHM(startTime)}-${formatHM(endTime)}`,
                    schoolno: userInfo.SCHOOLNO,
                    members: "",
                };
                res = await setSeatAssign(payload);
            } else if (isExtensionMode) {
                const extendM = timeOptions[selectedIndex].value;
                const payload = {
                    b_SeqNo: assignNo,
                    extendM,
                    useExpire: bookingSeatInfo?.USEEXPIRE,
                };
                res = await setExtend(payload);
            } else if (isReturnMode) {
                const payload = {
                    b_SeqNo: assignNo,
                };
                res = await setReturnSeat(payload);
            } else if (isMoveMode) {
                // Move API call
                const payload = {
                    seatNo: seat.SEATNO,
                    bSeqNo: userInfo?.ASSIGN_NO || assignNo,
                };
                res = await setMove(payload);
            }

            if (res?.successYN === "Y") {
                onClose();
                setActionResult({ success: true, message: res?.msg });
                setShowResultModal(true);
                return;
            }

            onClose();
            setActionResult({
                success: false,
                message: res?.msg || `좌석 ${isBookingMode ? "배정" : isExtensionMode ? "연장" : isReturnMode ? "반납" : "이동"}에 실패했습니다.`
            });
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
    };

    /* ========================= HANDLE RESULT MODAL CLOSE ========================= */
    const handleResultModalClose = async () => {
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
    };

    /* ========================= GET ACTION LABEL ========================= */
    const getActionLabel = () => {
        if (isBookingMode) return "배정";
        if (isExtensionMode) return "연장";
        if (isReturnMode) return "반납";
        if (isMoveMode) return "이동";
        return "";
    };

    /* ========================= FOOTER ========================= */
    const footer = (
        <div className="flex gap-4">
            <button
                onClick={confirmStep ? () => setConfirmStep(false) : onClose}
                className="flex-1 px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold text-lg"
            >
                취소
            </button>

            <button
                /* 🔥 return and move skip confirmStep, go straight to API */
                onClick={(isReturnMode || isMoveMode) ? handleFinalConfirm : confirmStep ? handleFinalConfirm : () => setConfirmStep(true)}

                /* 🔥 return and move buttons never disabled */
                disabled={
                    (isBookingMode && (!isAvailable || selectedIndex === null || !endTime)) ||
                    (isExtensionMode && (selectedIndex === null || !endTime))
                }
                className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg
          ${(isReturnMode || isMoveMode || selectedIndex !== null) &&
                        (!(isBookingMode || isMoveMode) || isAvailable)
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
            >
                확인
            </button>
        </div>
    );

    /* ========================= RESULT MODAL FOOTER ========================= */
    const resultFooter = (
        <div className="flex justify-center">
            <button
                onClick={handleResultModalClose}
                className="px-12 py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg font-bold text-lg"
            >
                확인
            </button>
        </div>
    );

    /* ========================= RENDER HEADER ========================= */
    const renderHeader = () => {
        if ((isBookingMode || isMoveMode) && seat || bookingSeatInfo) {
            return (
                <div className="mb-10 p-2 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl shadow-md">
                    <p className="text-center text-[30px] text-teal-700 font-bold">
                        중앙도서관 → {seat?.ROOM_NAME || bookingSeatInfo?.FLOOR_NAME} → {seat?.NAME || bookingSeatInfo?.SECTOR_NAME} →
                        <span className="text-red-600 font-extrabold ml-3">
                            {(seat?.VNAME || bookingSeatInfo?.SEAT_VNAME) ?? "-"}
                        </span>
                    </p>
                </div>
            );
        } else {
            return (
                <div className="mb-10 p-2 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl shadow-md">
                    <p className="text-center text-[30px] text-teal-700 font-bold">
                        좌석 {getActionLabel()} 요청
                    </p>
                </div>
            );
        }
    };

    return (
        <>
            {/* Main Action Modal */}
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title=""
                size="large"
                footer={footer}
                showCloseButton={false}
            >
                <h2 className="text-[36px] font-extrabold text-center text-teal-600 mb-8 tracking-wide">
                    좌석 {getActionLabel()}
                </h2>

                {userInfo && renderHeader()}

                <div className="space-y-6 mb-2 text-[30px]">
                    <div className="flex gap-6 font-bold">
                        <span className="text-gray-700">사용자 :</span>
                        <span className="font-extrabold text-teal-700">{userInfo?.SCHOOLNO}</span>
                    </div>

                    {!isReturnMode && !isMoveMode ? (
                        <div className="flex gap-6">
                            <span className="text-gray-700 font-bold">날짜 & 시간 :</span>
                            <span className="font-extrabold text-teal-700">
                                {formatDate(startTime)} ~ {endTime ? formatDate(endTime) : ""}
                            </span>
                        </div>
                    ) : isReturnMode ? (
                        <div className="flex gap-6">
                            <span className="text-gray-700 font-bold">Start hours :</span>
                            <span className="font-extrabold text-teal-700">
                                {formatDate(startTime)} ~ {bookingSeatInfo?.USEEXPIRE ? formatDate(new Date(bookingSeatInfo.USEEXPIRE)) : "종료정보 없음"}
                            </span>
                        </div>
                    ) : null}

                    <div className="flex gap-6">
                        <span className="text-gray-700 font-bold min-w-[200px]">
                            {/* 🔥 return and move ignore confirmStep */}
                            {isReturnMode ? "반납 확인 :" : 
                             isMoveMode ? "이동 확인 :" :
                             confirmStep ? "확인 :" : 
                             isBookingMode ? "시간 선택 :" : "연장 시간 :"}
                        </span>

                        <div className="flex-1">

                            {/* MOVE MODE — Direct confirmation */}
                            {isMoveMode ? (
                                <p className="text-red-600 font-extrabold text-[34px]">
                                    이 좌석으로 이동하시겠습니까?
                                </p>
                            ) : /* RETURN MODE — No confirmStep screen */
                            isReturnMode ? (
                                <p className="text-red-600 font-extrabold text-[34px]">
                                    좌석을 반납 하시겠습니까?
                                </p>
                            ) : confirmStep ? (
                                <p className="text-red-600 font-extrabold text-[34px]">
                                    정말 좌석을 {getActionLabel()}하시겠습니까?
                                </p>
                            ) : loading ? (
                                <div className="flex justify-center py-10">
                                    <LoadingSpinner size={80} />
                                </div>
                            ) : (
                                // Show time buttons only for booking/extension
                                <div className="grid grid-cols-3 gap-2">
                                    {timeOptions.map((opt, i) => (
                                        <button
                                            key={i}
                                            disabled={!opt.enabled}
                                            onClick={() => {
                                                setSelectedIndex(i);
                                                const end = new Date(new Date().getTime() + opt.value * 60000);
                                                setEndTime(end);
                                            }}
                                            className={`text-[28px] font-bold py-2 rounded-2xl transition-all
             ${selectedIndex === i ? "bg-teal-500 text-white scale-105 shadow-xl"
                                                    : opt.enabled ? "bg-gray-400 hover:bg-gray-300"
                                                        : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>

                </div>
            </Modal>

            {/* Result Modal (Success/Error) */}
            <Modal
                isOpen={showResultModal}
                onClose={handleResultModalClose}
                title=""
                size="medium"
                footer={resultFooter}
                showCloseButton={false}
            >
                <div className="text-center py-8">
                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        {actionResult?.success ? (
                            <div className="w-24 h-24 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-16 h-16 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                            </div>
                        ) : (
                            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-16 h-16 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <h2
                        className={`text-[36px] font-extrabold mb-4 ${actionResult?.success ? "text-teal-600" : "text-red-600"
                            }`}
                    >
                        {actionResult?.success
                            ? `${getActionLabel()} 완료`
                            : `${getActionLabel()} 실패`}
                    </h2>

                    {/* Message */}
                    <p className="text-[28px] text-gray-700 font-bold mb-6">
                        {actionResult?.message}
                    </p>

                    {/* Additional Info for Success */}
                    {actionResult?.success && !isReturnMode && !isMoveMode && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl">
                            {isBookingMode && seat ? (
                                <>
                                    <p className="text-[24px] text-teal-700 font-bold">
                                        {seat.ROOM_NAME} - {seat?.VNAME}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-2">
                                        {formatDate(startTime)} ~ {endTime ? formatDate(endTime) : ""}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[24px] text-teal-700 font-bold">
                                        연장 시간: {endTime ? formatDate(endTime) : ""}
                                    </p>
                                    <p className="text-[20px] text-gray-600 mt-2">
                                        {formatDate(startTime)} ~ {endTime ? formatDate(endTime) : ""}
                                    </p>
                                </>
                            )}
                        </div>
                    )}

                    {/* Additional Info for Move Success */}
                    {actionResult?.success && isMoveMode && (
                        <div className="mt-6 p-6 bg-gradient-to-r from-cyan-100 to-teal-100 border-4 border-teal-400 rounded-2xl">
                            <p className="text-[24px] text-teal-700 font-bold">
                                좌석 이동이 완료되었습니다
                            </p>
                            <p className="text-[20px] text-gray-600 mt-2">
                                새 좌석: {seat?.ROOM_NAME} - {seat?.VNAME}
                            </p>
                        </div>
                    )}

                    {/* Additional Info for Return Success */}
                    {actionResult?.success && isReturnMode && (
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