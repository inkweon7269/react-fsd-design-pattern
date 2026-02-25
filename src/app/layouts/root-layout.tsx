import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header";
import { ErrorBoundary } from "@/shared/ui";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header />
      <main>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
