import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Magnifier from "./components/common/Magnifier";
import GlobalShortcuts from "./global/GlobalShortcuts";
import { VoiceProvider } from "./context/voiceContext";



function App() {


  return (
    <BrowserRouter>
        <Provider store={store}>     
          <Magnifier />
           <VoiceProvider>
          <GlobalShortcuts />
          <AppRoutes />  
          </VoiceProvider>   
        </Provider>
    </BrowserRouter>
  );
}

export default App;
