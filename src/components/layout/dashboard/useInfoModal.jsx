import { CheckCircle, CheckCircle2, Clock, LogOut, Move, User, XCircle } from "lucide-react";
import Modal from "../../common/Modal";

const UserInfoModal = ({ isOpen, onClose, userInfo, onAction }) => {
  const actions = [
    {
      id: 'extend',
      title: 'Seat Extension',
      subtitle: '좌석연장',
      icon: <Clock className="w-12 h-12" />,
      enabled: userInfo?.EXTEND_YN === 'Y',
      color: 'from-teal-500 to-teal-600',
      action: () => onAction('extend', userInfo?.ASSIGN_NO)
    },
    {
      id: 'move',
      title: 'Seat Move',
      icon: <Move className="w-12 h-12" />,
      enabled: userInfo?.MOVE_YN === 'Y',
      color: 'bg-yellow-500/90',
      action: () => onAction('move', userInfo?.ASSIGN_NO)
    },
    {
      id: 'return',
      title: 'Seat Return',
      icon: <LogOut className="w-12 h-12" />,
      enabled: userInfo?.RETURN_YN === 'Y',
      color: 'bg-[#9A7D4C]',
      action: () => onAction('return', userInfo?.ASSIGN_NO)
    },
    {
      id: 'check',
      title: 'Reservation Check',
      icon: <CheckCircle className="w-12 h-12" />,
      enabled: userInfo?.BOOKING_CHECK_YN === 'Y',
      color: 'from-green-500 to-green-600',
      action: () => onAction('check')
    },
    {
      id: 'cancel',
      title: 'Reservation Cancel',
      icon: <XCircle className="w-12 h-12" />,
      enabled: userInfo?.CANCEL_YN === 'Y',
      color: 'from-red-500 to-red-600',
      action: () => onAction('cancel')
    },
    {
      id: 'assign',
      title: 'Seat Assignment',
      icon: <User className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_YN === 'Y',
      color: 'from-indigo-500 to-indigo-600',
      action: () => onAction('assign')
    },
    {
      id: 'assignCheck',
      title: 'Assignment Check',
      icon: <CheckCircle2 className="w-12 h-12" />,
      enabled: userInfo?.ASSIGN_CHECK_YN === 'Y',
      color: 'from-cyan-500 to-cyan-600',
      action: () => onAction('assignCheck', userInfo?.ASSIGN_NO)
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Information"
      size="large"
    >
      <div className="space-y-6">
        {/* Welcome Message */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-6 border-l-4 border-teal-500">
          <p className="text-2xl text-gray-800 font-semibold">
            You are now logged in. Please select the features you wish to use.
          </p>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.enabled ? action.action : undefined}
              disabled={!action.enabled}
              className={`
                relative overflow-hidden rounded-xl p-2 transition-all duration-300
                ${action.enabled 
                  ? `bg-gradient-to-br ${action.color} text-white hover:scale-105 hover:shadow-xl cursor-pointer` 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                }
              `}
            >
              <div className="flex flex-col items-center">
                <div className={`p-1 rounded-full ${action.enabled ? 'bg-white/20' : 'bg-gray-300/50'}`}>
                  {action.icon}
                </div>
                <div className="text-center">
                  <h4 className="text-[32px] font-bold">{action.title}</h4>
                </div>
              </div>
            </button>
          ))}
        </div>      
      </div>
    </Modal>
  );
};
export default UserInfoModal;