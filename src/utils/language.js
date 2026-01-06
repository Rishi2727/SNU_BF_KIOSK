/**
 * Language utility functions for managing language preferences
 */

/**
 * Get the current language from localStorage
 * @returns {string} Current language code ('ko' or 'en')
 */
export const getCurrentLanguage = () => {
  return localStorage.getItem("lang") || "ko";
};

/**
 * Set the current language in localStorage
 * @param {string} lang - Language code ('ko' or 'en')
 */
export const setCurrentLanguage = (lang) => {
  localStorage.setItem("lang", lang);
};

/**
 * Get display language (for UI)
 * @param {string} lang - Language code ('ko' or 'en')
 * @returns {string} Display language ('KR' or 'EN')
 */
export const getDisplayLanguage = (lang) => {
  return lang === "ko" ? "KR" : "EN";
};

/**
 * Get backend language from display language
 * @param {string} displayLang - Display language ('KR' or 'EN')
 * @returns {string} Backend language code ('ko' or 'en')
 */
export const getBackendLanguage = (displayLang) => {
  return displayLang === "KR" ? "ko" : "en";
};