import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { tokenStorage } from "@/shared/lib";
import { LoginPage } from "@/pages/auth";
import { RootLayout } from "../layouts/root-layout";
import { createPostRoutes } from "./routes/posts";
import { createAuthRoutes } from "./routes/auth";
import { createProfileRoute } from "./routes/profile";
import { createTestRoutes } from "./routes/test";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginPage,
  beforeLoad: () => {
    if (tokenStorage.isAuthenticated()) {
      throw redirect({ to: "/posts" });
    }
  },
});

const [loginRoute, registerRoute] = createAuthRoutes(rootRoute);
const profileRoute = createProfileRoute(rootRoute);
const testRoute = createTestRoutes(rootRoute);

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  profileRoute,
  testRoute,
  createPostRoutes(rootRoute),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
