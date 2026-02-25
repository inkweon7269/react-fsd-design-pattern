import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";

function deletePost(id: number): Promise<void> {
  return apiClient<void>(`/posts/${id}`, {
    method: "DELETE",
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePost,
    onSuccess: (_data, postId) => {
      queryClient.removeQueries({ queryKey: postQueryKeys.detail(postId) });
      queryClient.invalidateQueries({ queryKey: postQueryKeys.lists() });
    },
  });
}
