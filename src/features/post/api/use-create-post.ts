import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";
import type { CreatePostDto, CreatePostResponse } from "../model/types";

function createPost(dto: CreatePostDto): Promise<CreatePostResponse> {
  return apiClient<CreatePostResponse>("/posts", {
    method: "POST",
    body: dto,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postQueryKeys.lists() });
    },
  });
}
