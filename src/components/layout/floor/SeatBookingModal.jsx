import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import LoadingSpinner from "../../common/LoadingSpinner";
import { getBookingTimeSeat } from "../../../services/api";

const SeatBookingModal = ({ seat, isOpen, onClose, onConfirm }) => {
  const isAvailable =
    seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false;

  const [loading, setLoading] = useState(false);
  const [timeOptions, setTimeOptions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  // 🔹 only used to swap the 시간선택 area
  const [confirmStep, setConfirmStep] = useState(false);

  /* ===============================
     FETCH BOOKING TIME
  ================================ */
  useEffect(() => {
    if (!isOpen || !seat?.SEATNO || !isAvailable) return;

    // reset when modal opens
    setConfirmStep(false);

    const fetchTime = async () => {
      setLoading(true);
      try {
        const res = await getBookingTimeSeat(seat.SEATNO);
        const info = res?.seatTimeInfo;
        if (!info) return;

        const labels = info.TIME_LABEL.split("|");
        const values = info.TIME_VALUE.split("|");
        const ynList = info.TIME_YN.split("|");

        const options = labels.map((label, i) => ({
          label,
          value: values[i],
          enabled: ynList[i] === "Y",
        }));

        setTimeOptions(options);
        setSelectedIndex(Number(info.DEFAULT_INDEX) - 1);
      } finally {
        setLoading(false);
      }
    };

    fetchTime();
  }, [isOpen, seat, isAvailable]);

  /* ===============================
     FINAL CONFIRM
  ================================ */
  const handleFinalConfirm = () => {
    if (!isAvailable || selectedIndex === null) return;

    onConfirm({
      seat,
      time: timeOptions[selectedIndex],
    });

    onClose();
  };

  /* ===============================
     FOOTER (unchanged)
  ================================ */
  const footer = (
    <div className="flex gap-4">
      <button
        onClick={
          confirmStep ? () => setConfirmStep(false) : onClose
        }
        className="flex-1 px-6 py-4 bg-gray-300 hover:bg-gray-400 rounded-lg font-bold text-lg"
      >
        취소
      </button>

      <button
        onClick={
          confirmStep ? handleFinalConfirm : () => setConfirmStep(true)
        }
        disabled={!isAvailable || selectedIndex === null}
        className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg ${
          isAvailable && selectedIndex !== null
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        확인
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="좌석배정"
      size="large"
      footer={footer}
      showCloseButton={false}
    >
      {seat && (
        <>
          {/* Breadcrumb */}
          <div className="mb-6 p-4 bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-cyan-400 rounded-lg">
            <p className="text-center text-cyan-700 font-medium text-lg">
              중앙도서관 관정관 &gt; 6층 &gt; 멀티미디어(감상석,PC) &gt;
              음악감상석 &gt; {seat.VNAME}
            </p>
          </div>

          {/* Info */}
          <div className="space-y-4 mb-6">
            <div className="flex gap-4">
              <span className="w-24 text-gray-600 font-medium">이름 :</span>
              <span className="font-semibold">정재택</span>
            </div>

            <div className="flex gap-4">
              <span className="w-24 text-gray-600 font-medium">
                이용시간 :
              </span>
              <span className="font-semibold">
                2025년 12월 23일 19:29 ~
              </span>
            </div>

            {/* ================= 시간선택 / 확인 메시지 ================= */}
            <div className="flex gap-4">
              <span className="w-24 pt-2 text-gray-600 font-medium">
                {confirmStep ? "확인 :" : "시간선택 :"}
              </span>

              <div className="flex-1">
                {confirmStep ? (
                  /* CONFIRM MESSAGE */
                  <div className="p-6 bg-gray-50 border border-gray-300 rounded-lg text-center">
                    <p className="text-red-600 font-bold text-xl mb-4">
                      좌석을 배정하시겠습니까?
                    </p>

                    <p className="mb-2 text-gray-700">
                      좌석 :
                      <span className="font-semibold"> {seat.VNAME}</span>
                    </p>

                    <p className="text-gray-700">
                      이용 시간 :
                      <span className="font-semibold">
                        {" "}
                        {timeOptions[selectedIndex]?.label}
                      </span>
                    </p>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner />
                  </div>
                ) : (
                  /* TIME BUTTONS */
                  <div className="grid grid-cols-4 gap-3">
                    {timeOptions.map((opt, i) => (
                      <button
                        key={i}
                        disabled={!opt.enabled}
                        onClick={() => setSelectedIndex(i)}
                        className={`px-4 py-3 rounded-lg font-medium
                          ${
                            selectedIndex === i
                              ? "bg-teal-500 text-white"
                              : opt.enabled
                              ? "bg-gray-200 hover:bg-gray-300"
                              : "bg-gray-100 text-gray-400 cursor-not-allowed"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
};

export default SeatBookingModal;
