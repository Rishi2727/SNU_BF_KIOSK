import { AlertCircle } from "lucide-react";
import { getNoticeInfo } from "../../../services/api";
import { useEffect, useState } from "react";

const NoticeBanner = ({isFocused, FocusRegion }) => {
      const [notices, setNotices] = useState([]);
      const [noticeIndex, setNoticeIndex] = useState(0);
        //======================Notice=========================
        useEffect(() => {
          const fetchNotices = async () => {
            try {
              const res = await getNoticeInfo();
              console.log("NOTICE API FULL RESPONSE:", res);
      
              const list = res?.body?.NoticeList || [];
      
              setNotices(list);
              setNoticeIndex(0);
            } catch (err) {
              console.error("Notice API failed:", err);
            }
          };
      
          fetchNotices();
        }, []);
      
        useEffect(() => {
          if (!notices.length) return;
      
          const interval = setInterval(() => {
            setNoticeIndex((prev) => (prev + 1) % notices.length);
          }, 5000); // change slide every 5 sec
      
          return () => clearInterval(interval);
        }, [notices]);
      
  return (
    <div className="absolute bottom-[100px] right-0 w-[73%] px-6">
      <div
        className={`relative flex gap-5 items-start 
          bg-yellow-500/90 backdrop-blur-md 
          rounded-2xl p-3 shadow-2xl border border-yellow-300/40
          transition-all duration-300
          h-[240px]
          ${isFocused ? "outline-[6px] outline-[#dc2f02] scale-[1.01]" : ""}
        `}
      >
        {/* Icon */}
        <div className="shrink-0 bg-white/25 p-2 rounded-xl">
          <AlertCircle className="w-9 h-9 text-white drop-shadow-md" />
        </div>

        {/* Text Content */}
        <div className="flex flex-col gap-2 w-full h-full overflow-hidden">
          
          {/* Title */}
          <h3 className="text-[32px] font-extrabold tracking-wide leading-8 drop-shadow-md shrink-0">
            {notices.length
              ? notices[noticeIndex]?.TITLE || "Notice"
              : "Notice"}
          </h3>

          {/* Divider */}
          <div className="w-full h-[2px] bg-white/40 rounded-full shrink-0" />

          {/* Description */}
          <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/50 scrollbar-track-transparent">
            <p className="text-[30px] leading-10 font-medium text-white/95 transition-all duration-500">
              {notices.length
                ? notices[noticeIndex]?.CONTENTS
                : "No notices available."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticeBanner;
