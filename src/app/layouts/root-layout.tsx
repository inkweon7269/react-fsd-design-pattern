import { Outlet } from "@tanstack/react-router";
import { Header } from "@/widgets/header";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Header />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
