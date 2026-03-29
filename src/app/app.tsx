import { RouterProvider } from "@tanstack/react-router";
import { setOnAuthFailure } from "@/shared/api";
import { useAuthStore } from "@/entities/session";
import { QueryProvider } from "./providers";
import { router } from "./router";

setOnAuthFailure(() => {
  useAuthStore.getState().logout();
});

export function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
