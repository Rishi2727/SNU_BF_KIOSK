import React, { useRef, useState, useEffect } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";
import "./KeyboardModal.css";


const KeyboardModal = ({
  isOpen,
  onClose,
  onSubmit,
  autoCloseTime,
}) => {
  const [layoutName, setLayoutName] = useState("default");
  const [input, setInput] = useState("");
  const timerRef = useRef(null);
  const keyboardRef = useRef(null);
  const modalRef = useRef(null);
  const inputRef = useRef(null);


  const keyDisplay = {
    "{bksp}": "Backspace",
    "{enter}": "Enter",
    "{shift}": "Shift",
    "{lock}": "Caps Lock",
    "{tab}": "Tab",
    "{space}": "Space",
  };


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
  // Render
  // -----------------------------
  return (
    <>
      {isOpen && (
         <div className="fixed w-full inset-0 flex items-center justify-center bg-opacity-50 backdrop-blur-sm z-[9999] shadow">
          <div ref={modalRef} className={`p-4 bg-white rounded-3xl shadow-lg w-[80%] md:h-[60%] 2xl:h-[75%] transition-all duration-300 `}>

            {/* HEADING */}
            <div className={`flex items-center gap-5 p-2 justify-center`}>
              <p className={`sm:text-xl xl:text-3xl 2xl:text-4xl font-semibold text-gray-600`}>
                {("Virtual Keyboard")}
              </p>
            </div>

            {/* INPUT */}
            <div className={`flex flex-col gap-4 mt-4`}>
              <div className="flex gap-4">
                <input
                  ref={inputRef}
                  className={`w-full sm:h-5 xl:h-12 2xl:h-16 px-4 sm:text-md 2xl:text-[35px] border border-gray-300 rounded-lg focus:outline-none transition duration-200 text-gray-400`}
                  placeholder={("Type here...")}
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
                theme={`hg-theme-default myKeyboardTheme`}
                
              />
            </div>

            {/* BUTTONS */}
            <div className={`flex w-full justify-center gap-4 mt-16 `}>
              <button
                className={`px-6 py-3 sm:h-5 xl:h-12 2xl:h-16 w-[18%] text-white sm:text-md 2xl:text-[30px] rounded-full shadow bg-[#FFCA08] hover:bg-[#3740a3] transition duration-200 `}
                onClick={() => {
                  onSubmit(input);
                  handleClose();
                }}
              >
                {("Submit")}
              </button>

              <button
                className={`px-6 py-3 sm:h-5 xl:h-12 2xl:h-16 w-[18%] text-white sm:text-md 2xl:text-3xl bg-gray-600 rounded-full shadow hover:bg-gray-500 transition duration-200`}
                onClick={handleClose}
              >
                {("Close")}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default KeyboardModal;
