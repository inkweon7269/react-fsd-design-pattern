import { useQuery } from "@tanstack/react-query";
import { postQueryKeys } from "./post-query-keys";
import { getPostById } from "./post-api";

export function usePost(id: number) {
  return useQuery({
    queryKey: postQueryKeys.detail(id),
    queryFn: () => getPostById(id),
    enabled: id > 0,
  });
}
