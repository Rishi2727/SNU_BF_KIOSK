import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locals/en.json";
import ko from "../locals/ko.json";

const getInitialLang = () => {
  if (typeof window === "undefined") return "ko";
  return localStorage.getItem("lang") || "ko";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ko: { translation: ko },
  },
  lng: getInitialLang(),
  fallbackLng: "ko",
  interpolation: { escapeValue: false },
});

export default i18n;
