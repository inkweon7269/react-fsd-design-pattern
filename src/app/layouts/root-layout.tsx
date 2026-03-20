import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header";
import { ErrorBoundary } from "@/shared/ui";
import { Button } from "@/shared/ui";
import type { FallbackProps } from "@/shared/ui";

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-xl font-semibold text-destructive">
        Something went wrong
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "An unexpected error occurred."}
      </p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header />
      <main>
        <ErrorBoundary FallbackComponent={GlobalErrorFallback}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
