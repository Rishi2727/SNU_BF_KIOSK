export const SPEECH = {

  // ============================================================================
  // INFORMATION MODAL
  // ============================================================================
  INFO_MODAL: {
    INFORMATION: "System User Guide",
    KEYPAD_INFORMATION: "Keypad Usage Guide",

    wayOfLogin: "Way of Login",
    wayOfLoginMsg:
      "Login is performed by scanning a membership card, student ID, or other identification card using the RFID reader, or by scanning a barcode or QR code with the barcode/QR scanner.",

    seatBooking: "Seat Booking",
    seatBookingMsg:
      "After logging in, select a reading room from the reading room selection area, then choose your desired seat to receive a seat ticket.",

    wayOfReturningSeat: "Way of Returning the Seat",
    wayOfReturningSeatMsg:
      "After logging in, go to the reading room selection area, select the room where you are seated, and follow the instructions to return your seat.",

    howToRequestHelp: "How to Request Help",
    howToRequestHelpMsg:
      "If you need assistance, you can request help from a staff member by using the guide button on the right side of the keypad.",

    keypadDirectionButtonGuide: "KEYPAD_DIRECTION_BUTTON_GUIDE",
    keypadDirectionButtonGuideMsg: "KEYPAD_DIRECTION_BUTTON_GUIDE_MSG",

    specialKeyGuide: "SPECIAL_KEY_GUIDE",
    specialKeyGuideMsg: "SPECIAL_KEY_GUIDE_MSG",

    numericKeypadUsageGuide: "NUMERIC_KEYPAD_USAGE_GUIDE",
    numericKeypadUsageGuideMsg: "NUMERIC_KEYPAD_USAGE_GUIDE_MSG"

  },

};
/**
 * Helper function to get speech text with optional formatting
 * @param {string} path - Path to speech constant (e.g., 'FOOTER.VOLUME_PERCENT')
 * @param {object} params - Optional parameters for string interpolation
 * @returns {string} The speech text
 */
export const getSpeechText = (path, params = {}) => {
  const keys = path.split('.');
  let value = SPEECH;

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      console.warn(`Speech constant not found: ${path}`);
      return '';
    }
  }

  // Simple parameter interpolation if needed
  let text = String(value);
  Object.entries(params).forEach(([key, val]) => {
    text = text.replace(`{{${key}}}`, val);
  });

  return text;
};

export default SPEECH;
