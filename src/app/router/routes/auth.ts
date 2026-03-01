import { createRoute } from "@tanstack/react-router";
import { LoginPage, RegisterPage } from "@/pages/auth";
import { requireGuest } from "../guards";
import type { rootRoute } from "../router";

export const createAuthRoutes = (root: typeof rootRoute) => {
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: "/login",
    component: LoginPage,
    beforeLoad: requireGuest,
  });

  const registerRoute = createRoute({
    getParentRoute: () => root,
    path: "/register",
    component: RegisterPage,
    beforeLoad: requireGuest,
  });

  return [loginRoute, registerRoute] as const;
};
