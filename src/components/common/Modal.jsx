const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'medium', // small, medium, large
  showCloseButton = true 
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    small: 'w-[400px]',
    medium: 'w-[600px]',
    large: 'w-[800px]',
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-lg shadow-2xl ${sizeClasses[size]} max-w-[90vw] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {title && (
          <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-8 py-5 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="px-8 py-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;