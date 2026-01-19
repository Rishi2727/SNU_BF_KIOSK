export const MINI_MAP_LAYOUT = {
  16101: {
    rows: 3,
    cols: 3,
    seatFontScale: 1.2,
    defaultScale: 4.5,
    sectors: [
      // Row 0
      { id: "A", row: 0, col: 0, transform: { scale: 3.5, x: 40, y: 100 } },
      { id: "B", row: 0, col: 1, transform: { scale: 3.5, x: 20, y: 100 } },
      { id: "C", row: 0, col: 2, transform: { scale: 3.5, x: -80, y: 100 } },
      { id: "D", row: 1, col: 0, transform: { scale: 3.5, x: 100, y: 0 } },
      { id: "E", row: 1, col: 1, transform: { scale: 3.5, x: 50, y: 0 } },
      { id: "F", row: 1, col: 2, transform: { scale: 3.5, x: -0, y: 0 } },
      { id: "G", row: 2, col: 0, transform: { scale: 3.5, x: 30, y: -80 } },
      { id: "H", row: 2, col: 1, transform: { scale: 3.5, x: 0, y: -80 } },
      { id: "I", row: 2, col: 2, transform: { scale: 3.5, x: -70, y: -80 } },
    ],
  },
  16301: {
    rows: 4,
    cols: 4,
    seatFontScale: 3,
    defaultScale: 2,
    sectors: [
      { id: "A", row: 0, col: 2, transform: { scale: 2, x: 40, y: 80 } },
      { id: "B", row: 0, col: 3, transform: { scale: 2, x: -40, y: 80 } },

      { id: "C", row: 1, col: 2, transform: { scale: 2, x: 0, y: 30 } },
      { id: "D", row: 1, col: 3, transform: { scale: 2, x: -40, y: 30 } },

      { id: "E", row: 2, col: 2, transform: { scale: 2, x: 0, y: -30 } },
      { id: "F", row: 2, col: 3, transform: { scale: 2, x: -40, y: -30 } },

      { id: "G", row: 3, col: 2, transform: { scale: 2, x: 40, y: -80 } },
      { id: "H", row: 3, col: 3, transform: { scale: 2, x: -40, y: -80 } },
    ],
  },

  17201: {
    rows: 4,
    cols: 4,
    seatFontScale: 3,
    defaultScale: 2,
    sectors: [
      // ✅ LEFT SIDE ONLY (right side hidden)

      { id: "A", row: 0, col: 0, transform: { scale: 2, x: 50, y: 80 } },
      { id: "B", row: 0, col: 1, transform: { scale: 2, x: -10, y: 80 } },

      { id: "C", row: 1, col: 0, transform: { scale: 2, x: 50, y: 25 } },
      { id: "D", row: 1, col: 1, transform: { scale: 2, x: 0, y: 25 } },

      { id: "E", row: 2, col: 0, transform: { scale: 2, x: 50, y: -24 } },
      { id: "F", row: 2, col: 1, transform: { scale: 2, x: 0, y: -24 } },

      { id: "G", row: 3, col: 0, transform: { scale: 2, x: 50, y: -80 } },
      { id: "H", row: 3, col: 1, transform: { scale: 2, x: -10, y: -80 } },
    ],
  },
  17202: {
    rows: 4,
    cols: 4,
    defaultScale: 4.5,
    seatFontScale: 1.6,
    sectors: [
      // ===== ROW 0 =====
      { id: "A", row: 0, col: 0, transform: { scale: 3.5, x: 90, y: 126 } },
      { id: "B", row: 0, col: 1, transform: { scale: 3.5, x: 10, y: 126 } },
      { id: "C", row: 0, col: 2, transform: { scale: 3.5, x: -70, y: 126 } },
      { id: "D", row: 0, col: 3, transform: { scale: 3.5, x: -120, y: 126 } },

      // ===== ROW 1 =====
      { id: "E", row: 1, col: 0, transform: { scale: 3.5, x: 120, y: 27 } },
      { id: "F", row: 1, col: 1, transform: { scale: 3.5, x: 35, y: 27 } },
      { id: "G", row: 1, col: 2, transform: { scale: 3.5, x: -40, y: 27 } },
      { id: "H", row: 1, col: 3, transform: { scale: 3.5, x: -115, y: 27 } },

      // ===== ROW 2 =====
      { id: "I", row: 2, col: 0, transform: { scale: 3.5, x: 120, y: -90 } },
      { id: "J", row: 2, col: 1, transform: { scale: 3.5, x: 35, y: -90 } },
      { id: "K", row: 2, col: 2, transform: { scale: 3.5, x: -40, y: -90 } },
      { id: "L", row: 2, col: 3, transform: { scale: 3.5, x: -115, y: -90 } },

      // ===== ROW 3 =====
      { id: "M", row: 3, col: 0, transform: { scale: 3.5, x: 90, y: -126 } },
      { id: "N", row: 3, col: 1, transform: { scale: 3.5, x: 10, y: -126 } },
      { id: "O", row: 3, col: 2, transform: { scale: 3.5, x: -70, y: -126 } },
      { id: "P", row: 3, col: 3, transform: { scale: 3.5, x: -120, y: -126 } },
    ],
  },
  17101: {
    rows: 3,
    cols: 3,
    defaultScale: 4.5,
    seatFontScale: 1.6,
    sectors: [
      { id: "A", row: 0, col: 0, transform: { scale: 3.5, x: 100, y: 130 } },
      { id: "B", row: 0, col: 1, transform: { scale: 3.5, x: 10, y: 130 } },
      { id: "C", row: 0, col: 2, transform: { scale: 3.5, x: -90, y: 130 } },
      { id: "G", row: 2, col: 0, transform: { scale: 3.5, x: 100, y: -130 } },
      { id: "H", row: 2, col: 1, transform: { scale: 3.5, x: 10, y: -130 } },
      { id: "I", row: 2, col: 2, transform: { scale: 3.5, x: -90, y: -130 } },
    ],
  },
  17301: {
    rows: 4,
    cols: 4,
    seatFontScale: 3,
    defaultScale: 2,
    sectors: [
      { id: "A", row: 0, col: 2, transform: { scale: 2, x: 40, y: 70 } },
      { id: "B", row: 0, col: 3, transform: { scale: 2, x: -40, y: 80 } },

      { id: "C", row: 1, col: 2, transform: { scale: 2, x: 0, y: 30 } },
      { id: "D", row: 1, col: 3, transform: { scale: 2, x: -40, y: 30 } },

      { id: "E", row: 2, col: 2, transform: { scale: 2, x: 0, y: -30 } },
      { id: "F", row: 2, col: 3, transform: { scale: 2, x: -40, y: -30 } },

      { id: "G", row: 3, col: 2, transform: { scale: 2, x: 40, y: -70 } },
      { id: "H", row: 3, col: 3, transform: { scale: 2, x: -40, y: -80 } },
    ],
  },
  18201: {
    rows: 4,
    cols: 4,
    seatFontScale: 3,
    defaultScale: 2,
    sectors: [
      // ✅ LEFT SIDE ONLY (right side hidden)

      { id: "A", row: 0, col: 0, transform: { scale: 2, x: 50, y: 80 } },
      { id: "B", row: 0, col: 1, transform: { scale: 2, x: -10, y: 80 } },

      { id: "C", row: 1, col: 0, transform: { scale: 2, x: 50, y: 25 } },
      { id: "D", row: 1, col: 1, transform: { scale: 2, x: 0, y: 25 } },

      { id: "E", row: 2, col: 0, transform: { scale: 2, x: 50, y: -24 } },
      { id: "F", row: 2, col: 1, transform: { scale: 2, x: 0, y: -24 } },

      { id: "G", row: 3, col: 0, transform: { scale: 2, x: 50, y: -80 } },
      { id: "H", row: 3, col: 1, transform: { scale: 2, x: -10, y: -80 } },
    ],
  },
  18202: {
    rows: 4,
    cols: 4,
    defaultScale: 4.5,
    seatFontScale: 1.5,
    sectors: [
      // ===== ROW 0 =====
      { id: "A", row: 0, col: 0, transform: { scale: 3.5, x: 90, y: 125 } },
      { id: "B", row: 0, col: 1, transform: { scale: 3.5, x: 10, y: 125 } },
      { id: "C", row: 0, col: 2, transform: { scale: 3.5, x: -70, y: 125 } },
      { id: "D", row: 0, col: 3, transform: { scale: 3.5, x: -120, y: 125 } },

      // ===== ROW 1 =====
      { id: "E", row: 1, col: 0, transform: { scale: 3.5, x: 120, y: 30 } },
      { id: "F", row: 1, col: 1, transform: { scale: 3.5, x: 40, y: 30 } },
      { id: "G", row: 1, col: 2, transform: { scale: 3.5, x: -40, y: 30 } },
      { id: "H", row: 1, col: 3, transform: { scale: 3.5, x: -115, y: 30 } },

      // ===== ROW 2 =====
      { id: "I", row: 2, col: 0, transform: { scale: 3.5, x: 120, y: -60 } },
      { id: "J", row: 2, col: 1, transform: { scale: 3.5, x: 40, y: -60 } },
      { id: "K", row: 2, col: 2, transform: { scale: 3.5, x: -40, y: -60 } },
      { id: "L", row: 2, col: 3, transform: { scale: 3.5, x: -115, y: -60 } },

      // ===== ROW 3 =====
      { id: "M", row: 3, col: 0, transform: { scale: 3.5, x: 90, y: -126 } },
      { id: "N", row: 3, col: 1, transform: { scale: 3.5, x: 10, y: -126 } },
      { id: "O", row: 3, col: 2, transform: { scale: 3.5, x: -70, y: -126 } },
      { id: "P", row: 3, col: 3, transform: { scale: 3.5, x: -120, y: -126 } },
    ],
  },
  18101: {
    rows: 3,
    cols: 3,
    defaultScale: 4.5,
    seatFontScale: 1.6,
    sectors: [
      { id: "A", row: 0, col: 0, transform: { scale: 3.5, x: 70, y: 130 } },
      { id: "B", row: 0, col: 1, transform: { scale: 3.5, x:-10, y: 130 } },
      { id: "C", row: 0, col: 2, transform: { scale: 3.5, x: -85, y: 130 } },
      { id: "G", row: 2, col: 0, transform: { scale: 3.5, x: 100, y: -130 } },
      { id: "H", row: 2, col: 1, transform: { scale: 3.5, x: 10, y: -130 } },
      { id: "I", row: 2, col: 2, transform: { scale: 3.5, x: -80, y: -130 } },
    ],
  },
  18301: {
    rows: 4,
    cols: 4,
    seatFontScale: 3,
    defaultScale: 2,
    sectors: [
      { id: "A", row: 0, col: 2, transform: { scale: 2, x: 40, y: 73 } },
      { id: "B", row: 0, col: 3, transform: { scale: 2, x: -20, y: 73 } },

      { id: "C", row: 1, col: 2, transform: { scale: 2, x: 0, y: 30 } },
      { id: "D", row: 1, col: 3, transform: { scale: 2, x: -40, y: 30 } },

      { id: "E", row: 2, col: 2, transform: { scale: 2, x: 0, y: -10 } },
      { id: "F", row: 2, col: 3, transform: { scale: 2, x: -40, y: -10 } },

      { id: "G", row: 3, col: 2, transform: { scale: 2, x: 40, y: -75 } },
      { id: "H", row: 3, col: 3, transform: { scale: 2, x: -40, y: -75 } },
    ],
  },
};

export const MINIMAP_CONFIG = {
  16101: "Mapmini_6F_Multimedia.png",
  16301: "Mapmini_6F_Computer.png",
  17201: "Mapmini_7F_A1.png",
  17202: "Mapmini_7F_A2.png",
  17101: "Mapmini_7F_Notebook.png",
  17301: "Mapmini_7F_B.png",
  18201: "Mapmini_8F_A1.png",
  18202: "Mapmini_8F_A2.png",
  18101: "Mapmini_8F_Notebook.png",
  18301: "Mapmini_8F_B.png",
};

// Constants
export const FLOORS_CONFIG = [
  { id: 16, title: "6F", floor: "6", floorno: "16", total: 230, occupied: 5 },
  { id: 17, title: "7F", floor: "7", floorno: "17", total: 230, occupied: 10 },
  { id: 18, title: "8F", floor: "8", floorno: "18", total: 230, occupied: 15 },
];

export const MODAL_TYPES = {
  EXTENSION: "extension",
  RETURN: "return",
  ASSIGN_CHECK: "assignCheck",
};

export const MODES = {
  BOOKING: "booking",
  EXTENSION: "extension",
  RETURN: "return",
  MOVE: "move",
  ASSIGN_CHECK: "assignCheck",
};

export const MODE_LABELS = {
  [MODES.BOOKING]: "Booking",
  [MODES.EXTENSION]: "Extension",
  [MODES.RETURN]: "Return",
  [MODES.MOVE]: "Move",
  [MODES.ASSIGN_CHECK]: "Seat Check",
};
