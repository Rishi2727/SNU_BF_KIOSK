import { AlertCircle } from "lucide-react";
import { getNoticeInfo } from "../../../services/api";
import { useEffect, useState } from "react";
import { useVoice } from "../../../context/voiceContext";
import { useTranslation } from "react-i18next";
import { useRef } from "react";

const NoticeBanner = ({ isFocused, lang }) => {
  const [notices, setNotices] = useState([]);
  const [noticeIndex, setNoticeIndex] = useState(0);
  const { speak, stop } = useVoice();
  const { t } = useTranslation();
  const hasAnnouncedHeadingRef = useRef(false);

  // 🔁 Re-fetch when language changes
  useEffect(() => {
    let isMounted = true;

    const fetchNotices = async () => {
      try {
        setNotices([]); // ✅ clear old language data
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
  }, [lang]); // ✅ language dependency

  // 🔁 Auto slide (slow down when focused)
  useEffect(() => {
    if (!notices.length) return;
    const intervalTime = isFocused ? 20000 : 5000;

    const interval = setInterval(() => {
      setNoticeIndex((prev) => (prev + 1) % notices.length);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [notices, isFocused]);

  // 🔊 VOICE: speak notice when focused or notice changes
  useEffect(() => {
    if (!isFocused) {
      hasAnnouncedHeadingRef.current = false; // reset when focus leaves
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

  return (
    <div className="notice-banner absolute bottom-[100px] right-0 w-[73%] px-6">
      <div
        className={`relative flex gap-5 items-start 
          bg-yellow-500/90 backdrop-blur-md 
          rounded-2xl p-3 shadow-2xl border border-yellow-300/40
          transition-all duration-300
          h-60
          ${isFocused ? "outline-[6px] outline-[#dc2f02] " : ""}
        `}
      >
        <div className="shrink-0 bg-white/25 p-2 rounded-xl">
          <AlertCircle className="w-9 h-9 text-white drop-shadow-md" />
        </div>

        <div className="flex flex-col gap-2 w-full h-full overflow-hidden">
          <h3 className="text-[32px] font-extrabold tracking-wide leading-8 drop-shadow-md shrink-0 text-[#9A7D4C]">
            {notices.length
              ? notices[noticeIndex]?.TITLE
              : t("speech.Notice information")}
          </h3>

          <div className="w-full h-0.5 bg-white/40 rounded-full shrink-0" />

          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/50 scrollbar-track-transparent">
            <p className="text-[30px] leading-10 font-medium text-white/95 transition-all duration-500">
              {`${
                notices.length
                  ? notices[noticeIndex]?.CONTENTS
                  : t("speech.No notices available.")
              }`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeBanner;
