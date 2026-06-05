import { createFileRoute } from "@tanstack/react-router";
import { AdminResultadosPage } from "@/pages/AdminResultados";

export const Route = createFileRoute("/_app/admin/resultados")({
  component: AdminResultadosPage,
});