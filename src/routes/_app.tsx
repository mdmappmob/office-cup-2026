import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeManager } from "@/components/ThemeManager";
import { Toaster } from "@/components/ui/sonner";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { useEffect } from "react";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuthStore.getState().user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (user) useAppStore.getState().setCurrentUser(user.id, user.is_admin);
  }, [user]);
  return (
    <SidebarProvider>
      <ThemeManager />
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <SidebarTrigger className="ml-2" />
            <span className="ml-3 text-xs font-mono uppercase tracking-widest text-muted-foreground">
              OfficeCup 2026 · Mock Environment
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