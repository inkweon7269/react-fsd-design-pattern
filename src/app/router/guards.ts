import { redirect } from "@tanstack/react-router";
import { tokenStorage } from "@/shared/lib";

export function requireAuth() {
  if (!tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/" });
  }
}

export function requireGuest() {
  if (tokenStorage.isAuthenticated()) {
    throw redirect({ to: "/posts" });
  }
}
