import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeManager } from "@/components/ThemeManager";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const navigate = useNavigate();
  useEffect(() => {
    if (ready && !user) navigate({ to: "/login" });
  }, [ready, user, navigate]);
  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs font-mono text-muted-foreground">
        Carregando…
      </div>
    );
  }
  return (
    <SidebarProvider>
      <ThemeManager />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger className="ml-2" />
            <span className="ml-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              OfficeCup 2026
            </span>
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
        <Toaster richColors position="bottom-right" />
      </div>
    </SidebarProvider>
  );
}