import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/pages/Dashboard";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});