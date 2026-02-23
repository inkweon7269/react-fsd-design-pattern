import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";
import type { UpdatePostDto } from "../model/types";

function updatePost(id: number, dto: UpdatePostDto): Promise<void> {
  return apiClient<void>(`/posts/${id}`, {
    method: "PATCH",
    body: dto,
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdatePostDto }) =>
      updatePost(id, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: postQueryKeys.lists(),
      });
    },
  });
}
