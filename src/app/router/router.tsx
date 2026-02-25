import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "../layouts/root-layout";
import { createPostRoutes } from "./routes/posts";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/posts" });
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  createPostRoutes(rootRoute),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
