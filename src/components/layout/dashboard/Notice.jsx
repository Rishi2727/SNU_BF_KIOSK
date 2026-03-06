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
    className={`contrast-dark relative flex items-stretch overflow-hidden rounded-[22px] h-[220px]
    bg-gradient-to-br from-[#fffaf0] via-[#fff3d6] to-[#ffe9a8]
    shadow-[0_8px_30px_rgba(0,0,0,0.08)]
    backdrop-blur-md
    transition-all duration-300
    ${isFocused
      ? "outline outline-[6px] outline-[#dc2f02] shadow-[0_0_0_6px_rgba(255,202,8,0.35)]"
      : "outline outline-[2px] outline-[#f3d98a]"
    }`}
  >

    {/* Accent Strip */}
    <div className="w-[8px] bg-gradient-to-b from-[#ffca08] via-[#f0a500] to-[#d89c00]" />

    {/* Icon Section */}
    <div className="flex items-center justify-center w-[90px]
      bg-[gradient-to-br from-[#fff6d8] to-[#ffe8a0]]
      border-r border-[#f2d48a]">

      <div className="w-[56px] h-[56px] flex items-center justify-center
      rounded-[16px]
      shadow-inner
      bg-gradient-to-br from-[#ffca08] to-[#f0a500]">

        <AlertCircle className="w-[30px] h-[30px] text-white" />

      </div>
    </div>

    {/* Content */}
    <div className="flex flex-col flex-1 gap-3 px-6 py-4 overflow-hidden">

      {/* Title */}
      <div className="flex items-center gap-3">
        <h3 className="text-[28px] font-bold text-[#3b2a00] tracking-wide truncate">
          {current?.TITLE || t("speech.Notice information")}
        </h3>
      </div>

      {/* Divider */}
      <div className="h-[2px] rounded-full
        bg-gradient-to-r from-[#ffca08] via-[#ffd84a] to-transparent" />

      {/* Body */}
      <div className="flex-1 overflow-y-auto pr-2">

        <p className="text-[25px] leading-[1.6] text-[#5a4200]">
          {current?.CONTENTS || t("speech.No notices available.")}
        </p>

      </div>
    </div>

    {/* Indicators */}
    {notices.length > 1 && (
      <div className="flex flex-col items-center justify-center gap-2 px-4
      border-l border-[#f3d98a]">

        {notices.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300
            ${i === noticeIndex
              ? "w-[10px] h-[26px] bg-gradient-to-b from-[#ffca08] to-[#f0a500]"
              : "w-[7px] h-[10px] bg-[#f0d890]"}
            `}
          />
        ))}

      </div>
    )}
  </div>
</div>
  );
};

export default NoticeBanner;