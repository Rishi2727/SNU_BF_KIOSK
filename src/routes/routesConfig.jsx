import Dashboard from "../pages/dashboard/Dashboard";
import Floor from "../pages/floor/Floor";


export const routes = [
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/floor/:id",
    element: <Floor />,
  },
];
