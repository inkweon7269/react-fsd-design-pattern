import { createRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/pages/profile";
import { requireAuth } from "../guards";
import type { rootRoute } from "../router";

export const createProfileRoute = (root: typeof rootRoute) => {
  return createRoute({
    getParentRoute: () => root,
    path: "/profile",
    component: ProfilePage,
    beforeLoad: requireAuth,
  });
};
