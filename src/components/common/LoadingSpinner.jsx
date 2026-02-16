import { useTranslation } from "react-i18next";

const LoadingSpinner = ({ message = "Loading...", showText = true }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#FFCA08] mx-auto mb-4"></div>

        {/* ✅ Only show text when allowed */}
        {showText && (
          <p className="text-2xl text-white">
            {t(`translations.${message}`)}
          </p>
        )}
      </div>
    </div>
  );
};

export default LoadingSpinner;
