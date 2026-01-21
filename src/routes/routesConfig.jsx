import Configuration from "../pages/configuration2/Configuration";
import Dashboard from "../pages/dashboard/Dashboard";
import Floor from "../pages/floor/Floor";
import Configuration from "../pages/configuration/Configuration";
import About from "../pages/about/About";

export const routes = [
  { path: "/", element: <Dashboard /> },
  { path: "/floor/:floorId", element: <Floor /> },
  { path: "/floor/:floorId/:sectorNo", element: <Floor /> }, // sector optional case
  { path: "/floor/:floorId/:sectorNo/move", element: <Floor /> },
  { path: "/configuration", element: <Configuration /> }
  { path: "/about", element: <About /> }
];
