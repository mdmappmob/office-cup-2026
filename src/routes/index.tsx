import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    if (!useAuthStore.getState().user) throw redirect({ to: "/login" });
    throw redirect({ to: "/dashboard" });
  },
});
