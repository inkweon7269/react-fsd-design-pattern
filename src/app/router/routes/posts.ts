import { createRoute } from "@tanstack/react-router";
import {
  PostListPage,
  PostDetailPage,
  PostCreatePage,
  PostEditPage,
} from "@/pages/post";
import { requireAuth } from "../guards";
import type { rootRoute } from "../router";

export const createPostRoutes = (root: typeof rootRoute) => {
  const postsRoute = createRoute({
    getParentRoute: () => root,
    path: "/posts",
  });

  const postsListRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/",
    component: PostListPage,
  });

  const createPostRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/create",
    component: PostCreatePage,
    beforeLoad: requireAuth,
  });

  const postDetailRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/$postId",
    component: PostDetailPage,
  });

  const postEditRoute = createRoute({
    getParentRoute: () => postsRoute,
    path: "/$postId/edit",
    component: PostEditPage,
    beforeLoad: requireAuth,
  });

  return postsRoute.addChildren([
    postsListRoute,
    createPostRoute,
    postEditRoute,
    postDetailRoute,
  ]);
};
