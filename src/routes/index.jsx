import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routesConfig";

const router = createBrowserRouter(
  routes.map(({ path, element }) => ({ path, element }))
);

const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
