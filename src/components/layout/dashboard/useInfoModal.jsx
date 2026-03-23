import { CheckCircle2, Clock, LogOut, Move, CheckCircle, User, XCircle } from "lucide-react";
import Modal from "../../common/Modal";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";

const UserInfoModal = ({ isOpen, onClose, userInfo, onAction }) => {
  const [focusIndex, setFocusIndex] = useState(null);
  const [isModalFocused, setIsModalFocused] = useState(false);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const hasSpokenIntroRef = useRef(false);
  console.log("first", userInfo)
  const actions = [
    {
      id: "extend",
      title: t("translations.Seat Extension"),
      icon: <Clock className="w-12 h-12" />,
      enabled: userInfo?.EXTEND_YN === "Y",
      color: "bg-[#66b2b2]",
      action: () => onAction("extend", userInfo?.ASSIGN_NO),
    },
    {
      id: "move",
      title: t("translations.Seat Move"),
      icon: <Move className="w-12 h-12" />,
      enabled: userInfo?.MOVE_YN === "Y",
      color: "bg-[#66b2b2]",
      action: () => onAction("move", userInfo?.ASSIGN_NO),
    },
    {
      id: "return",
      title: t("translations.Seat Return"),
      icon: <LogOut className="w-12 h-12" />,
      enabled: userInfo?.RETURN_YN === "Y",
      color: "bg-[#66b2b2]",
      action: () => onAction("return", userInfo?.ASSIGN_NO),
    },
    {
      id: "check",
      title: t("translations.Reservation Check"),
      icon: <CheckCircle className="w-12 h-12" />,
      enabled: userInfo?.BOOKING_CHECK_YN === "Y",
      color: "bg-[#66b2b2]",
      // ✅ calls runBookingCheck API directly in Dashboard
      action: () => onAction("bookingCheck", userInfo?.BOOKING_NO),
    },
    {
      id: "cancel",
      title: t("translations.Reservation Cancel"),
      icon: <XCircle className="w-12 h-12" />,
      enabled: userInfo?.CANCEL_YN === "Y",
      color: "bg-[#66b2b2]",
      // ✅ opens RETURN SeatActionModal → setReturnSeat
      action: () => onAction("reservationCancel", userInfo?.ASSIGN_NO),
    },
    {
      id: "assign",
      title: t("translations.Seat Assignment"),
      icon: <User className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_YN === "Y",
      color: "bg-[#66b2b2]",
      // ✅ calls handleMoveAction → navigates to floor/move → setMove
      action: () => onAction("seatAssign", userInfo?.BOOKING_NO),
    },
    {
      id: "assignCheck",
      title: t("translations.Assignment Check"),
      icon: <CheckCircle2 className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_CHECK_YN === "Y",
      color: "bg-[#66b2b2]",
      action: () => onAction("assignCheck", userInfo?.ASSIGN_NO),
    },

  ];

  const focusableActions = useMemo(
    () => actions.filter((a) => a.enabled),
    [actions]
  );
  const CLOSE_BUTTON_INDEX = focusableActions.length;
  /* ================= OPEN / CLOSE ================= */
  useEffect(() => {
    if (isOpen) {
      setIsModalFocused(true);
      setFocusIndex(null);
      hasSpokenIntroRef.current = false;
      stop();
      speak(
        `${t("speech.User Information")}. ${t(
          "speech.You are now logged in. Please select the features you wish to use."
        )}`
      );
    } else {
      setIsModalFocused(false);
      setFocusIndex(null);
      hasSpokenIntroRef.current = false;
      stop();
    }
  }, [isOpen, stop, speak, t]);

  /* ================= KEYBOARD NAV ================= */
  useEffect(() => {
    if (!isOpen || !isModalFocused) return;

    const handleKeyDown = (e) => {
      const maxIndex = focusableActions.length;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusIndex((prev) =>
            prev === null ? 0 : (prev + 1) % (maxIndex + 1)
          );
          break;

        case "ArrowLeft":
          e.preventDefault();
          setFocusIndex((prev) =>
            prev === null
              ? maxIndex
              : (prev - 1 + maxIndex + 1) % (maxIndex + 1)
          );
          break;
        case "Enter":
          e.preventDefault();
          if (focusIndex === CLOSE_BUTTON_INDEX) {
            onClose();
          } else {
            focusableActions[focusIndex]?.action();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isModalFocused, focusIndex, focusableActions, onClose]);

  const isFocused = useCallback(
    (index) => isModalFocused && focusIndex === index,
    [isModalFocused, focusIndex]
  );

  /* ================= SPEECH ================= */
  useEffect(() => {
    if (!isOpen || !isModalFocused) return;

    if (!hasSpokenIntroRef.current) {
      hasSpokenIntroRef.current = true;
      return;
    }
    // ⭐ Close button speech
    if (focusIndex === CLOSE_BUTTON_INDEX) {
      stop();
      speak(t("speech.Close"));
      return;
    }
    const currentAction = focusableActions[focusIndex];
    if (currentAction) {
      stop();
      speak(
        t(`speech.${currentAction.title}`, {
          defaultValue: currentAction.title,
        })
      );
    }
  }, [focusIndex, isOpen, isModalFocused, focusableActions, speak, stop, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      closeOnBackdrop={false}
      showCloseButton={true}
      title={t("translations.User Information")}
      size="large"
      className="user-info-modal h-[50vh]! outline-[6px] outline-[#dc2f02]!"
      closeFocused={focusIndex === CLOSE_BUTTON_INDEX}
    >
      <div className="space-y-15 h-[35vh] p-3 bg-[#f8f9fa] user-info">
        <div className="flex justify-center items-center">
          <p className="text-[30px] text-gray-800 font-semibold">
            {t(
              "translations.You are now logged in. Please select the features you wish to use."
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {actions.map((action) => {
            const enabledIndex = focusableActions.findIndex(
              (a) => a.id === action.id
            );

            return (
              <button
                key={action.id}
                onClick={action.enabled ? action.action : undefined}
                disabled={!action.enabled}
                className={`relative overflow-hidden p-2 transition-all duration-300 user-action-btn
                ${action.enabled
                    ? `bg-linear-to-br ${action.color} text-white hover:shadow-xl cursor-pointer`
                    : "bg-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                  }
               ${enabledIndex !== -1 && isFocused(enabledIndex)
                    ? "outline-[6px] outline-[#dc2f02]"
                    : ""
                  }
              ${actions.length % 3 === 1 && action === actions[actions.length - 1]
                    ? "col-start-2"
                    : ""
                  }
`}
              >
                <div className="flex gap-2 items-center">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full ${action.enabled ? "bg-white/20" : "bg-gray-300/50"
                      }`}
                  >
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <h4 className="text-[28px] text-nowrap font-bold">
                      {action.title}
                    </h4>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default UserInfoModal;