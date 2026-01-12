// src/context/VoiceContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const VoiceContext = createContext();

export const VoiceProvider = ({ children }) => {
  const { i18n } = useTranslation();
  // Get volume from Redux accessibility slice (if you have one)
  // If not, you can manage volume locally with useState
  const volume = useSelector((state) => state.accessibility?.volume) || 1;
  const [voice, setVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [lastText, setLastText] = useState("");

  // Load voices based on language
  useEffect(() => {
    const loadVoices = () => {
      const loadedVoices = window.speechSynthesis?.getVoices() || [];
      setVoices(loadedVoices);

      if (loadedVoices.length === 0) return;

      let selected = null;

      if (i18n.language === "en") {
        selected =
          loadedVoices.find((v) => v.lang === "en-US") ||
          loadedVoices.find((v) => v.lang.includes("en")) ||
          loadedVoices[0];
      } else {
        selected =
          loadedVoices.find((v) => v.lang === "ko-KR") ||
          loadedVoices.find((v) => v.lang.includes("ko")) ||
          loadedVoices[0];
      }

      setVoice(selected);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      try {
        window.speechSynthesis.onvoiceschanged = null;
      } catch {}
    };
  }, [i18n.language]);

  // STOP speech
  const stop = useCallback(() => {
    if (!window.speechSynthesis) return;

    console.debug("[VoiceProvider] stop() called");
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.debug("[VoiceProvider] cancel error", err);
    }
  }, []);

  // SPEAK function - stores last spoken text
  const speak = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return;
      setLastText(text); // Store last spoken text for re-speaking
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice || null;
      utterance.lang = voice?.lang || "en-US";
      utterance.rate = 0.9;
      utterance.pitch = 0.1;
      utterance.volume = volume;
      try {
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.debug("[VoiceProvider] speak error", err);
      }
    },
    [voice, volume]
  );

  // Global keyboard listeners for voice control
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.debug("[VoiceProvider] keydown:", e.key, e.code);
      // BACKSPACE → stop speaking
      if (e.key === "Backspace" || e.code === "Backspace" || e.keyCode === 8) {
        stop();
        return;
      }
      // ! KEY (Shift + 1) → RE-SPEAK LAST TEXT
      if (e.key === "!" || (e.code === "Digit1" && e.shiftKey)) {
        console.debug("[VoiceProvider] ! pressed → RE-SPEAK LAST TEXT");
        if (lastText) speak(lastText);
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [stop, speak, lastText]);

  return (
    <VoiceContext.Provider
      value={{
        voice,
        voices,
        setVoice,
        speak,
        stop,
        volume,
        lastText,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within a VoiceProvider");
  }
  return context;
};
