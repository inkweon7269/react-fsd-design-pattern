import { redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/entities/session";

export function requireAuth() {
  if (!useAuthStore.getState().isAuthenticated) {
    throw redirect({ to: "/" });
  }
}

export function requireGuest() {
  if (useAuthStore.getState().isAuthenticated) {
    throw redirect({ to: "/posts" });
  }
}
