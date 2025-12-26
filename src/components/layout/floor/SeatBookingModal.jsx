import { useEffect, useState } from "react";
import Modal from "../../common/Modal";
import LoadingSpinner from "../../common/LoadingSpinner";
import { getBookingTimeSeat, setSeatAssign } from "../../../services/api";
import { useSelector } from "react-redux";

const SeatBookingModal = ({ seat, isOpen, onClose, onConfirm }) => {
  const isAvailable =
    seat ? seat.USECNT === 0 && (seat.STATUS === 1 || seat.STATUS === 2) : false;

  const [loading, setLoading] = useState(false);
  const [timeOptions, setTimeOptions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(null);

  const { userInfo } = useSelector((state) => state.userInfo);
  const [confirmStep, setConfirmStep] = useState(false);

  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState("");

  const formatDate = (date) => {
    return date?.toLocaleString("ko", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  /* ========================= FETCH BOOKING TIME ========================= */
  useEffect(() => {
    if (!isOpen || !seat?.SEATNO || !isAvailable) return;

    setConfirmStep(false);
    setStartTime(new Date());
    setEndTime("");

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
          value: Number(values[i]),
          enabled: ynList[i] === "Y",
        }));

        setTimeOptions(options);

        const defaultIdx = Number(info.DEFAULT_INDEX) - 1;
        if (options[defaultIdx]?.enabled) {
          setSelectedIndex(defaultIdx);
          setEndTime(new Date(new Date().getTime() + options[defaultIdx].value * 60000));
        } else {
          setSelectedIndex(null);
          setEndTime("");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTime();
  }, [isOpen, seat, isAvailable]);


  /* ========================= FINAL CONFIRM + API CALL ========================= */
  const handleFinalConfirm = async () => {
    if (!isAvailable || selectedIndex === null) return;

    try {
      setLoading(true);

      /* ---- Convert time to HHMM format ---- */
      const formatHM = (d) => {
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");
        return `${h}${m}`;
      };

      /* ---- Convert date to YYYYMMDD ---- */
      const formatDateNum = (d) => {
        return d.getFullYear().toString() +
          (d.getMonth() + 1).toString().padStart(2, "0") +
          d.getDate().toString().padStart(2, "0");
      };

      /* ---- generate final useTime string ---- */
      const startHM = formatHM(startTime);
      const endHM = formatHM(endTime);

      /* ---- Build final payload exactly how API needs ---- */
      const payload = {
        seatno: seat.SEATNO,
        date: formatDateNum(startTime),     // 20251226
        useTime: `${startHM}-${endHM}`,     // 2115-2145
        schoolno: userInfo.SCHOOLNO,
        members: "",
      };
      const res = await setSeatAssign(payload);
      console.log("Seat assigned successfully:", res);

      onConfirm({
        seat,
        time: timeOptions[selectedIndex],
        startTime,
        endTime,
      });

      onClose();

    } catch (err) {
      console.error("Seat booking error:", err);
      alert("좌석 배정 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
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
        onClick={confirmStep ? handleFinalConfirm : () => setConfirmStep(true)}
        disabled={
          !isAvailable ||
          selectedIndex === null ||
          !timeOptions[selectedIndex]?.enabled ||
          !endTime
        }
        className={`flex-1 px-6 py-4 rounded-lg font-bold text-lg
          ${isAvailable && selectedIndex !== null && endTime && timeOptions[selectedIndex]?.enabled
            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
      >
        확인
      </button>
    </div>
  );


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="large" footer={footer} showCloseButton={false}>
      {seat && (
        <>
          <h2 className="text-[36px] font-extrabold text-center text-teal-600 mb-8 tracking-wide">
            좌석 배정
          </h2>

          <div className="mb-10 p-2 bg-gradient-to-r from-cyan-100 to-teal-100 
            border-4 border-teal-400 rounded-2xl shadow-md">
            <p className="text-center text-[30px] text-teal-700 font-bold">
              중앙도서관 → {seat.ROOM_NAME} → {seat.NAME} →
              <span className="text-red-600 font-extrabold ml-3">
                {seat?.VNAME ?? "-"}
              </span>
            </p>
          </div>

          <div className="space-y-6 mb-2 text-[30px]">

            <div className="flex gap-6 font-bold">
              <span className="text-gray-700">사용자 :</span>
              <span className="font-extrabold text-teal-700">{userInfo.SCHOOLNO}</span>
            </div>

            <div className="flex gap-6">
              <span className="text-gray-700 font-bold">날짜 & 시간 :</span>
              <span className="font-extrabold text-teal-700">
                {formatDate(startTime)} ~ {endTime ? formatDate(endTime) : ""}
              </span>
            </div>

            <div className="flex gap-6">
              <span className="text-gray-700 font-bold min-w-[200px]">
                {confirmStep ? "확인 :" : "시간 선택 :"}
              </span>

              <div className="flex-1">
                {confirmStep ? (
                  <div className="p-4 bg-gray-100 rounded-2xl border-4 border-gray-300 shadow-lg text-center">
                    <p className="text-red-600 font-extrabold text-[34px]">
                      정말 좌석을 배정하시겠습니까?
                    </p>
                  </div>
                ) : loading ? (
                  <div className="flex justify-center py-10">
                    <LoadingSpinner size={80} />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {timeOptions.map((opt, i) => (
                      <button
                        key={i}
                        disabled={!opt.enabled}
                        onClick={() => {
                          if (!opt.enabled) {
                            setSelectedIndex(null);
                            setEndTime("");    // invalid clear
                            return;
                          }
                          setSelectedIndex(i);
                          const end = new Date(new Date().getTime() + opt.value * 60000);
                          setEndTime(end);
                        }}
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
