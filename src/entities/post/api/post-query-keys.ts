import type { GetPostsParams } from "../model/types";

export const postQueryKeys = {
  all: ["posts"] as const,
  lists: () => [...postQueryKeys.all, "list"] as const,
  list: (params: GetPostsParams) => [...postQueryKeys.lists(), params] as const,
  details: () => [...postQueryKeys.all, "detail"] as const,
  detail: (id: number) => [...postQueryKeys.details(), id] as const,
};
