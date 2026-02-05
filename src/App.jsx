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

  React.useEffect(() => {
    const init = async () => {
      try {
        await initializeApi();
      } catch (error) {
        console.error("Failed to initialize API:", error);
      }
    };
    init();
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
