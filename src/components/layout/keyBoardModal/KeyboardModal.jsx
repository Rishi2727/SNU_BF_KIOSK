import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import "./KeyboardModal.css";
import { useTranslation } from "react-i18next";
import { useVoice } from "../../../context/voiceContext";


const KeyboardModal = ({
  isOpen,
  onClose,
  onSubmit,
  autoCloseTime,
  isFocused,
  setFocused
}) => {
  const [layoutName, setLayoutName] = useState("default");
  const [input, setInput] = useState("");
  const timerRef = useRef(null);
  const keyboardRef = useRef(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);
  const { t } = useTranslation();
  const { speak } = useVoice();


  // ✅keyboard sections
  const KBFocus = isFocused
    ? Object.freeze({
      HEADING: "kb_heading",
      INPUT: "kb_input",
      KEYS: "kb_keys",
      BUTTONS: "kb_buttons"
    })
    : null;

  const [kbFocus, setKbFocus] = useState(isFocused ? KBFocus.HEADING : null);
  const [buttonCursor, setButtonCursor] = useState(0);
  const [keyCursor, setKeyCursor] = useState(0);



  const defaultKeys = [
    "`", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "{bksp}",
    "{tab}", "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\",
    "{lock}", "a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", "{enter}",
    "{shift}", "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "{shift}", ".com", "@",
    "{space}"
  ];

  const shiftKeys = [
    "~", "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "_", "+", "{bksp}",
    "{tab}", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "{", "}", "|",
    "{lock}", "A", "S", "D", "F", "G", "H", "J", "K", "L", ":", "\"", "{enter}",
    "{shift}", "Z", "X", "C", "V", "B", "N", "M", "<", ">", "?", "{shift}", ".com", "@",
    "{space}"
  ];
  const keyboardKeys = layoutName === "shift" ? shiftKeys : defaultKeys;
  const keyDisplay = {
    "{bksp}": "Backspace",
    "{enter}": "Enter",
    "{shift}": "Shift",
    "{lock}": "Caps Lock",
    "{tab}": "Tab",
    "{space}": "Space",
  };
  // ⭐ FIX — Speech name for special characters
  const specialKeySpeech = {
    "`": t("BACKTICK"),
    "~": t("TILDE"),
    "!": t("EXCLAMATION"),
    "@": t("AT"),
    "#": t("HASH"),
    "$": t("DOLLAR"),
    "%": t("PERCENT"),
    "^": t("CARET"),
    "&": t("AMPERSAND"),
    "*": t("ASTERISK"),
    "(": t("LEFT PARENTHESIS"),
    ")": t("RIGHT PARENTHESIS"),
    "_": t("UNDERSCORE"),
    "+": t("PLUS"),
    "[": t("LEFT BRACKET"),
    "]": t("RIGHT BRACKET"),
    "{": t("LEFT BRACE"),
    "}": t("RIGHT BRACE"),
    ";": t("SEMICOLON"),
    ":": t("COLON"),
    "'": t("APOSTROPHE"),
    "\"": t("QUOTE"),
    ",": t("COMMA"),
    "<": t("LESS THAN"),
    ".": t("DOT"),
    ">": t("GREATER THAN"),
    "/": t("SLASH"),
    "?": t("QUESTION"),
    "\\": t("BACKSLASH"),
    "|": t("PIPE"),
    "-": t("HYPHEN"),
    "=": t("EQUALS"),
  };


  // -----------------------------
  // 🔊 SPEAK ON FOCUS / CURSOR CHANGE
  // -----------------------------
  useEffect(() => {
    if (!isFocused) return;

    if (kbFocus === KBFocus.HEADING) {
      speak(t("Virtual Keyboard"));
      return;
    }

    if (kbFocus === KBFocus.INPUT) {
      speak(t("Type here"));
      return;
    }

    if (kbFocus === KBFocus.KEYS) {
      const selectedKey = keyboardKeys[keyCursor];
      const cleaned = selectedKey.replace(/[{}]/g, "");

      // ⭐ FIX — Give proper names to characters
      const label =
        keyDisplay[selectedKey] ||
        specialKeySpeech[cleaned] ||
        cleaned;

      speak(label);
      return;
    }

    if (kbFocus === KBFocus.BUTTONS) {
      if (buttonCursor === 0) speak(t("Submit"));
      if (buttonCursor === 1) speak(t("Close"));
    }
  }, [kbFocus, keyCursor, buttonCursor, isFocused]);

  const startTimer = () => {
    clearTimer();
    if (autoCloseTime) {
      timerRef.current = setTimeout(() => handleClose(), autoCloseTime);
    }
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  useEffect(() => {
    if (isOpen) startTimer();
    return () => clearTimer();
  }, [isOpen, autoCloseTime]);

  useEffect(() => {
    if (isOpen && isFocused) {
      setKbFocus(KBFocus.HEADING);
      setKeyCursor(0);
      setButtonCursor(0);
    }
  }, [isOpen, isFocused]);



  // -----------------------------
  // Keyboard focus navigation
  // -----------------------------
  useEffect(() => {
    if (isFocused && kbFocus === KBFocus.INPUT && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused, kbFocus]);

  useEffect(() => {
    if (!isOpen || !isFocused) return;

    const onKeyDown = (e) => {
      if (kbFocus === KBFocus.INPUT && e.key !== "*" && e.key !== "Enter") {
        return;
      }

      if (e.key === "*" || e.code === "NumpadMultiply") {
        e.preventDefault();
        e.stopPropagation();
        startTimer();
        setKbFocus((prev) => {
          if (prev === KBFocus.HEADING) return KBFocus.INPUT;
          if (prev === KBFocus.INPUT) return KBFocus.KEYS;
          if (prev === KBFocus.KEYS) return KBFocus.BUTTONS;
          if (prev === KBFocus.BUTTONS) return KBFocus.HEADING;
          return KBFocus.HEADING;
        });
      }
    };

    const onArrow = (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;

      if (kbFocus === KBFocus.INPUT && e.target === inputRef.current) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      startTimer();

      if (kbFocus === KBFocus.KEYS) {
        setKeyCursor((prev) =>
          e.key === "ArrowRight"
            ? (prev + 1) % keyboardKeys.length
            : (prev - 1 + keyboardKeys.length) % keyboardKeys.length
        );
      }

      if (kbFocus === KBFocus.BUTTONS) {
        setButtonCursor(e.key === "ArrowRight" ? 1 : 0);
      }
    };

    const onEnter = (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      e.stopPropagation();
      startTimer();

      if (kbFocus === KBFocus.INPUT) {
        if (!input.trim()) {
          handleClose();
          return;
        }
        onSubmit(input);
        handleClose();
        return;
      }

      if (kbFocus === KBFocus.KEYS) {
        const selectedKey = keyboardKeys[keyCursor];
        const cleaned = selectedKey.replace(/[{}]/g, "");

        if (cleaned === "bksp") {
          setInput((prev) => prev.slice(0, -1));
        } else if (cleaned === "space") {
          setInput((prev) => prev + " ");
        } else if (cleaned === "shift" || cleaned === "lock") {
          // Toggle shift/caps lock without changing input
          toggleShift();
        } else if (cleaned === "tab") {
          setInput((prev) => prev + "\t");
        } else if (cleaned === "enter") {
          if (!input.trim()) {
            handleClose();
            return;
          }
          onSubmit(input);
          handleClose();
        } else {
          setInput((prev) => prev + cleaned);
        }

        keyboardRef.current?.setInput(input);
        return;
      }

      if (kbFocus === KBFocus.BUTTONS) {
        if (buttonCursor === 0) {
          if (!input.trim()) {
            handleClose();
            return;
          }
          onSubmit(input);
          handleClose();
        } else {
          handleClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keydown", onArrow, true);
    window.addEventListener("keydown", onEnter, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("keydown", onArrow, true);
      window.removeEventListener("keydown", onEnter, true);
    };
  }, [isOpen, isFocused, kbFocus, keyCursor, buttonCursor, input]);

  const handleClose = () => {
    setInput("");
    if (keyboardRef.current) keyboardRef.current.clearInput();
    clearTimer();
    onClose();
  };

  const handleInputChange = (newInput) => {
    setInput(newInput);
    startTimer();
  };

  const handleKeyPress = (button) => {
    startTimer();
    if (button === "{shift}" || button === "{lock}") toggleShift();

    if (button === "{enter}") {
      if (!input.trim()) {
        handleClose();
        return;
      }
      onSubmit(input);
      handleClose();
    }
  };

  const toggleShift = () => {
    setLayoutName((prev) => (prev === "default" ? "shift" : "default"));
  };


  // -----------------------------
  // Focus Classes
  // -----------------------------
  const headingFocusClass = isFocused && kbFocus === KBFocus.HEADING ? "outline outline-[6px] outline-[#dc2f02]" : "";
  const inputFocusClass = isFocused && kbFocus === KBFocus.INPUT ? "outline outline-[6px] outline-[#dc2f02] p-1" : "";
  const keysFocusClass = isFocused && kbFocus === KBFocus.KEYS ? "outline outline-[6px] outline-[#dc2f02]  p-2" : "";
  const buttonsFocusClass = isFocused && kbFocus === KBFocus.BUTTONS ? "outline outline-[6px] outline-[#dc2f02] p-2" : "";
  const submitButtonFocusClass = isFocused && kbFocus === KBFocus.BUTTONS && buttonCursor === 0 ? "outline outline-[6px] outline-[#dc2f02]" : "";
  const closeButtonFocusClass = isFocused && kbFocus === KBFocus.BUTTONS && buttonCursor === 1 ? "outline outline-[6px] outline-[#dc2f02]" : "";
  const focusRingClass = isFocused ? "outline outline-[6px] outline-[#dc2f02] " : "";

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <>
      {isOpen && (
        <div className="fixed w-full inset-0 flex items-center justify-center bg-opacity-50 backdrop-blur-sm z-[9999] shadow">
          <div ref={modalRef} className={`p-4 bg-white rounded-3xl shadow-lg w-[80%] md:h-[60%] 2xl:h-[75%] transition-all duration-300  ${focusRingClass}`}>

            {/* HEADING */}
            <div className={`flex items-center gap-5 p-2 justify-center`}>
              <p className={`sm:text-xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-600 ${headingFocusClass}`}>
                {t("Virtual Keyboard")}
              </p>
            </div>

            {/* INPUT */}
            <div className={`flex flex-col gap-4 mt-4 ${inputFocusClass}`}>
              <div className="flex gap-4">
                <input
                  ref={inputRef}
                  className={`w-full sm:h-5 xl:h-12 2xl:h-16 px-4 sm:text-md 2xl:text-[35px] border border-gray-300 rounded-lg focus:outline-none transition duration-200 text-gray-400`}
                  placeholder={t("Type here")}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    handleInputChange(e.target.value);
                  }}
                  onKeyDown={() => {
                    startTimer();
                  }}
                />
              </div>
            </div>

            {/* KEYBOARD */}
            <div className="mt-[1%] w-full">
              <Keyboard
                ref={keyboardRef}
                layoutName={layoutName}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                display={keyDisplay}
                theme={`hg-theme-default myKeyboardTheme ${keysFocusClass}`}
                buttonTheme={
                  isFocused && kbFocus === KBFocus.KEYS
                    ? [
                      {
                        class:
                          "outline outline-[6px] outline-[#dc2f02] rounded-xl",
                        buttons: keyboardKeys[keyCursor]

                      }
                    ]
                    : []
                }
              />
            </div>

            {/* BUTTONS */}
            <div className={`flex w-full justify-center gap-4 mt-16 ${buttonsFocusClass}`}>
              <button
                className={`px-6 py-3 sm:h-5 xl:h-12 2xl:h-16 w-[18%] text-white sm:text-md 2xl:text-[30px] rounded-full shadow bg-[#FFCA08] hover:bg-[#3740a3] transition duration-200 ${submitButtonFocusClass}`}
                onClick={() => {
                  if (setFocused) setFocused("keyboard")
                  onSubmit(input);
                  handleClose();
                }}
              >
                {t("Submit")}
              </button>

              <button
                className={`px-6 py-3 sm:h-5 xl:h-12 2xl:h-16 w-[18%] text-white sm:text-md 2xl:text-3xl bg-gray-600 rounded-full shadow hover:bg-gray-500 transition duration-200 ${closeButtonFocusClass}`}
                onClick={handleClose}
              >
                {t("Close")}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardModal;
