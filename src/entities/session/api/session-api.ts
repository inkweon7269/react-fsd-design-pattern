import { tokenStorage } from "@/shared/lib";
import type { Session } from "../model/types";

export function getCurrentSession(): Session | null {
  if (!tokenStorage.isAuthenticated()) return null;
  return { authenticated: true };
}
