import { createRoute } from "@tanstack/react-router";
import type { rootRoute } from "../router";
import { TestPage } from "@/pages/test";

export const createTestRoutes = (root: typeof rootRoute) => {
  return createRoute({
    getParentRoute: () => root,
    path: "/test",
    component: TestPage,
  });
};
