import { AlertCircle } from "lucide-react";
import { getNoticeInfo } from "../../../services/api";
import { useEffect, useState, useRef } from "react";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";

const NoticeBanner = ({ isFocused, lang }) => {
  const [notices, setNotices] = useState([]);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const hasAnnouncedHeadingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const fetchNotices = async () => {
      try {
        setNotices([]);
        setNoticeIndex(0);

        const res = await getNoticeInfo();
        const list = res?.body?.NoticeList || [];

        if (isMounted) {
          setNotices(list);
          setNoticeIndex(0);
        }
      } catch (err) {
        console.error("Notice API failed:", err);
      }
    };

    fetchNotices();

    return () => {
      isMounted = false;
    };
  }, [lang]);

  useEffect(() => {
    if (!notices.length) return;

    const intervalTime = isFocused ? 20000 : 5000;

    const interval = setInterval(() => {
      setNoticeIndex((prev) => (prev + 1) % notices.length);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [notices, isFocused]);

  useEffect(() => {
    if (!isFocused) {
      hasAnnouncedHeadingRef.current = false;
      return;
    }

    if (!notices.length) return;

    const currentNotice = notices[noticeIndex];
    if (!currentNotice) return;

    const timer = setTimeout(() => {
      stop();

      const heading = !hasAnnouncedHeadingRef.current
        ? `${t("speech.Notice information")}. `
        : "";

      speak(`${heading}${currentNotice.TITLE}. ${currentNotice.CONTENTS}`);

      hasAnnouncedHeadingRef.current = true;
    }, 300);

    return () => clearTimeout(timer);
  }, [isFocused, noticeIndex, notices, speak, stop, t]);

  const current = notices[noticeIndex];

  return (
    <div className="absolute bottom-[108px] right-0 w-full px-6">
      
      <div
        className={`contrast-dark relative flex items-stretch overflow-hidden rounded-[20px] h-[230px]
        bg-gradient-to-br from-[rgba(15,12,30,0.78)] to-[rgba(30,22,10,0.82)]
        ${isFocused ? "border-[6px] border-[#dc2f02]" : "border-[6px] border-transparent"}`}
      >

        {/* Accent Strip */}
        <div className="w-[6px] bg-gradient-to-b from-[#c5c2b5] to-[#f0a500]" />

        {/* Icon */}
        <div className="flex items-center justify-center w-[72px] bg-[rgba(255,202,8,0.07)] border-r border-[rgba(255,202,8,0.12)]">
          
          <div className="w-[48px] h-[48px] flex items-center justify-center rounded-[14px]
          border border-[rgba(255,202,8,0.3)]
          bg-gradient-to-br from-[rgba(255,202,8,0.25)] to-[rgba(255,202,8,0.08)]">

            <AlertCircle className="w-[28px] h-[28px] text-[#FFCA08]" />

          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 gap-3 px-6 py-1 overflow-hidden">

          {/* Title */}
          <div className="flex items-center gap-3">
            <h3 className="contrast-accent text-[28px] font-bold truncate">
              {current?.TITLE || t("speech.Notice information")}
            </h3>

          </div>

          {/* Divider */}
          <div className="contrast-divider h-[1px] bg-gradient-to-r from-[rgba(255,202,8,0.4)] to-transparent" />

          {/* Body */}
          <div className="flex-1 overflow-y-auto pr-2">

            <p className="text-[26px] leading-[1.55] text-white/90">
              {current?.CONTENTS || t("speech.No notices available.")}
            </p>

          </div>
        </div>

        {/* Indicators */}
        {notices.length > 1 && (
          <div className="flex flex-col items-center justify-center gap-2 px-4 border-l border-[rgba(255,202,8,0.1)]">

            {notices.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300
                ${i === noticeIndex
                  ? "contrast-dot-active w-[8px] h-[24px] bg-[#FFCA08]"
                  : "contrast-dot w-[6px] h-[8px] bg-[rgba(255,202,8,0.25)]"}`}
              />
            ))}

          </div>
        )}
      </div>
    </div>
  );
};

export default NoticeBanner;