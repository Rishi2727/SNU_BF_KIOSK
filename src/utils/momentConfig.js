// utils/momentConfig.js
import moment from "moment-timezone";
import "moment/locale/en-gb"; // Import English locale (24h friendly)
moment.locale("en-gb");
moment.tz.setDefault("Asia/Seoul");
// Set default date format
moment.defaultFormat = "YYYY-MM-DD HH:mm:ss";

// Custom format presets
export const DATE_FORMATS = {
 FULL: "YYYY MMMM D, HH:mm",
  DATE_ONLY: "YYYY-MM-DD",
  TIME_ONLY: "HH:mm",
  DATETIME: "YYYY-MM-DD HH:mm",
  DATE_NUM: "YYYYMMDD",
  TIME_NUM: "HHmm",
  ISO: "YYYY-MM-DD, HH:mm:ss",
  EN_FULL: "dddd, MMMM D, YYYY h:mm A",
  EN_DATE: "MMMM D, YYYY",
  EN_DATETIME: "MMMM D, YYYY HH:mm",

  // ✅ ADD THIS
  KO_DATETIME: "YYYY년 MM월 DD일 HH:mm"
};

/**
 * Utility function to format dates consistently
 * @param {Date|string|moment} date - Date to format
 * @param {string} format - Format string (uses DATE_FORMATS if not provided)
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = DATE_FORMATS.EN_FULL) => {
  if (!date) return "-";
  return moment(date).format(format);
};

/**
 * Format date as YYYYMMDD for API calls
 * @param {Date|string|moment} date
 * @returns {string}
 */
export const formatDateNum = (date = new Date()) => {
  return moment(date).format(DATE_FORMATS.DATE_NUM);
};

/**
 * Format time as HHMM for API calls
 * @param {Date|string|moment} date
 * @returns {string}
 */
export const formatTimeNum = (date = new Date()) => {
  return moment(date).format(DATE_FORMATS.TIME_NUM);
};

/**
 * Get current timestamp
 * @returns {number}
 */
export const getCurrentTimestamp = () => {
  return moment().valueOf();
};

/**
 * Add time to a base date
 * @param {number} minutes - Minutes to add
 * @param {Date|string|moment} baseDate - Base date (defaults to now)
 * @returns {moment.Moment}
 */
export const addMinutes = (minutes, baseDate = new Date()) => {
  return moment(baseDate).add(minutes, "minutes");
};

/**
 * Check if date is valid
 * @param {Date|string|moment} date
 * @returns {boolean}
 */
export const isValidDate = (date) => {
  return moment(date).isValid();
};

/**
 * Get difference between two dates in minutes
 * @param {Date|string|moment} date1
 * @param {Date|string|moment} date2
 * @returns {number}
 */
export const getDifferenceInMinutes = (date1, date2) => {
  return moment(date1).diff(moment(date2), "minutes");
};

/**
 * Parse date string with specific format
 * @param {string} dateString
 * @param {string} format
 * @returns {moment.Moment}
 */
export const parseDate = (dateString, format = DATE_FORMATS.DATETIME) => {
  return moment(dateString, format);
};

/**
 * Check if date is before another date
 * @param {Date|string|moment} date1
 * @param {Date|string|moment} date2
 * @returns {boolean}
 */
export const isBefore = (date1, date2) => {
  return moment(date1).isBefore(moment(date2));
};

/**
 * Check if date is after another date
 * @param {Date|string|moment} date1
 * @param {Date|string|moment} date2
 * @returns {boolean}
 */
export const isAfter = (date1, date2) => {
  return moment(date1).isAfter(moment(date2));
};

/**
 * Get start of day
 * @param {Date|string|moment} date
 * @returns {moment.Moment}
 */
export const startOfDay = (date = new Date()) => {
  return moment(date).startOf("day");
};

/**
 * Get end of day
 * @param {Date|string|moment} date
 * @returns {moment.Moment}
 */
export const endOfDay = (date = new Date()) => {
  return moment(date).endOf("day");
};

/**
 * Format date range
 * @param {Date|string|moment} startDate
 * @param {Date|string|moment} endDate
 * @param {string} format
 * @returns {string}
 */
export const formatDateRange = (
  startDate,
  endDate,
  format = DATE_FORMATS.EN_FULL
) => {
  if (!startDate || !endDate) return "-";
  return `${formatDate(startDate, format)} ~ ${formatDate(endDate, format)}`;
};

/**
 * Get relative time (e.g., "2 hours ago", "in 5 minutes")
 * @param {Date|string|moment} date
 * @returns {string}
 */
export const getRelativeTime = (date) => {
  if (!date) return "-";
  return moment(date).fromNow();
};

/**
 * Clone moment instance
 * @param {moment.Moment} momentInstance
 * @returns {moment.Moment}
 */
export const cloneMoment = (momentInstance) => {
  return moment(momentInstance);
};

// Export moment instance for direct use
export { moment };

export default moment;
