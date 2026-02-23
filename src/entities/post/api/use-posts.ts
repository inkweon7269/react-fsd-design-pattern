import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { GetPostsParams } from "../model/types";
import { postQueryKeys } from "./post-query-keys";
import { getPosts } from "./post-api";

export function usePosts(params: GetPostsParams = {}) {
  return useQuery({
    queryKey: postQueryKeys.list(params),
    queryFn: () => getPosts(params),
    placeholderData: keepPreviousData,
  });
}
