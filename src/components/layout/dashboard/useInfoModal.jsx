import { CheckCircle, CheckCircle2, Clock, LogOut, Move, User, XCircle } from "lucide-react";
import Modal from "../../common/Modal";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";

const UserInfoModal = ({ isOpen, onClose, userInfo, onAction }) => {
  const [focusIndex, setFocusIndex] = useState(0);
  const [isModalFocused, setIsModalFocused] = useState(false);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const hasSpokenIntroRef = useRef(false);

 
  const actions = [
    {
      id: 'extend',
      title: t('common.Seat Extension'),
      subtitle: '좌석연장',
      icon: <Clock className="w-12 h-12" />,
      enabled: userInfo?.EXTEND_YN === 'Y',
      color: 'from-teal-500 to-teal-600',
      action: () => onAction('extend', userInfo?.ASSIGN_NO)
    },
    {
      id: 'move',
      title: t('common.Seat Move'),
      icon: <Move className="w-12 h-12" />,
      enabled: userInfo?.MOVE_YN === 'Y',
      color: 'bg-yellow-500/90',
      action: () => onAction('move', userInfo?.ASSIGN_NO)
    },
    {
      id: 'return',
      title: t('common.Seat Return'),
      icon: <LogOut className="w-12 h-12" />,
      enabled: userInfo?.RETURN_YN === 'Y',
      color: 'bg-[#9A7D4C]',
      action: () => onAction('return', userInfo?.ASSIGN_NO)
    },
    {
      id: 'check',
      title: t('common.Reservation Check'),
      icon: <CheckCircle className="w-12 h-12" />,
      enabled: userInfo?.BOOKING_CHECK_YN === 'Y',
      color: 'from-green-500 to-green-600',
      action: () => onAction('check')
    },
    {
      id: 'cancel',
      title: t('common.Reservation Cancel'),
      icon: <XCircle className="w-12 h-12" />,
      enabled: userInfo?.CANCEL_YN === 'Y',
      color: 'from-red-500 to-red-600',
      action: () => onAction('cancel')
    },
    {
      id: 'assign',
      title: t('common.Seat Assignment'),
      icon: <User className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_YN === 'Y',
      color: 'from-indigo-500 to-indigo-600',
      action: () => onAction('assign')
    },
    {
      id: 'assignCheck',
      title: t('common.Assignment Check'),
      icon: <CheckCircle2 className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_CHECK_YN === 'Y',
      color: 'from-cyan-500 to-cyan-600',
      action: () => onAction('assignCheck', userInfo?.ASSIGN_NO)
    }
  ];


  //To implement focus functionality 
  const focusableActions = useMemo(
    () => actions.filter(a => a.enabled),
    [actions]
  );
useEffect(() => {
  if (isOpen) {
    setIsModalFocused(true);
    setFocusIndex(0);
    hasSpokenIntroRef.current = false;

    stop();
    speak(
      `${t("common.User Information")}. ${t(
        "common.You are now logged in. Please select the features you wish to use."
      )}`
    );
  } else {
    setIsModalFocused(false);
    setFocusIndex(0);
    hasSpokenIntroRef.current = false;
    stop();
  }
}, [isOpen, stop, speak, t]);


  useEffect(() => {
    if (!isOpen || !isModalFocused) return;
    const handleKeyDown = (e) => {
      const maxIndex = focusableActions.length - 1;
      if (maxIndex < 0) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusIndex(prev => (prev + 1) % (maxIndex + 1));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusIndex(prev => (prev - 1 + maxIndex + 1) % (maxIndex + 1));
          break;
        case "Enter":
          e.preventDefault();
          focusableActions[focusIndex]?.action();
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isModalFocused, focusIndex, focusableActions]);
  const isFocused = useCallback(
    (index) => isModalFocused && focusIndex === index,
    [isModalFocused, focusIndex]
  );


  //Speech Functionality 
useEffect(() => {
  if (!isOpen || !isModalFocused) return;

  // ⛔ Skip speaking focused element once (right after modal opens)
  if (!hasSpokenIntroRef.current) {
    hasSpokenIntroRef.current = true;
    return;
  }

  const currentAction = focusableActions[focusIndex];
  if (currentAction) {
    stop();
    speak(
      t(`speech.${currentAction.title}`, {
        defaultValue: currentAction.title
      })
    );
  }
}, [focusIndex, isOpen, isModalFocused, focusableActions, speak, stop, t]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("common.User Information")}
      size="large"
      className="h-[50vh]! outline-[5px] outline-[#dc2f02]!"
    >
      <div className="space-y-7">
        <div className="bg-linear-to-r from-teal-50 to-cyan-50 rounded-lg p-6 border-l-4 border-teal-500">
          <p className="text-2xl text-gray-800 font-semibold">
            {t("common.You are now logged in. Please select the features you wish to use.")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action, index) => {
            const enabledIndex = focusableActions.findIndex(a => a.id === action.id);
            return (
              <button
                key={action.id}
                onClick={action.enabled ? action.action : undefined}
                disabled={!action.enabled}
                className={`
        relative overflow-hidden rounded-lg p-2 transition-all duration-300
        ${action.enabled
                    ? `bg-linear-to-br ${action.color} text-white hover:shadow-xl cursor-pointer`
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                  }
        ${enabledIndex !== -1 && isFocused(enabledIndex)
                    ? ' outline-[6px] outline-[#dc2f02]'
                    : ''
                  }
      `}
              >
                <div className="flex gap-2 items-center ">
                  <div className={`    flex items-center justify-center
        w-7 h-7 rounded-full  ${action.enabled ? 'bg-white/20' : 'bg-gray-300/50'}`}>
                    {action.icon}
                  </div>
                  <div className="text-center ">
                    <h4 className="text-[28px] text-nowrap font-bold ">{action.title}</h4>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  );
};
export default UserInfoModal;