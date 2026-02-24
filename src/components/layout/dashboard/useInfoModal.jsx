import { CheckCircle, CheckCircle2, Clock, LogOut, Move, User, XCircle } from "lucide-react";
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

  const actions = [
    {
      id: "extend",
      title: t("translations.Seat Extension"),
      icon: <Clock className="w-12 h-12" />,
      enabled: userInfo?.EXTEND_YN === "Y",
      color: "from-teal-500 to-teal-600",
      action: () => onAction("extend", userInfo?.ASSIGN_NO),
    },
    {
      id: "move",
      title: t("translations.Seat Move"),
      icon: <Move className="w-12 h-12" />,
      enabled: userInfo?.MOVE_YN === "Y",
      color: "bg-yellow-500/90",
      action: () => onAction("move", userInfo?.ASSIGN_NO),
    },
    {
      id: "return",
      title: t("translations.Seat Return"),
      icon: <LogOut className="w-12 h-12" />,
      enabled: userInfo?.RETURN_YN === "Y",
      color: "bg-[#9A7D4C]",
      action: () => onAction("return", userInfo?.ASSIGN_NO),
    },
    {
      id: "check",
      title: t("translations.Reservation Check"),
      icon: <CheckCircle className="w-12 h-12" />,
      enabled: userInfo?.BOOKING_CHECK_YN === "Y",
      color: "from-green-500 to-green-600",
      action: () => onAction("check"),
    },
    {
      id: "cancel",
      title: t("translations.Reservation Cancel"),
      icon: <XCircle className="w-12 h-12" />,
      enabled: userInfo?.CANCEL_YN === "Y",
      color: "from-red-500 to-red-600",
      action: () => onAction("cancel"),
    },
    {
      id: "assign",
      title: t("translations.Seat Assignment"),
      icon: <User className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_YN === "Y",
      color: "from-indigo-500 to-indigo-600",
      action: () => onAction("assign"),
    },
    {
      id: "assignCheck",
      title: t("translations.Assignment Check"),
      icon: <CheckCircle2 className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_CHECK_YN === "Y",
      color: "from-cyan-500 to-cyan-600",
      action: () => onAction("assignCheck", userInfo?.ASSIGN_NO),
    },
  ];

  const focusableActions = useMemo(
    () => actions.filter((a) => a.enabled),
    [actions]
  );

  // ⭐ Close button treated as last focus item
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
      const maxIndex = focusableActions.length; // include close button

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
      className="h-[50vh]! outline-[6px] outline-[#dc2f02]!"
      closeFocused={focusIndex === CLOSE_BUTTON_INDEX}
    >
      <div className="space-y-7">
        <div className="bg-linear-to-r from-teal-50 to-cyan-50 rounded-lg p-6 border-l-4 border-teal-500">
          <p className="text-2xl text-gray-800 font-semibold">
            {t(
              "translations.You are now logged in. Please select the features you wish to use."
            )}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => {
            const enabledIndex = focusableActions.findIndex(
              (a) => a.id === action.id
            );

            return (
              <button
                key={action.id}
                onClick={action.enabled ? action.action : undefined}
                disabled={!action.enabled}
                className={`relative overflow-hidden rounded-lg p-2 transition-all duration-300
                ${
                  action.enabled
                    ? `bg-linear-to-br ${action.color} text-white hover:shadow-xl cursor-pointer`
                    : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-60"
                }
                ${
                  enabledIndex !== -1 && isFocused(enabledIndex)
                    ? "outline-[6px] outline-[#dc2f02]"
                    : ""
                }
              `}
              >
                <div className="flex gap-2 items-center">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full ${
                      action.enabled ? "bg-white/20" : "bg-gray-300/50"
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