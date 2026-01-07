import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Magnifier from "./components/common/Magnifier";
import GlobalShortcuts from "./global/GlobalShortcuts";

function App() {
  return (
    <BrowserRouter>
    <Provider store={store}>
        <Magnifier />
          <GlobalShortcuts />
      <AppRoutes />
      </Provider>
    </BrowserRouter>
  );
}

export default App;
