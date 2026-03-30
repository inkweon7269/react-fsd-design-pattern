import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import { postQueryKeys } from "@/entities/post";
import type { CreatePostDto, CreatePostResponse } from "../model/types";

export function useCreatePost() {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  return useMutation({
    mutationFn: (dto: CreatePostDto): Promise<CreatePostResponse> => {
      return apiClient<CreatePostResponse>("/posts", {
        method: "POST",
        body: dto,
        headers: { "Idempotency-Key": idempotencyKeyRef.current },
      });
    },
    onSuccess: () => {
      idempotencyKeyRef.current = crypto.randomUUID();
      queryClient.invalidateQueries({ queryKey: postQueryKeys.lists() });
    },
  });
}
