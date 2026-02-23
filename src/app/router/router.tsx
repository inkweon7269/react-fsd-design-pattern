import {
  createRouter,
  createRootRoute,
  createRoute,
  redirect,
} from "@tanstack/react-router";
import { RootLayout } from "../layouts/root-layout";
import { PostListPage, PostDetailPage, PostCreatePage } from "@/pages/post";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/posts" });
  },
});

const postsListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts",
  component: PostListPage,
});

const createPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/create",
  component: PostCreatePage,
});

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts/$postId",
  component: PostDetailPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  postsListRoute,
  createPostRoute,
  postDetailRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
