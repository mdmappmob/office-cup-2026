import { createFileRoute } from "@tanstack/react-router";
import { PerfilPage } from "@/pages/Perfil";

export const Route = createFileRoute("/_app/perfil")({
  component: PerfilPage,
});