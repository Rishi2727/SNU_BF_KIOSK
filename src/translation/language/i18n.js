import { initReactI18next } from 'react-i18next';

import i18n from 'i18next';
import enTranslations from '../locals/en';
import koTranslations from '../locals/ko';

const resources = {
   en: { translation: enTranslations },
  ko: { translation: koTranslations },
};

const getInitialLanguage = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('lang') || 'ko';
  }
  return 'ko'; 
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    saveMissing: false,
    parseMissingKeyHandler: (key) => {
      const lastPart = key.split('.').pop() || key;
      
      return lastPart
    },
    returnEmptyString: false,
  });

export default i18n;
