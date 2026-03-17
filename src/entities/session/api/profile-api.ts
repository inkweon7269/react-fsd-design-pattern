import { apiClient } from "@/shared/api";
import type { UserProfile } from "../model/types";

export function getProfile(): Promise<UserProfile> {
  return apiClient<UserProfile>("/auth/profile");
}
