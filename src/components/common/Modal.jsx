const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'medium',
  showCloseButton = true,
  className = "",
  closeFocused = false,
    zIndex = 50  

}) => {
  if (!isOpen) return null;


  const handleClose = () => {
    onClose?.();

    // ⭐ GLOBAL MODAL CLOSE CALLBACK (same behaviour as old Swal)
    if (window.__ON_MODAL_CLOSE__) {
      window.__ON_MODAL_CLOSE__();
    }
  };

  const sizeClasses = {
    small: 'w-[400px]',
    medium: 'w-[800px]',
    large: 'w-[1000px] ',
  };

  return (
    <div
      className="fixed inset-0  flex items-center justify-center bg-black/50 backdrop-blur-sm"
        style={{ zIndex }}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl ${sizeClasses[size]} max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden  ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="bg-linear-to-r from-gray-100 to-gray-50 px-8 py-5 border-b flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {showCloseButton && (
              <button
                onClick={handleClose}
                className={`
    text-gray-500 hover:text-gray-700 transition-colors
    ${closeFocused ? " outline-[6px] outline-[#dc2f02] " : ""}
  `}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="px-8 py-6 flex-1 overflow-y-auto">
          {children}
        </div>

        {footer && (
          <div className="px-8 py-5 bg-gray-50 border-t mt-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
export default Modal;