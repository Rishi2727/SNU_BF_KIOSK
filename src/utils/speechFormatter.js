// src/utils/speechFormatter.js

export const formatFloorForSpeech = (title, lang) => {
  if (lang === "ko") {
    // B1 → 지하 1층
    if (/^B(\d+)/i.test(title)) {
      return title.replace(/^B(\d+)/i, "지하 $1층");
    }

    // 6F → 6층
    if (/^(\d+)\s*F$/i.test(title)) {
      return title.replace(/F/i, "층");
    }
  }

  return title; // English or fallback
};
