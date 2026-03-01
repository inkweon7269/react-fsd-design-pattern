import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/api";
import type { RegisterDto, RegisterResponse } from "../model/types";

function register(dto: RegisterDto): Promise<RegisterResponse> {
  return apiClient<RegisterResponse>("/auth/register", {
    method: "POST",
    body: dto,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}
