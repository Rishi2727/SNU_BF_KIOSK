import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Magnifier from "./components/common/Magnifier";
import GlobalShortcuts from "./global/GlobalShortcuts";
import { VoiceProvider } from "./context/voiceContext";
import { NavigateProvider } from "./context/NavigateContext";
import GlobalHeadphoneMonitor from "./components/GlobalHeadphoneMonitor";
import { SerialPortProvider } from "./context/SerialPortContext";
import {initializeApi} from "./services/api";
import React, {useEffect} from "react";



function App() {

 useEffect(() => {
    const init = async () => {
      try {
        await initializeApi();
      } catch (error) {
        console.error("Failed to initialize API:", error);
      }
    };
    init();
 


    /* ==============================
       🔒 KIOSK PROTECTION
    ============================== */

    // Disable Right Click
    const disableRightClick = (e) => e.preventDefault();

    // Disable Text Selection
    const disableSelection = (e) => e.preventDefault();

    // Disable Drag
    const disableDrag = (e) => e.preventDefault();

    // Disable Keyboard Shortcuts
    const disableShortcuts = (e) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
      }

      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (
        e.ctrlKey &&
        e.shiftKey &&
        ["I", "J", "C"].includes(e.key.toUpperCase())
      ) {
        e.preventDefault();
      }

      // Ctrl+U (View source)
      if (e.ctrlKey && e.key.toUpperCase() === "U") {
        e.preventDefault();
      }

      // Ctrl+C (Copy)
      if (e.ctrlKey && e.key.toUpperCase() === "C") {
        e.preventDefault();
      }

      // Ctrl+A (Select all)
      if (e.ctrlKey && e.key.toUpperCase() === "A") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", disableRightClick);
    document.addEventListener("selectstart", disableSelection);
    document.addEventListener("dragstart", disableDrag);
    document.addEventListener("keydown", disableShortcuts);

    // Cleanup
    return () => {
      document.removeEventListener("contextmenu", disableRightClick);
      document.removeEventListener("selectstart", disableSelection);
      document.removeEventListener("dragstart", disableDrag);
      document.removeEventListener("keydown", disableShortcuts);
    };
  }, []);

  return (
    <BrowserRouter>
      <Provider store={store}>
        <Magnifier />
        <VoiceProvider>
          <NavigateProvider>
            <SerialPortProvider>
              <GlobalShortcuts />
              <GlobalHeadphoneMonitor/>
              <AppRoutes />
            </SerialPortProvider>
          </NavigateProvider>
        </VoiceProvider>
      </Provider>
    </BrowserRouter>
  );
}

export default App;
