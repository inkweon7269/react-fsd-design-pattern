import { createRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/pages/auth";
import { requireGuest } from "../guards";
import type { rootRoute } from "../router";

export const createAuthRoutes = (root: typeof rootRoute) => {
  const loginRoute = createRoute({
    getParentRoute: () => root,
    path: "/login",
    beforeLoad: () => {
      throw redirect({ to: "/" });
    },
  });

  const registerRoute = createRoute({
    getParentRoute: () => root,
    path: "/register",
    component: RegisterPage,
    beforeLoad: requireGuest,
  });

  return [loginRoute, registerRoute] as const;
};
