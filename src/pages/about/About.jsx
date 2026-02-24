import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import bgImage from "../../assets/images/BgMain.jpg";
import { IoCalendarOutline, IoInformationCircleOutline } from "react-icons/io5";
import { IoArrowBack } from "react-icons/io5";
import { logout } from "../../redux/slice/authSlice";

function About() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState("KR");
  const [appInfo, setAppInfo] = useState([])
  const currentDate = new Date().toISOString().split('T')[0];

  const handleBack = () => {
    dispatch(logout());
    navigate('/');
  };
  // ✅ Load saved language
  useEffect(() => {
    const saved = localStorage.getItem("lang") || "ko";
    setLanguage(saved === "ko" ? "KR" : "EN");
    i18n.changeLanguage(saved);
  }, []);

  const handleLanguageChange = async (uiLang) => {
    const backendLang = uiLang === "KR" ? "ko" : "en";
    // UI + local
    setLanguage(uiLang);
    localStorage.setItem("lang", backendLang);
    i18n.changeLanguage(backendLang);
    dispatch(setLanguageAction(backendLang));
  };

  const fetchAppInfo = async () => {
    try {
      const appInfo = await invoke("get_app_info");
      setAppInfo(appInfo)
    } catch (error) {
      console.error("Failed to fetch app info:", error);
    }
  };
  useEffect(() => {
    fetchAppInfo();
  }, []);


  return (
    <div className='bg-[#20476E] h-screen flex justify-center items-center'>
      <div className="relative w-full h-full box-border flex flex-col justify-between shadow-[0_0_20px_rgba(0,0,0,0.4)] overflow-hidden">
        <img
          src={bgImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className=" text-white p-5">
          <div className="flex items-center w-[100%] h-[90%] bg-[#ffc908c0] top-0 opacity-80 z-90 absolute right-0 justify-center">
          </div>
        </div>
        <div className="relative flex z-90 justify-center items-center left-[12%] sm:h-[70%] sm:w-[75%] 2xl:h-[70%] 2xl:w-[75%] bg-gray-200 flex-col">
          <div className="about absolute sm:top-[40px] 2xl:top-[80px]">
            <div className="flex justify-end text-[#000000]">
              <div className="flex items-center justify-center">
                <div className="text-[#080a0c] font-bold sm:text-[1.5rem] 2xl:text-3xl flex">
                  <div onClick={handleBack} className="aboutRightAlign cursor-pointer text-black hover:underline mb-4 text-4xl absolute sm:right-[25rem] 2xl:right-[38rem]"><IoArrowBack /></div>
                  <span className="text-[#717983]">{t('translations.ABOUT')}</span>
                </div>
              </div>
            </div>
          </div>
          {/* New content section */}
          <div className="sm:mt-[10%] 2xl:mt-[5%] p-5 text-[#0f1820] h-[60%] w-[80%] border border-[#000000] sm:text-[12px] 2xl:text-[20px] sm:mb-2 2xl:mb-[3%]">
            {t('translations.This self-service kiosk by Wise Neosco India Pvt. Ltd. simplifies seat reservations, confirmations, cancellations, returns, and extensions. It also works with RFID, QR codes, and barcodes for fast, secure access.')}
          </div>
          <div className="flex justify-center space-x-[50%] w-full">
            <div className="flex items-center space-x-2 p-3  transition">
              <IoInformationCircleOutline className="text-[#f0bd06] sm:text-xl 2xl:text-2xl" />
              <span className="text-gray-700 font-semibold sm:text-[12px] 2xl:text-[16px]">{t('translations.App Version')}: {appInfo.version}</span>
            </div>
            <div className="flex items-center space-x-2 p-3 ">
              <IoCalendarOutline className="text-[#ddaf0a] sm:text-xl 2xl:text-2xl" />
              <span className="text-gray-700 font-semibold sm:text-[12px] 2xl:text-[16px]">{t('translations.Date')}: {currentDate}</span>
            </div>
          </div>

        </div>
        <footer className="relative bg-gray-200 sm:h-[5rem] 2xl:h-[7.5rem] flex items-center justify-between px-10 ">
          {/* 🌐 LANGUAGE */}
          <div className="flex rounded-xl border-2 border-white">
            {["KR", "EN"].map((lang, i) => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                className={`min-w-20 h-12 text-[28px] font-bold
        ${language === lang ? "bg-[#FFCA08] rounded-lg text-white" : "bg-white text-black"}
     `}
              >
                {lang}
              </button>
            ))}
          </div>

        </footer>
      </div>
    </div>
  );
}

export default About;

