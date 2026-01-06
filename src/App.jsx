import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppRoutes from "./routes/AppRoutes";
import { Provider } from "react-redux";
import { store } from "./redux/store";
import Magnifier from "./components/common/Magnifier";

function App() {
  return (
    <BrowserRouter>
    <Provider store={store}>
        <Magnifier />
      <AppRoutes />
      </Provider>
    </BrowserRouter>
  );
}

export default App;
