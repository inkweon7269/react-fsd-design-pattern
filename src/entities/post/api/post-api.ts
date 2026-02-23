import { apiClient } from "@/shared/api";
import type { PaginatedResponse } from "@/shared/types";
import type { Post, GetPostsParams } from "../model/types";

export function getPosts(
  params: GetPostsParams = {},
): Promise<PaginatedResponse<Post>> {
  return apiClient<PaginatedResponse<Post>>("/posts", {
    params: {
      page: params.page,
      limit: params.limit,
      isPublished: params.isPublished,
    },
  });
}

export function getPostById(id: number): Promise<Post> {
  return apiClient<Post>(`/posts/${id}`);
}
